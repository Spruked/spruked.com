"""Cali Personal Assistant API routes."""

from __future__ import annotations

import json
import os
import re
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from cali_skg.core.cali_personal_skg import get_cali_skg

try:
    import redis  # type: ignore
except Exception:  # pragma: no cover - optional runtime dependency
    redis = None

router = APIRouter(prefix="/cali", tags=["cali-personal"])
security = HTTPBearer(auto_error=False)
_REDIS_CLIENT: Any | None = None
_REDIS_ERROR: Optional[str] = None


def verify_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = credentials.credentials if credentials else ""
    allowed = os.getenv("CALI_ADMIN_TOKEN") or os.getenv("ADMIN_ACCESS_TOKEN") or "spruked-admin-local"
    if token != allowed:
        raise HTTPException(status_code=403, detail="Admin access required")
    return token


def _strict_mode() -> bool:
    return str(os.getenv("CALI_HYBRID_STRICT", "0")).strip() == "1"


def _doctrine_enforce() -> bool:
    return str(os.getenv("CALI_DOCTRINE_ENFORCE", "1")).strip() != "0"


def _doctrine_require_decision_envelope() -> bool:
    return str(os.getenv("CALI_DOCTRINE_REQUIRE_ENVELOPE", "0")).strip() == "1"


def _use_qwen_for_unknown() -> bool:
    return str(os.getenv("CALI_HYBRID_USE_QWEN", "1")).strip() == "1"


def _kaygee_api_base() -> str:
    return str(os.getenv("KAYGEE_API_BASE", "http://127.0.0.1:8011")).strip().rstrip("/")


def _kaygee_voice_enabled() -> bool:
    return str(os.getenv("KAYGEE_VOICE_ENABLED", "1")).strip() == "1"


def _kaygee_voice() -> str:
    return str(os.getenv("KAYGEE_VOICE", "af_bella")).strip() or "af_bella"


def _local_kokoro_tts_url() -> str:
    return str(os.getenv("CALI_LOCAL_KOKORO_URL", "http://127.0.0.1:12000/api/kokoro/tts")).strip()


def _local_kokoro_speed() -> float:
    raw = str(os.getenv("CALI_KOKORO_SPEED", "1.0")).strip()
    try:
        return min(2.0, max(0.5, float(raw)))
    except ValueError:
        return 1.0


def _timeout_seconds() -> float:
    raw = str(os.getenv("SPRUKED_ORB_PROVIDER_TIMEOUT_MS", "18000")).strip()
    try:
        ms = max(2000, int(raw))
    except ValueError:
        ms = 18000
    return min(60.0, max(2.0, ms / 1000.0))


def _llm_max_tokens() -> int:
    raw = str(os.getenv("CALI_OLLAMA_MAX_TOKENS", "140")).strip()
    try:
        return min(800, max(50, int(raw)))
    except ValueError:
        return 140


def _llm_temperature() -> float:
    raw = str(os.getenv("CALI_OLLAMA_TEMPERATURE", "0.45")).strip()
    try:
        return min(1.2, max(0.0, float(raw)))
    except ValueError:
        return 0.45


def _llm_threads() -> int:
    raw = str(os.getenv("CALI_OLLAMA_THREADS", "")).strip()
    if raw:
        try:
            return min(64, max(1, int(raw)))
        except ValueError:
            pass
    cpu_count = os.cpu_count() or 4
    return min(16, max(2, cpu_count))


def _llm_device() -> Optional[str]:
    raw = str(os.getenv("CALI_OLLAMA_DEVICE", "")).strip().lower()
    if not raw:
        return None
    return raw


def _ollama_model_name() -> str:
    return str(os.getenv("CALI_OLLAMA_MODEL_NAME", "qwen3.5:4b")).strip()  # Qwen 3.5 4B model


def _substrate_redis_enabled() -> bool:
    return str(os.getenv("CALI_SUBSTRATE_REDIS_ENABLED", "1")).strip() != "0"


