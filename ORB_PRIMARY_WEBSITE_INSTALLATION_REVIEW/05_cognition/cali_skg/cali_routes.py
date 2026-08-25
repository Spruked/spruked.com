"""Cali Personal Assistant API routes."""

from __future__ import annotations

import json
import os
import re
import base64
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from cali_skg.core.cali_personal_skg import get_cali_skg
from cali_skg.core.core_mind_reasoner import get_core_mind_reasoner

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


def _use_local_llm_for_unknown() -> bool:
    raw = os.getenv("CALI_HYBRID_USE_LOCAL_LLM", "1")
    return str(raw).strip() == "1"


def _local_kokoro_tts_url() -> str:
    return str(
        os.getenv(
            "ORB_TTS_KOKORO_URL",
            os.getenv("CALI_LOCAL_KOKORO_URL", "http://127.0.0.1:8880/speak"),
        )
    ).strip()


def _kokoro_health_url() -> str:
    configured = str(os.getenv("ORB_TTS_KOKORO_HEALTH_URL", "")).strip()
    if configured:
        return configured
    speak_url = _local_kokoro_tts_url().rstrip("/")
    if "/speak" in speak_url:
        return speak_url.rsplit("/speak", 1)[0] + "/health"
    if "/v1/audio/speech" in speak_url:
        return speak_url.rsplit("/v1/audio/speech", 1)[0] + "/health"
    return "http://127.0.0.1:8880/health"


def _kokoro_model() -> str:
    return str(os.getenv("ORB_TTS_KOKORO_MODEL", "kokoro")).strip() or "kokoro"


def _kokoro_voice() -> str:
    return str(os.getenv("ORB_TTS_KOKORO_VOICE", "am_echo")).strip() or "am_echo"


def _kokoro_format() -> str:
    return str(os.getenv("ORB_TTS_KOKORO_FORMAT", "wav")).strip() or "wav"


