"""Cali Personal Assistant API routes."""

from __future__ import annotations

import json
import os
import re
import base64
import threading
import time
from typing import Any, Dict, List, Optional
from urllib.parse import urlsplit, urlunsplit

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
_REDIS_LOCK = threading.Lock()


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


def _use_llm_for_unknown() -> bool:
    return str(os.getenv("CALI_HYBRID_USE_LLM", "1")).strip() == "1"


def _kaygee_api_base() -> str:
    return str(os.getenv("KAYGEE_API_BASE", "http://127.0.0.1:8011")).strip().rstrip("/")


def _kaygee_voice_enabled() -> bool:
    return str(os.getenv("KAYGEE_VOICE_ENABLED", "1")).strip() == "1"


def _kaygee_voice() -> str:
    return str(os.getenv("KAYGEE_VOICE", "af_bella")).strip() or "af_bella"


def _local_kokoro_tts_url() -> str:
    return str(os.getenv("CALI_LOCAL_KOKORO_URL", "http://127.0.0.1:12000/api/kokoro/tts")).strip()


def _qwen_tts_url() -> str:
    return str(os.getenv("CALI_QWEN_TTS_URL", "http://127.0.0.1:9880/speak")).strip()


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
    raw = str(os.getenv("CALI_LLM_MAX_TOKENS") or os.getenv("CALI_OLLAMA_MAX_TOKENS") or "48").strip()
    try:
        return min(800, max(8, int(raw)))
    except ValueError:
        return 48


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


def _llm_provider() -> str:
    raw = str(os.getenv("CALI_LLM_PROVIDER", "llama_cpp")).strip().lower()
    normalized = raw.replace("-", "_").replace(".", "_")
    if normalized in {"llama", "llamacpp", "llama_cpp", "llama_cpp_server"}:
        return "llama_cpp"
    if normalized == "ollama":
        return "ollama"
    return "llama_cpp"


def _llama_cpp_base_url() -> str:
    return str(
        os.getenv("LLAMA_CPP_API_BASE")
        or os.getenv("LLAMA_CPP_SERVER_URL")
        or "http://127.0.0.1:8080"
    ).strip().rstrip("/")


def _llama_cpp_model_name() -> str:
    return str(os.getenv("CALI_LLAMA_CPP_MODEL_NAME", "local-llama-cpp")).strip() or "local-llama-cpp"


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


def _normalize_companion_text(raw_text: str, prompt: str) -> str:
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

    # Final cleanup
    text = re.sub(r"\s{2,}", " ", text).strip()
    if not text:
        return ""
    if text[-1] not in ".!?":
        text = f"{text}."
    return text


def _generate_llm_response(prompt: str, context: Dict[str, Any], emotion: str) -> str:
    system_prompt = (
        "You are Cali, a female executive assistant for Bryan on spruked.com. "
        "Follow KayGee governance style: concise, calm, practical, and safe. "
        "Never output diagnostic fields like MIND or CONF."
    )
    context_hint = ""
    if context:
        context_hint = f"\nContext: {context}"
    full_prompt = f"Emotion: {emotion}\nUser: {prompt}{context_hint}"

    if _llm_provider() == "llama_cpp":
        base_url = _llama_cpp_base_url()
        model = _llama_cpp_model_name()
        try:
            response = httpx.post(
                f"{base_url}/v1/chat/completions",
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": full_prompt},
                    ],
                    "stream": False,
                    "max_tokens": _llm_max_tokens(),
                    "temperature": _llm_temperature(),
                    "top_p": 0.9,
                },
                timeout=60.0,
            )
            response.raise_for_status()
            result = response.json()
            choices = result.get("choices") or []
            if choices:
                message = choices[0].get("message") or {}
                content = message.get("content") or choices[0].get("text")
                if content:
                    return str(content).strip()

            raise RuntimeError("empty chat completion response")
        except Exception as chat_exc:
            try:
                response = httpx.post(
                    f"{base_url}/completion",
                    json={
                        "prompt": f"{system_prompt}\n\n{full_prompt}\nCali:",
                        "stream": False,
                        "n_predict": _llm_max_tokens(),
                        "temperature": _llm_temperature(),
                        "top_p": 0.9,
                    },
                    timeout=60.0,
                )
                response.raise_for_status()
                result = response.json()
                response_text = result.get("content") or result.get("response") or result.get("text") or ""
                return str(response_text or "").strip()
            except Exception as completion_exc:
                raise RuntimeError(
                    f"llama.cpp API call failed: chat={chat_exc}; completion={completion_exc}"
                ) from completion_exc

    model = _ollama_model_name()
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