def _substrate_redis_url() -> str:
    direct = str(os.getenv("CALI_SUBSTRATE_REDIS_URL", "")).strip()
    if direct:
        return direct
    return str(os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")).strip()


def _substrate_redis_patterns() -> List[str]:
    raw = str(
        os.getenv(
            "CALI_SUBSTRATE_REDIS_PATTERNS",
            "substrate:*,orb:*,mesh:*,cali:*,skg:*",
        )
    ).strip()
    patterns = [item.strip() for item in raw.split(",") if item.strip()]
    return patterns or ["substrate:*", "orb:*", "mesh:*", "cali:*", "skg:*"]


def _substrate_redis_key_limit() -> int:
    raw = str(os.getenv("CALI_SUBSTRATE_REDIS_KEY_LIMIT", "12")).strip()
    try:
        return min(64, max(1, int(raw)))
    except ValueError:
        return 12


def _is_substrate_query(prompt: str) -> bool:
    lowered = str(prompt or "").lower()
    return bool(
        re.search(
            r"\b(epistemic|substrate|geometry|geometric|skg|cognition stack|hybrid pipeline|provider_used|governance|doctrine)\b",
            lowered,
        )
    )


def _is_research_testing_query(prompt: str) -> bool:
    lowered = str(prompt or "").lower()
    return bool(re.search(r"\b(research|tested|testing|experiment|experiments|validation|metrics)\b", lowered))


def _redis_value_to_json_safe(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, bytes):
        try:
            value = value.decode("utf-8", errors="replace")
        except Exception:
            return str(value)
    if isinstance(value, (dict, list, int, float, bool)):
        return value
    text = str(value).strip()
    if not text:
        return ""
    if text[0] in "{[":
        try:
            return json.loads(text)
        except Exception:
            return text[:400]
    return text[:400]


def _get_redis_client() -> Any | None:
    global _REDIS_CLIENT, _REDIS_ERROR
    if not _substrate_redis_enabled():
        return None
    if redis is None:
        _REDIS_ERROR = "python redis package unavailable"
        return None
    if _REDIS_CLIENT is not None:
        return _REDIS_CLIENT

    with _REDIS_LOCK:
        if _REDIS_CLIENT is not None:
            return _REDIS_CLIENT
        try:
            client = redis.Redis.from_url(  # type: ignore[attr-defined]
                _substrate_redis_url(),
                decode_responses=True,
                socket_connect_timeout=0.4,
                socket_timeout=0.4,
            )
            client.ping()
            _REDIS_CLIENT = client
            _REDIS_ERROR = None
            return _REDIS_CLIENT
        except Exception as exc:
            _REDIS_ERROR = str(exc)
            _REDIS_CLIENT = None
            return None


def _collect_substrate_redis_snapshot() -> Dict[str, Any]:
    snapshot: Dict[str, Any] = {
        "redis_enabled": _substrate_redis_enabled(),
        "redis_connected": False,
        "redis_url": _substrate_redis_url(),
        "key_patterns": _substrate_redis_patterns(),
        "sample_limit": _substrate_redis_key_limit(),
        "samples": [],
        "errors": [],
    }
    client = _get_redis_client()
    if client is None:
        if _REDIS_ERROR:
            snapshot["errors"].append(_REDIS_ERROR)
        return snapshot

    snapshot["redis_connected"] = True
    limit = _substrate_redis_key_limit()
    samples: List[Dict[str, Any]] = []

    for pattern in _substrate_redis_patterns():
        cursor = 0
        loops = 0
        while True:
            loops += 1
            if loops > 25 or len(samples) >= limit:
                break
            try:
                cursor, keys = client.scan(cursor=cursor, match=pattern, count=32)
            except Exception as exc:
                snapshot["errors"].append(f"scan:{pattern}:{exc}")
                break

            for key in keys:
                if len(samples) >= limit:
                    break
                try:
                    key_type = client.type(key)
                    value: Any
                    if key_type == "string":
                        value = _redis_value_to_json_safe(client.get(key))
                    elif key_type == "hash":
                        value = _redis_value_to_json_safe(client.hgetall(key))
                    elif key_type == "list":
                        value = _redis_value_to_json_safe(client.lrange(key, 0, 10))
                    elif key_type == "set":
                        value = _redis_value_to_json_safe(client.smembers(key))
                    elif key_type == "zset":
                        value = _redis_value_to_json_safe(client.zrange(key, 0, 10, withscores=True))
                    else:
                        value = None
                    samples.append({"key": str(key), "type": str(key_type), "value": value})
                except Exception as exc:
                    samples.append({"key": str(key), "error": str(exc)})

            if cursor == 0:
                break

    snapshot["samples"] = samples
    return snapshot


def _substrate_response(prompt: str, snapshot: Dict[str, Any]) -> str:
    research_mode = _is_research_testing_query(prompt)
    sample_keys = [str(item.get("key")) for item in snapshot.get("samples", []) if item.get("key")]
    key_preview = ", ".join(sample_keys[:5]) if sample_keys else "none sampled yet"
    redis_state = "connected" if snapshot.get("redis_connected") else "unavailable"

    lines: List[str] = [
        "Epistemic geometry here is the governance-routed cognition state-space over the substrate.",
        "Live path: /api/orb -> kaygee_hybrid -> /cali/orb/respond -> qwen-core + doctrine governance -> kokoro voice.",
        f"Substrate Redis state: {redis_state}; sampled keys: {key_preview}.",
    ]
    if research_mode:
        lines.extend(
            [
                "Currently being researched/tested: hybrid provider stability, doctrine DDR enforcement, Redis substrate signal fidelity, and voice path reliability (KayGee TTS with local Kokoro fallback).",
                "Validation surfaces: web insight artifact export, cognition metadata traces (provider_used/llm_core/doctrine_state), and ACP/voice fallback metrics in Orb_Assistant modules.",
            ]
        )
    else:
        lines.append(
            "Ask for \"current research and tests\" and I will return active experiment lanes and validation checkpoints."
        )
    return " ".join(lines)


def _normalize_companion_text(raw_text: str, prompt: str) -> str:
    prompt_lower = str(prompt or "").lower()
    text = str(raw_text or "").strip()
    if not text:
        return ""

    # Remove thinking process sections
    text = re.sub(r"Thinking Process:\s*\d+\.\s*\*\*.*?\*\*.*?(?=\n\n|\n[A-Z]|$)", "", text, flags=re.DOTALL | re.MULTILINE)
    text = re.sub(r"^\d+\.\s*\*\*.*?\*\*.*?(?=\n\n|\n\d+|\n[A-Z]|$)", "", text, flags=re.DOTALL | re.MULTILINE)

    # Remove diagnostic fields
    text = re.sub(r"\b(CONF|MIND)\s+\d+\.\d+\b", "", text, flags=re.IGNORECASE)
    text = re.sub(r"^(MIND|CONF)\s*:.*$", "", text, flags=re.MULTILINE | re.IGNORECASE)

    # Remove "Heard" messages and other status indicators
    text = re.sub(r"\bHeard\b", "", text, flags=re.IGNORECASE)

    # Remove "TWICE CALI" and similar duplicates
    text = re.sub(r"TWICE\s+CALI", "", text, flags=re.IGNORECASE)

    # Clean up extra whitespace and empty lines
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    text = " ".join(lines).strip()

    # Remove offers frame text
    if re.search(r"offers the strongest frame for", text, flags=re.IGNORECASE):
        text = ""

    # Handle specific prompts
    if re.search(r"\b(what(?:'s| is)? your name|who are you)\b", prompt_lower):
        return "I'm Cali. I'm here with you."
    if re.search(r"\b(primary function|primary role|your role|your purpose|what do you do)\b", prompt_lower):
        return (
            "My primary function is to assist you as Cali with clear guidance, onboarding, "
            "mint support, and execution help."
        )
    if re.search(r"\b(can you hear me|do you hear me)\b", prompt_lower):
        return "I hear you clearly."
    if re.match(r"^(hi|hello|hey)\b", prompt_lower):
        return "Hey. I'm here."

    # Final cleanup
    text = re.sub(r"\s{2,}", " ", text).strip()
    if not text:
        return ""
    if text[-1] not in ".!?":
        text = f"{text}."
    return text


def _fast_path_response(prompt: str) -> str:
    prompt_lower = str(prompt or "").strip().lower()
    if re.search(r"\b(what(?:'s| is)? your name|who are you)\b", prompt_lower):
        return "I'm Cali. I'm here with you."
    if re.search(r"\b(primary function|primary role|your role|your purpose|what do you do)\b", prompt_lower):
        return (
            "My primary function is to assist you as Cali with clear guidance, onboarding, "
            "mint support, and execution help."
        )
    if re.search(r"\b(can you hear me|do you hear me)\b", prompt_lower):
        return "I hear you clearly."
    if re.match(r"^(hi|hello|hey)\b", prompt_lower):
        return "Hey. I'm here."
    return ""


def _generate_llm_response(prompt: str, context: Dict[str, Any], emotion: str) -> str:
    model = _ollama_model_name()
    system_prompt = (
        "You are Cali, a female executive assistant for Bryan on spruked.com. "
        "Follow KayGee governance style: concise, calm, practical, and safe. "
        "Never output diagnostic fields like MIND or CONF."
    )
    context_hint = ""
    if context:
        context_hint = f"\nContext: {context}"
    full_prompt = f"Emotion: {emotion}\nUser: {prompt}{context_hint}"

    try:
        response = httpx.post(
            "http://127.0.0.1:11434/api/generate",
            json={
                "model": model,
                "prompt": f"{system_prompt}\n\n{full_prompt}",
                "stream": False,
                "options": {
                    "num_predict": _llm_max_tokens(),
                    "temperature": _llm_temperature(),
                    "top_p": 0.9,
                }
            },
            timeout=60.0
        )
        response.raise_for_status()
        result = response.json()
        # For Qwen models, the response might be in 'thinking' field instead of 'response'
        response_text = result.get("response") or result.get("thinking", "")
        return str(response_text or "").strip()
    except Exception as exc:
        raise RuntimeError(f"Ollama API call failed: {exc}") from exc


async def _synthesize_voice(text: str) -> Dict[str, Optional[str]]:
    if not _kaygee_voice_enabled() or not text:
        return {"audio_url": None, "audio_engine": None}

    audio_url: Optional[str] = None
    audio_engine: Optional[str] = None

    try:
        async with httpx.AsyncClient(timeout=_timeout_seconds()) as client:
            response = await client.post(
                f"{_kaygee_api_base()}/plugin/tts",
                json={"text": text, "voice": _kaygee_voice()},
            )
        if response.status_code == 200:
            data = response.json()
            raw_audio_url = str(data.get("audio_url") or "").strip()
            if raw_audio_url:
                if not raw_audio_url.startswith("http://") and not raw_audio_url.startswith("https://"):
                    raw_audio_url = f"{_kaygee_api_base()}{raw_audio_url if raw_audio_url.startswith('/') else '/' + raw_audio_url}"
                audio_url = raw_audio_url
            audio_engine = str(data.get("engine") or data.get("audio_engine") or "").strip() or None
    except Exception:
        audio_url = None
        audio_engine = None

    if not audio_url:
        try:
            async with httpx.AsyncClient(timeout=_timeout_seconds()) as client:
                fallback = await client.post(
                    f"{_kaygee_api_base()}/api/interact",
                    json={
                        "text": text,
                        "voice_enabled": True,
                        "voice_response": True,
                        "voice": _kaygee_voice(),
                    },
                )
            if fallback.status_code == 200:
                data = fallback.json()
                raw_audio_url = str(data.get("audio_url") or "").strip()
                if raw_audio_url:
                    if not raw_audio_url.startswith("http://") and not raw_audio_url.startswith("https://"):
                        raw_audio_url = f"{_kaygee_api_base()}{raw_audio_url if raw_audio_url.startswith('/') else '/' + raw_audio_url}"
                    audio_url = raw_audio_url
                audio_engine = str(data.get("audio_engine") or data.get("engine") or audio_engine or "").strip() or audio_engine
        except Exception:
            pass

    if not audio_url:
        local_tts_url = _local_kokoro_tts_url()
        if local_tts_url:
            try:
                async with httpx.AsyncClient(timeout=max(5.0, _timeout_seconds())) as client:
                    fallback = await client.post(
                        local_tts_url,
                        json={
                            "text": text,
                            "voice": _kaygee_voice(),
                        },
                    )
                    if fallback.status_code == 422:
                        fallback = await client.post(
                            local_tts_url,
                            json={"text": text},
                        )
                if fallback.status_code == 200:
                    data = fallback.json()
                    wav_b64 = str(data.get("audio_wav_base64") or "").strip()
                    raw_audio_url = str(data.get("audio_url") or "").strip()
                    if wav_b64:
                        audio_url = f"data:audio/wav;base64,{wav_b64}"
                    elif raw_audio_url:
                        if not raw_audio_url.startswith("http://") and not raw_audio_url.startswith("https://"):
                            raw_audio_url = (
                                f"{local_tts_url.rsplit('/', 3)[0]}{raw_audio_url if raw_audio_url.startswith('/') else '/' + raw_audio_url}"
                            )
                        audio_url = raw_audio_url
                    if audio_url:
                        audio_engine = "kokoro_local_api"
            except Exception:
                pass

    return {
        "audio_url": audio_url or None,
        "audio_engine": audio_engine,
    }


async def _query_kaygee_interact(prompt: str, context: Dict[str, Any], emotion: str) -> Dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=_timeout_seconds()) as client:
            response = await client.post(
                f"{_kaygee_api_base()}/api/interact",
                json={
                    "text": prompt,
                    "context": context,
                    "emotion": emotion,
                    "voice_enabled": _kaygee_voice_enabled(),
                    "voice_response": _kaygee_voice_enabled(),
                    "voice": _kaygee_voice(),
                },
            )
        data = response.json() if response.status_code == 200 else {}
    except Exception:
        return {"response": "", "audio_url": None, "audio_engine": None}

    if response.status_code != 200:
        return {"response": "", "audio_url": None, "audio_engine": None}

    audio_url = str(data.get("audio_url") or "").strip()
    if audio_url and not audio_url.startswith("http://") and not audio_url.startswith("https://"):
        audio_url = f"{_kaygee_api_base()}{audio_url if audio_url.startswith('/') else '/' + audio_url}"

    return {
        "response": str(data.get("response") or data.get("text") or "").strip(),
        "audio_url": audio_url or None,
        "audio_engine": str(data.get("audio_engine") or "").strip() or None,
    }