def _local_kokoro_speed() -> float:
    raw = str(os.getenv("ORB_TTS_KOKORO_SPEED", os.getenv("CALI_KOKORO_SPEED", "1.05"))).strip()
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
    return str(os.getenv("CALI_OLLAMA_MODEL_NAME", "llama3.2:1b")).strip()


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
        "Live path: /api/orb -> cali_skg -> /cali/orb/respond -> governed cognition -> kokoro primary speech.",
        f"Substrate Redis state: {redis_state}; sampled keys: {key_preview}.",
    ]
    if research_mode:
        lines.extend(
            [
                "Currently being researched/tested: hybrid provider stability, doctrine DDR enforcement, Redis substrate signal fidelity, and Kokoro voice reliability.",
                "Validation surfaces: web insight artifact export, cognition metadata traces (provider_used/llm_core/doctrine_state), and faster-whisper/Kokoro voice metrics.",
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
        "Follow CALI SKG governance style: concise, calm, practical, and safe. "
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
        response_text = result.get("response") or result.get("thinking", "")
        return str(response_text or "").strip()
    except Exception as exc:
        raise RuntimeError(f"Ollama API call failed: {exc}") from exc


async def _synthesize_voice(
    text: str,
    *,
    tts_base_url: Optional[str] = None,
    tts_engine: Optional[str] = None,
    voice: Optional[str] = None,
) -> Dict[str, Optional[str]]:
    _ = tts_base_url, tts_engine
    if not text:
        return {
            "audio_url": None,
            "audio_engine": "kokoro",
            "tts_provider": None,
            "tts_error": "Voice is temporarily unavailable, but I can still help here in text.",
        }

    preferred_voice = str(voice or _kokoro_voice()).strip() or _kokoro_voice()
    try:
        async with httpx.AsyncClient(timeout=max(5.0, _timeout_seconds())) as client:
            health = await client.get(_kokoro_health_url())
            if health.status_code != 200:
                raise RuntimeError("kokoro unavailable")
            response = await client.post(
                _local_kokoro_tts_url(),
                json={
                    "input": text,
                    "text": text,
                    "model": _kokoro_model(),
                    "voice": preferred_voice,
                    "response_format": _kokoro_format(),
                    "speed": _local_kokoro_speed(),
                },
            )
        content_type = str(response.headers.get("content-type") or "").lower()
        if response.status_code != 200 or "audio/wav" not in content_type:
            raise RuntimeError("kokoro unavailable")
        wav_b64 = base64.b64encode(response.content).decode("ascii")
        return {
            "audio_url": f"data:audio/wav;base64,{wav_b64}",
            "audio_engine": "kokoro",
            "tts_provider": "kokoro",
            "tts_error": None,
        }
    except Exception:
        return {
            "audio_url": None,
            "audio_engine": "kokoro",
            "tts_provider": None,
            "tts_error": "Voice is temporarily unavailable, but I can still help here in text.",
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
    tts_base_url: Optional[str] = None
    tts_engine: Optional[str] = None
    voice: Optional[str] = None


def _with_orb_memory(
    result: Dict[str, Any],
    prompt: str,
    context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    try:
        cali = get_cali_skg()
        result["memory"] = cali.record_orb_exchange(
            prompt=prompt,
            response=str(result.get("response") or result.get("response_text") or ""),
            context=context or {},
            intent=result.get("intent") if isinstance(result.get("intent"), dict) else {},
            metadata=result.get("metadata") if isinstance(result.get("metadata"), dict) else {},
        )
    except Exception as exc:
        result["memory"] = {"recorded": False, "error": str(exc)}
    return result


def _core_reasoning(prompt: str) -> Dict[str, Any]:
    try:
        return get_core_mind_reasoner().reason(prompt)
    except Exception as exc:
        return {
            "source": "cali_skg.core.core_4_minds",
            "leading_mind": "cali",
            "mind_scores": [],
            "matched_concepts": [],
            "vault_context": {},
            "error": str(exc),
        }


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
    core_reasoning = _core_reasoning(prompt)
    leading_mind = str(core_reasoning.get("leading_mind") or "cali")
    if _is_substrate_query(prompt):
        substrate_snapshot = _collect_substrate_redis_snapshot()
        substrate_text = _substrate_response(prompt, substrate_snapshot)
        voice_payload = await _synthesize_voice(
            substrate_text,
            tts_base_url=payload.tts_base_url,
            tts_engine=payload.tts_engine,
            voice=payload.voice,
        )
        return _with_orb_memory({
            "status": "success",
            "response": substrate_text,
            "response_text": substrate_text,
            "data": {"substrate_snapshot": substrate_snapshot, "core_reasoning": core_reasoning},
            "intent": {"type": "substrate_explain"},
            "audio_url": voice_payload.get("audio_url"),
            "tts_audio_url": voice_payload.get("audio_url"),
            "tts_provider": voice_payload.get("tts_provider"),
            "tts_error": voice_payload.get("tts_error"),
            "audio_engine": voice_payload.get("audio_engine"),
            "metadata": {
                "provider": "cali_skg",
                "cognition": "governed-cali-articulation",
                "llm_core": "substrate-redis-brief",
                "leading_mind": leading_mind,
                "confidence": 0.9,
                "truth_likelihood": 0.9,
                "core_reasoner": "cali_skg.core.core_4_minds",
            },
        }, prompt, context)

    quick_response = _fast_path_response(prompt)
    if quick_response:
        voice_payload = await _synthesize_voice(
            quick_response,
            tts_base_url=payload.tts_base_url,
            tts_engine=payload.tts_engine,
            voice=payload.voice,
        )
        return _with_orb_memory({
            "status": "success",
            "response": quick_response,
            "response_text": quick_response,
            "data": {"core_reasoning": core_reasoning},
            "intent": {"type": "fast_path"},
            "audio_url": voice_payload.get("audio_url"),
            "tts_audio_url": voice_payload.get("audio_url"),
            "tts_provider": voice_payload.get("tts_provider"),
            "tts_error": voice_payload.get("tts_error"),
            "audio_engine": voice_payload.get("audio_engine"),
            "metadata": {
                "provider": "cali_skg",
                "cognition": "governed-cali-articulation",
                "llm_core": "fast-path",
                "leading_mind": leading_mind,
                "confidence": 0.96,
                "truth_likelihood": 0.96,
                "core_reasoner": "cali_skg.core.core_4_minds",
            },
        }, prompt, context)

    cali = get_cali_skg()
    current_path = str(context.get("current_path") or context.get("currentPath") or "/")
    skg_context: Dict[str, Any] = {"current_path": current_path}
    skg_context.update(context)
    skg_context["core_reasoning"] = core_reasoning
    skg_result = cali.process_query(query=prompt, context=skg_context)
    intent_type = str((skg_result.get("intent") or {}).get("type") or "")

    llm_core = "cali-skg-action"
    response_text = str(skg_result.get("response") or "").strip()
    audio_url: Optional[str] = None
    audio_engine: Optional[str] = None

    if intent_type in {"unknown", ""} or not response_text:
        if _use_local_llm_for_unknown():
            try:
                llm_core = f"ollama:{_ollama_model_name()}"
                response_text = _generate_llm_response(prompt, context=context, emotion=str(payload.emotion or "thoughtful_warm"))
            except Exception as exc:
                if _strict_mode():
                    raise HTTPException(status_code=503, detail=f"Hybrid cognition unavailable: {exc}") from exc
                llm_core = "cali-local-fallback"

    audio_url = None
    audio_engine = None
    governed = _normalize_companion_text(response_text, prompt)
    if not governed:
        governed = "I'm here with you. Tell me what you need next."

    voice_payload = {"audio_url": audio_url, "audio_engine": audio_engine}
    if not voice_payload.get("audio_url"):
        voice_payload = await _synthesize_voice(
            governed,
            tts_base_url=payload.tts_base_url,
            tts_engine=payload.tts_engine,
            voice=payload.voice,
        )

    return _with_orb_memory({
        "status": "success",
        "response": governed,
        "response_text": governed,
        "data": {
            "result": skg_result.get("data"),
            "core_reasoning": core_reasoning,
        },
        "intent": skg_result.get("intent"),
        "audio_url": voice_payload.get("audio_url"),
        "tts_audio_url": voice_payload.get("audio_url"),
        "tts_provider": voice_payload.get("tts_provider"),
        "tts_error": voice_payload.get("tts_error"),
        "audio_engine": voice_payload.get("audio_engine"),
        "metadata": {
            "provider": "cali_skg",
            "cognition": "governed-cali-articulation",
            "llm_core": llm_core,
            "leading_mind": leading_mind,
            "confidence": 0.86 if llm_core != "fallback" else 0.65,
            "truth_likelihood": 0.86 if llm_core != "fallback" else 0.65,
            "core_reasoner": "cali_skg.core.core_4_minds",
        },
    }, prompt, skg_context)


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