async def _synthesize_voice(text: str, voice: Optional[str] = None) -> Dict[str, Optional[str]]:
    if not _kaygee_voice_enabled() or not text:
        return {"audio_url": None, "audio_engine": None}
    selected_voice = (voice or _kaygee_voice()).strip() or _kaygee_voice()

    async def parse_tts_response(response: httpx.Response, base_url: str, engine: str) -> Dict[str, Optional[str]]:
        content_type = str(response.headers.get("content-type") or "").lower()
        if content_type.startswith("audio/"):
            return {
                "audio_url": f"data:{content_type.split(';', 1)[0]};base64,{base64.b64encode(response.content).decode('ascii')}",
                "audio_engine": engine,
            }
        data = response.json()
        wav_b64 = str(data.get("audio_wav_base64") or "").strip()
        raw_audio_url = str(data.get("audio_url") or "").strip()
        if wav_b64:
            return {
                "audio_url": f"data:audio/wav;base64,{wav_b64}",
                "audio_engine": str(data.get("audio_engine") or data.get("engine") or engine).strip() or engine,
            }
        if raw_audio_url:
            if not raw_audio_url.startswith("http://") and not raw_audio_url.startswith("https://") and not raw_audio_url.startswith("data:"):
                raw_audio_url = f"{base_url}{raw_audio_url if raw_audio_url.startswith('/') else '/' + raw_audio_url}"
            return {
                "audio_url": raw_audio_url,
                "audio_engine": str(data.get("audio_engine") or data.get("engine") or engine).strip() or engine,
            }
        return {"audio_url": None, "audio_engine": None}

    local_tts_url = _local_kokoro_tts_url()
    if local_tts_url:
        try:
            async with httpx.AsyncClient(timeout=max(5.0, _timeout_seconds())) as client:
                response = await client.post(
                    local_tts_url,
                    json={"text": text, "voice": selected_voice, "speed": _local_kokoro_speed()},
                )
            if response.status_code == 200:
                parsed = await parse_tts_response(response, local_tts_url.rsplit("/", 3)[0], "kokoro_local")
                if parsed.get("audio_url"):
                    return parsed
        except Exception:
            pass

    qwen_tts_url = _qwen_tts_url()
    if qwen_tts_url:
        try:
            async with httpx.AsyncClient(timeout=max(5.0, _timeout_seconds())) as client:
                response = await client.post(
                    qwen_tts_url,
                    json={"text": text, "voice": selected_voice},
                )
            if response.status_code == 200:
                parsed = await parse_tts_response(response, qwen_tts_url.rsplit("/", 1)[0], "qwen3_tts")
                if parsed.get("audio_url"):
                    return parsed
        except Exception:
            pass

    return {
        "audio_url": None,
        "audio_engine": None,
    }


def _origin_for_url(raw_url: str) -> str:
    parsed = urlsplit(raw_url)
    return urlunsplit((parsed.scheme, parsed.netloc, "", "", "")).rstrip("/")


def _kokoro_warmup_url() -> str:
    raw = _local_kokoro_tts_url().rstrip("/")
    if raw.endswith("/tts"):
        return f"{raw[:-4]}/warmup"
    return f"{raw.rsplit('/', 1)[0]}/warmup"