class ContactCreate(BaseModel):
    name: str
    contact_type: str = "personal"
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    priority: int = 0


class FinancialAccountCreate(BaseModel):
    institution: str
    account_type: str
    account_number: str
    balance: float = 0.0
    alert_threshold: Optional[float] = None
    notes: Optional[str] = None


class EventCreate(BaseModel):
    title: str
    event_type: str = "meeting"
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    location: Optional[str] = None
    attendees: Optional[List[str]] = None
    priority: int = 0


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[str] = None
    priority: int = 1
    category: str = "personal"


class VerificationCall(BaseModel):
    caller_number: str
    caller_name: Optional[str] = None
    claimed_identity: Optional[str] = None


class CaliQuery(BaseModel):
    query: str
    current_path: Optional[str] = "/admin"
    context: Optional[Dict[str, Any]] = None


class OrbRespondRequest(BaseModel):
    prompt: str
    context: Optional[Dict[str, Any]] = None
    emotion: Optional[str] = "thoughtful_warm"
    session_id: Optional[str] = None


@router.get("/status")
def cali_status(_: str = Depends(verify_admin)) -> Dict[str, Any]:
    cali = get_cali_skg()
    return {"status": "active", "identity": cali.identity, "stats": cali.get_stats()}


@router.post("/contacts")
def add_contact(payload: ContactCreate, _: str = Depends(verify_admin)) -> Dict[str, Any]:
    cali = get_cali_skg()
    return cali.add_contact(
        name=payload.name,
        contact_type=payload.contact_type,
        phone=payload.phone,
        email=payload.email,
        address=payload.address,
        notes=payload.notes,
        priority=payload.priority,
    )


@router.get("/contacts")
def search_contacts(
    query: Optional[str] = None,
    contact_type: Optional[str] = None,
    _: str = Depends(verify_admin),
) -> Dict[str, Any]:
    cali = get_cali_skg()
    contacts = cali.search_contacts(query=query, contact_type=contact_type)
    return {"contacts": contacts, "count": len(contacts)}


@router.get("/contacts/financial")
def get_financial_contacts(_: str = Depends(verify_admin)) -> Dict[str, Any]:
    cali = get_cali_skg()
    contacts = cali.get_financial_contacts()
    return {"contacts": contacts, "count": len(contacts)}


@router.post("/financial/accounts")
def add_financial_account(payload: FinancialAccountCreate, _: str = Depends(verify_admin)) -> Dict[str, Any]:
    cali = get_cali_skg()
    return cali.add_financial_account(
        institution=payload.institution,
        account_type=payload.account_type,
        account_number=payload.account_number,
        balance=payload.balance,
        alert_threshold=payload.alert_threshold,
        notes=payload.notes,
    )


@router.get("/financial/summary")
def get_financial_summary(_: str = Depends(verify_admin)) -> Dict[str, Any]:
    cali = get_cali_skg()
    return cali.get_financial_summary()


@router.post("/calendar/events")
def add_event(payload: EventCreate, _: str = Depends(verify_admin)) -> Dict[str, Any]:
    cali = get_cali_skg()
    return cali.add_event(
        title=payload.title,
        event_type=payload.event_type,
        start_time=payload.start_time,
        end_time=payload.end_time,
        location=payload.location,
        attendees=payload.attendees,
        priority=payload.priority,
    )