async def _warmup_voice(voice: Optional[str] = None) -> Dict[str, Any]:
    selected_voice = (voice or _kaygee_voice()).strip() or _kaygee_voice()
    started = time.monotonic()
    details: Dict[str, Any] = {
        "kokoro": {"status": "not_attempted"},
        "qwen3_tts": {"status": "not_attempted"},
    }

    try:
        async with httpx.AsyncClient(timeout=max(5.0, _timeout_seconds())) as client:
            response = await client.post(
                _kokoro_warmup_url(),
                json={"voice": selected_voice, "speed": _local_kokoro_speed()},
            )
        data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
        details["kokoro"] = {
            "status": "ready" if response.status_code == 200 and data.get("status") in {"success", "ready", "warming"} else "error",
            "http_status": response.status_code,
            "latency_ms": data.get("latency_ms"),
            "prewarm_seconds": data.get("prewarm_seconds"),
        }
        if response.status_code == 200 and data.get("status") in {"success", "ready", "warming"}:
            return {
                "status": "success",
                "warmup_state": str(data.get("status") or "ready"),
                "voice_ready": bool(data.get("voice_ready", True)),
                "audio_engine": "kokoro_local",
                "latency_ms": round((time.monotonic() - started) * 1000, 2),
                "metadata": {"details": details, "voice": selected_voice},
            }
    except Exception as exc:
        details["kokoro"] = {"status": "error", "message": str(exc)}

    qwen_url = _qwen_tts_url()
    if qwen_url:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                response = await client.get(f"{_origin_for_url(qwen_url)}/health")
            details["qwen3_tts"] = {
                "status": "ready" if response.status_code == 200 else "unavailable",
                "http_status": response.status_code,
            }
            if response.status_code == 200:
                return {
                    "status": "success",
                    "warmup_state": "qwen3_tts_ready",
                    "voice_ready": True,
                    "audio_engine": "qwen3_tts",
                    "latency_ms": round((time.monotonic() - started) * 1000, 2),
                    "metadata": {"details": details, "voice": selected_voice},
                }
        except Exception as exc:
            details["qwen3_tts"] = {"status": "unavailable", "message": str(exc)}

    return {
        "status": "error",
        "warmup_state": "tts_unavailable",
        "voice_ready": False,
        "audio_engine": None,
        "latency_ms": round((time.monotonic() - started) * 1000, 2),
        "metadata": {"details": details, "voice": selected_voice},
    }


class ContactCreate(BaseModel):
    name: str
    contact_type: str = "personal"
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    priority: int = 0
    crm_stage: Optional[str] = None
    lead_source: Optional[str] = None
    owner: Optional[str] = None
    next_follow_up_at: Optional[str] = None


class CRMStageUpdate(BaseModel):
    contact_id: str
    stage: str
    next_follow_up_at: Optional[str] = None
    owner: Optional[str] = None
    notes: Optional[str] = None


class CRMActivityCreate(BaseModel):
    contact_id: str
    activity_type: str
    summary: str
    metadata: Optional[Dict[str, Any]] = None


class CRMAppointmentCreate(BaseModel):
    contact_id: str
    title: str
    start_time: str
    end_time: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None


class EmailConnectorCreate(BaseModel):
    provider: str = "imap_smtp"
    email: str
    imap_host: Optional[str] = None
    imap_port: int = 993
    smtp_host: Optional[str] = None
    smtp_port: int = 587
    calendar_provider: str = "local"
    notes: Optional[str] = None


class EmailPollRequest(BaseModel):
    mailbox: str = "INBOX"
    limit: int = 25
    since_hours: int = 72
    unseen_only: bool = True


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


class OrbTtsRequest(BaseModel):
    text: str
    voice: Optional[str] = None


class OrbTtsWarmupRequest(BaseModel):
    voice: Optional[str] = None


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
        crm_stage=payload.crm_stage,
        lead_source=payload.lead_source,
        owner=payload.owner,
        next_follow_up_at=payload.next_follow_up_at,
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


@router.get("/crm/pipeline")
def crm_pipeline(_: str = Depends(verify_admin)) -> Dict[str, Any]:
    cali = get_cali_skg()
    return cali.get_crm_pipeline()


@router.patch("/crm/leads/stage")
def crm_update_stage(payload: CRMStageUpdate, _: str = Depends(verify_admin)) -> Dict[str, Any]:
    cali = get_cali_skg()
    result = cali.update_contact_stage(
        contact_id=payload.contact_id,
        stage=payload.stage,
        next_follow_up_at=payload.next_follow_up_at,
        owner=payload.owner,
        notes=payload.notes,
    )
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("message", "Lead not found."))
    return result


@router.post("/crm/activities")
def crm_log_activity(payload: CRMActivityCreate, _: str = Depends(verify_admin)) -> Dict[str, Any]:
    cali = get_cali_skg()
    return cali.log_crm_activity(
        contact_id=payload.contact_id,
        activity_type=payload.activity_type,
        summary=payload.summary,
        metadata=payload.metadata,
    )


@router.get("/crm/activities/{contact_id}")
def crm_contact_activities(contact_id: str, limit: int = 40, _: str = Depends(verify_admin)) -> Dict[str, Any]:
    cali = get_cali_skg()
    activities = cali.get_contact_activities(contact_id=contact_id, limit=limit)
    return {"activities": activities, "count": len(activities)}