@router.get("/calendar/upcoming")
def get_upcoming_events(days: int = 7, _: str = Depends(verify_admin)) -> Dict[str, Any]:
    cali = get_cali_skg()
    return {"events": cali.get_upcoming_events(days=days)}


@router.get("/calendar/today")
def get_today_briefing(_: str = Depends(verify_admin)) -> Dict[str, Any]:
    cali = get_cali_skg()
    return cali.get_today_briefing()

@router.post("/verification/call")
def log_verification_call(payload: VerificationCall, _: str = Depends(verify_admin)) -> Dict[str, Any]:
    cali = get_cali_skg()
    return cali.log_verification_call(
        caller_number=payload.caller_number,
        caller_name=payload.caller_name,
        claimed_identity=payload.claimed_identity,
    )


@router.get("/verification/queue")
def get_verification_queue(_: str = Depends(verify_admin)) -> Dict[str, Any]:
    cali = get_cali_skg()
    return {"calls": cali.get_verification_queue()}


@router.post("/tasks")
def add_task(payload: TaskCreate, _: str = Depends(verify_admin)) -> Dict[str, Any]:
    cali = get_cali_skg()
    return cali.add_task(
        title=payload.title,
        description=payload.description,
        due_date=payload.due_date,
        priority=payload.priority,
        category=payload.category,
    )


@router.get("/tasks")
def get_tasks(category: Optional[str] = None, _: str = Depends(verify_admin)) -> Dict[str, Any]:
    cali = get_cali_skg()
    return {"tasks": cali.get_active_tasks(category=category)}


@router.post("/tasks/{task_id}/complete")
def complete_task(task_id: str, _: str = Depends(verify_admin)) -> Dict[str, Any]:
    cali = get_cali_skg()
    return cali.complete_task(task_id)


@router.post("/query")
def cali_query(payload: CaliQuery, _: str = Depends(verify_admin)) -> Dict[str, Any]:
    cali = get_cali_skg()
    context: Dict[str, Any] = {"current_path": payload.current_path or "/admin"}
    if payload.context:
        context.update(payload.context)
    return cali.process_query(query=payload.query, context=context)


@router.post("/orb/respond")
async def cali_orb_respond(payload: OrbRespondRequest) -> Dict[str, Any]:
    prompt = str(payload.prompt or "").strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is required.")

    context = dict(payload.context or {})
    if _is_substrate_query(prompt):
        substrate_snapshot = _collect_substrate_redis_snapshot()
        substrate_text = _substrate_response(prompt, substrate_snapshot)
        voice_payload = await _synthesize_voice(substrate_text)
        return {
            "status": "success",
            "response": substrate_text,
            "response_text": substrate_text,
            "data": {"substrate_snapshot": substrate_snapshot},
            "intent": {"type": "substrate_explain"},
            "audio_url": voice_payload.get("audio_url"),
            "audio_engine": voice_payload.get("audio_engine"),
            "metadata": {
                "provider": "kaygee_hybrid",
                "cognition": "qwen-core + cali-skg-articulation",
                "llm_core": "substrate-redis-brief",
                "leading_mind": "cali",
                "confidence": 0.9,
                "truth_likelihood": 0.9,
            },
        }

    quick_response = _fast_path_response(prompt)
    if quick_response:
        voice_payload = await _synthesize_voice(quick_response)
        return {
            "status": "success",
            "response": quick_response,
            "response_text": quick_response,
            "data": None,
            "intent": {"type": "fast_path"},
            "audio_url": voice_payload.get("audio_url"),
            "audio_engine": voice_payload.get("audio_engine"),
            "metadata": {
                "provider": "kaygee_hybrid",
                "cognition": "qwen-core + cali-skg-articulation",
                "llm_core": "fast-path",
                "leading_mind": "cali",
                "confidence": 0.96,
                "truth_likelihood": 0.96,
            },
        }

    cali = get_cali_skg()
    current_path = str(context.get("current_path") or context.get("currentPath") or "/")
    skg_context: Dict[str, Any] = {"current_path": current_path}
    skg_context.update(context)
    skg_result = cali.process_query(query=prompt, context=skg_context)
    intent_type = str((skg_result.get("intent") or {}).get("type") or "")

    llm_core = "cali-skg-action"
    response_text = str(skg_result.get("response") or "").strip()
    audio_url: Optional[str] = None
    audio_engine: Optional[str] = None

    if intent_type in {"unknown", ""} or not response_text:
        if _use_qwen_for_unknown():
            try:
                llm_core = f"ollama:{_ollama_model_name()}"
                response_text = _generate_llm_response(prompt, context=context, emotion=str(payload.emotion or "thoughtful_warm"))
            except Exception as exc:
                if _strict_mode():
                    raise HTTPException(status_code=503, detail=f"Hybrid cognition unavailable: {exc}") from exc
                llm_core = "kaygee-fallback"

        if not response_text:
            kaygee_response = await _query_kaygee_interact(
                prompt=prompt,
                context=context,
                emotion=str(payload.emotion or "thoughtful_warm"),
            )
            if kaygee_response.get("response"):
                response_text = str(kaygee_response["response"])
                audio_url = kaygee_response.get("audio_url")
                audio_engine = kaygee_response.get("audio_engine")
                llm_core = "kaygee-fallback"

    governed = _normalize_companion_text(response_text, prompt)
    if not governed:
        governed = "I'm here with you. Tell me what you need next."

    voice_payload = {"audio_url": audio_url, "audio_engine": audio_engine}
    if not voice_payload.get("audio_url"):
        voice_payload = await _synthesize_voice(governed)

    return {
        "status": "success",
        "response": governed,
        "response_text": governed,
        "data": skg_result.get("data"),
        "intent": skg_result.get("intent"),
        "audio_url": voice_payload.get("audio_url"),
        "audio_engine": voice_payload.get("audio_engine"),
        "metadata": {
            "provider": "kaygee_hybrid",
            "cognition": "qwen-core + cali-skg-articulation",
            "llm_core": llm_core,
            "leading_mind": "cali",
            "confidence": 0.86 if llm_core != "fallback" else 0.65,
            "truth_likelihood": 0.86 if llm_core != "fallback" else 0.65,
        },
    }


@router.get("/site/context")
def site_context(current_path: str = "/", _: str = Depends(verify_admin)) -> Dict[str, Any]:
    cali = get_cali_skg()
    return cali.get_site_context(current_path)


@router.post("/maintenance/prune")
def prune(retention_days: int = 90, _: str = Depends(verify_admin)) -> Dict[str, Any]:
    cali = get_cali_skg()
    cali.prune_knowledge_graph(retention_days=retention_days)
    return {"success": True, "message": "Knowledge graph pruned."}


app = FastAPI(title="Cali Personal Assistant API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok", "service": "cali-personal-api"}