@router.post("/crm/appointments")
def crm_schedule_appointment(payload: CRMAppointmentCreate, _: str = Depends(verify_admin)) -> Dict[str, Any]:
    cali = get_cali_skg()
    result = cali.schedule_contact_appointment(
        contact_id=payload.contact_id,
        title=payload.title,
        start_time=payload.start_time,
        end_time=payload.end_time,
        location=payload.location,
        notes=payload.notes,
    )
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("message", "Contact not found."))
    return result


@router.post("/crm/email/connect")
def crm_email_connect(payload: EmailConnectorCreate, _: str = Depends(verify_admin)) -> Dict[str, Any]:
    cali = get_cali_skg()
    return cali.configure_email_connector(
        provider=payload.provider,
        email=payload.email,
        imap_host=payload.imap_host,
        imap_port=payload.imap_port,
        smtp_host=payload.smtp_host,
        smtp_port=payload.smtp_port,
        calendar_provider=payload.calendar_provider,
        notes=payload.notes,
    )


@router.get("/crm/email/status")
def crm_email_status(_: str = Depends(verify_admin)) -> Dict[str, Any]:
    cali = get_cali_skg()
    return cali.get_email_connector_status()


@router.post("/crm/email/poll")
def crm_email_poll(payload: EmailPollRequest, _: str = Depends(verify_admin)) -> Dict[str, Any]:
    cali = get_cali_skg()
    result = cali.poll_inbound_mailbox(
        mailbox=payload.mailbox,
        limit=payload.limit,
        since_hours=payload.since_hours,
        unseen_only=payload.unseen_only,
    )
    if not result.get("success"):
        status = str(result.get("status") or "error")
        if status in {"not_configured", "connector_incomplete", "password_missing"}:
            raise HTTPException(status_code=400, detail=result.get("message", status))
        raise HTTPException(status_code=502, detail=result.get("message", status))
    return result


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
        context["substrate_snapshot"] = substrate_snapshot

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
        if _use_llm_for_unknown():
            try:
                llm_core = (
                    f"llama.cpp:{_llama_cpp_model_name()}@{_llama_cpp_base_url()}"
                    if _llm_provider() == "llama_cpp"
                    else f"ollama:{_ollama_model_name()}"
                )
                response_text = _generate_llm_response(prompt, context=context, emotion=str(payload.emotion or "thoughtful_warm"))
            except Exception as exc:
                raise HTTPException(status_code=503, detail=f"Hybrid cognition unavailable: {exc}") from exc

    governed = _normalize_companion_text(response_text, prompt)
    if not governed:
        raise HTTPException(status_code=503, detail="CALI cognition produced no response.")

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
            "cognition": "llama.cpp-core + cali-skg-articulation",
            "llm_core": llm_core,
            "leading_mind": "cali",
            "confidence": 0.86 if llm_core != "fallback" else 0.65,
            "truth_likelihood": 0.86 if llm_core != "fallback" else 0.65,
        },
    }


@router.post("/orb/tts")
async def cali_orb_tts(payload: OrbTtsRequest) -> Dict[str, Any]:
    text = str(payload.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required.")
    voice_payload = await _synthesize_voice(text, payload.voice)
    return {
        "status": "success" if voice_payload.get("audio_url") else "error",
        "response": text,
        "text": text,
        "audio_url": voice_payload.get("audio_url"),
        "audio_engine": voice_payload.get("audio_engine"),
        "metadata": {
            "provider": "cali-tts",
            "voice_provider_order": "kokoro_local -> qwen3_tts",
            "voice": payload.voice or _kaygee_voice(),
            "voice_ready": bool(voice_payload.get("audio_url")),
            "audio_engine": voice_payload.get("audio_engine"),
        },
    }


@router.post("/orb/tts/warmup")
async def cali_orb_tts_warmup(payload: OrbTtsWarmupRequest) -> Dict[str, Any]:
    result = await _warmup_voice(payload.voice)
    return {
        **result,
        "metadata": {
            **dict(result.get("metadata") or {}),
            "provider": "cali-tts-warmup",
            "voice_provider_order": "kokoro_local -> qwen3_tts",
            "voice_ready": bool(result.get("voice_ready")),
            "audio_engine": result.get("audio_engine"),
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
