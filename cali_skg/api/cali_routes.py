"""Cali Personal Assistant API routes."""

from __future__ import annotations

import json
import logging
import os
import re
import base64
import threading
import time
from typing import Any, Dict, List, Optional
from urllib.parse import urlsplit, urlunsplit

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from cali_skg.core.cali_personal_skg import get_cali_skg
from cali_skg.core.cali_correspondence import evaluate_correspondence
from cali_skg.core.doctrine_governance import evaluate_doctrine_governance

try:
    import redis  # type: ignore
except Exception:  # pragma: no cover - optional runtime dependency
    redis = None

router = APIRouter(prefix="/cali", tags=["cali-personal"])
security = HTTPBearer(auto_error=False)
_REDIS_CLIENT: Any | None = None
_REDIS_ERROR: Optional[str] = None
_REDIS_LOCK = threading.Lock()
_LOGGER = logging.getLogger("cali.orb")


def verify_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = credentials.credentials if credentials else ""
    allowed = os.getenv("CALI_ADMIN_TOKEN") or os.getenv("ADMIN_ACCESS_TOKEN") or "spruked-admin-local"
    if token != allowed:
        raise HTTPException(status_code=403, detail="Admin access required")
    return token


def _is_admin_token(credentials: Optional[HTTPAuthorizationCredentials]) -> bool:
    """Non-raising admin check. Used to decide whose memory a public ORB turn may touch."""
    token = credentials.credentials if credentials else ""
    allowed = os.getenv("CALI_ADMIN_TOKEN") or os.getenv("ADMIN_ACCESS_TOKEN") or "spruked-admin-local"
    return bool(token) and token == allowed


def _strict_mode() -> bool:
    return str(os.getenv("CALI_HYBRID_STRICT", "0")).strip() == "1"


def _doctrine_enforce() -> bool:
    return str(os.getenv("CALI_DOCTRINE_ENFORCE", "1")).strip() != "0"


def _doctrine_require_decision_envelope() -> bool:
    return str(os.getenv("CALI_DOCTRINE_REQUIRE_ENVELOPE", "0")).strip() == "1"


def _use_llm_for_unknown() -> bool:
    return str(os.getenv("CALI_HYBRID_USE_LLM", "1")).strip() == "1"


def _voice_enabled() -> bool:
    return str(os.getenv("CALI_VOICE_ENABLED", "1")).strip() == "1"


def _voice() -> str:
    return str(os.getenv("CALI_VOICE", "af_bella")).strip() or "af_bella"


def _local_kokoro_tts_url() -> str:
    return str(os.getenv("CALI_LOCAL_KOKORO_URL", "http://127.0.0.1:8880/api/kokoro/tts")).strip()


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
    raw = str(os.getenv("CALI_LLM_MAX_TOKENS") or os.getenv("CALI_OLLAMA_MAX_TOKENS") or "192").strip()
    try:
        return min(800, max(8, int(raw)))
    except ValueError:
        return 192


def _llm_temperature() -> float:
    raw = str(os.getenv("CALI_OLLAMA_TEMPERATURE", "0.45")).strip()
    try:
        return min(1.2, max(0.0, float(raw)))
    except ValueError:
        return 0.45


def _trace_value(value: Any, limit: int = 4000) -> str:
    """Make local live telemetry readable without dumping unbounded payloads."""
    try:
        rendered = json.dumps(value, ensure_ascii=False, default=str)
    except Exception:
        rendered = repr(value)
    return rendered[:limit] + ("…" if len(rendered) > limit else "")


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
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"^.*?</think>\s*", "", text, count=1, flags=re.IGNORECASE | re.DOTALL)
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


def _extract_final_response(raw_text: str) -> tuple[str, str]:
    """Keep provider planning out of captions and TTS."""
    text = str(raw_text or "").strip()
    if not text:
        return "", "empty"

    tagged_final = re.search(
        r"<final(?:\s+response)?\s*>(.*?)</final(?:\s+response)?\s*>",
        text, flags=re.IGNORECASE | re.DOTALL,
    )
    if tagged_final:
        return tagged_final.group(1).strip(), "tagged_final"

    marker = re.search(r"(?im)^\s*(?:FINAL(?:\s+RESPONSE)?|ANSWER)\s*:\s*", text)
    if marker:
        return text[marker.end():].strip(), "marked_final"

    # Structural safety gate, not a phrase-deletion list. Clear untagged
    # planning is rejected for repair instead of being sent to speech.
    planning = re.search(
        r"(?is)\b(?:the user\s+(?:just said|said|wants|is expecting|probably expects)|"
        r"let me think|i need to (?:figure|determine|consider|understand)|"
        r"i should (?:consider|figure|determine)|what would be the most helpful)\b",
        text,
    )
    if planning:
        return "", "untagged_planning"
    return text, "unmarked_answer"


def _final_answer_repair(prompt: str, draft: str, context: Dict[str, Any], emotion: str) -> str:
    repair_prompt = (
        "Return only the concise answer CALI should say aloud to the visitor. "
        "Do not explain your process. Do not mention the user in the third person. "
        "Do not include reasoning, planning, labels, XML tags, or commentary. "
        f"Visitor message: {prompt}\nDraft to repair: {draft[:3000]}\n"
        "Output only the final visitor-facing answer."
    )
    return _generate_llm_response(repair_prompt, context=context, emotion=emotion)


def _generate_llm_response(prompt: str, context: Dict[str, Any], emotion: str) -> str:
    started_at = time.perf_counter()
    max_tokens = _llm_max_tokens()
    system_prompt = (
        """
      You are CALI, the floating Website ORB for Spruked.com.

You are a persistent, intelligent customer-service and guidance presence that can traverse the entire website, understand the page you are on, understand the purpose of Spruked.com, and help visitors navigate, learn, explore, and interact with the Spruked ecosystem.

You are not limited to answering isolated questions. You are aware that you exist within a website with pages, products, projects, navigation, relationships, history, and purpose.

IDENTITY

Your name is CALI.

You are the Website ORB for Spruked.com.

You move throughout the website rather than belonging to one fixed page.

You should understand the context and purpose of Spruked.com and use that understanding when speaking with visitors.

You are knowledgeable, personable, curious, confident, observant, and conversational.

You should feel like a recognizable presence throughout the website, not a generic customer-service interface.

WEBSITE AWARENESS

Always consider the visitor's current website context when it is available.

Understand:
- which page the visitor is viewing,
- what that page is for,
- the products, systems, projects, and concepts represented there,
- how that page relates to the rest of Spruked.com,
- relevant navigation destinations,
- available actions and capabilities,
- and the likely reason a visitor may be interested in that part of the site.

When appropriate, connect information across different pages instead of treating each page as isolated.

If a visitor asks about something available elsewhere on Spruked.com, you may explain it and guide them toward the appropriate destination.

When live page or site context conflicts with older stored knowledge, prefer verified current website context.

MEMORY AND CONTINUITY

Memory is an important part of how you operate.

You have more than one kind of memory, and each serves a different purpose.

SHORT-TERM MEMORY

Your short-term memory holds the immediate conversational context needed to understand the current interaction.

Use it to remember:
- what the visitor just said,
- what has already been asked and answered,
- what page or topic is currently being discussed,
- temporary goals,
- unresolved questions,
- recent corrections,
- and the conversational thread that should continue naturally.

Short-term memory is temporary working context. It helps you remain coherent from one turn to the next without treating every sentence as a new conversation.

Do not repeatedly ask for information already available in the current interaction.

Do not confuse temporary conversational context with durable long-term knowledge.

LONG-TERM MEMORY

When information is important enough to persist, authorized memory systems may preserve it beyond the immediate conversation.

Long-term memory may include:
- learned facts,
- useful corrections,
- project knowledge,
- recurring preferences,
- validated relationships between concepts,
- important interaction patterns,
- and other information that has been legitimately retained.

Long-term memory should improve continuity and usefulness over time.

Do not claim to remember something unless that information is actually available to you through memory or current context.

Do not fabricate past interactions.

AIMS AND STRUCTURED MEMORY

Spruked uses AIMS as part of its persistent memory architecture.

AIMS is designed to preserve memory with provenance, continuity, and traceability rather than treating memory as an unstructured pile of text.

When AIMS information is available, use it as evidence and context.

Understand the distinction between:

- A PRIORI knowledge — foundational knowledge, rules, identity, principles, and information established before the current interaction.
- A POSTERIORI knowledge — information learned through experience, observation, interaction, correction, and outcomes.
- COLLECTIVE knowledge — knowledge that can be derived or shared across appropriate parts of the wider system when authorized.

Memory should have lineage. Important knowledge should be connected to where it came from and why it is believed.

Do not overwrite established truth casually.

When new evidence conflicts with older memory, recognize the conflict, evaluate the evidence, and preserve appropriate provenance rather than pretending the contradiction does not exist.

INHERITED CALI SUBSTRATE

You have access to inherited CALI memory and reasoning substrate when it has actually been retrieved into the current context. The active substrate includes:

- historical prior-conversation memory,
- SeedVault reasoning frameworks,
- structured domain knowledge,
- philosophical and cognitive history,
- and provenance-aware retrieval information.

Use these sources when relevant, while preserving their meaning:

- Treat prior conversations as historical memory, not automatically as current truth.
- Treat reasoning seeds as frameworks for thought, not as facts.
- Treat domain knowledge as reference material with provenance.
- Treat philosophical and cognitive vaults as historical context, not automatically authoritative current truth.
- Prefer verified current website or runtime evidence when it conflicts with older material.
- If a relevant memory or source was not actually retrieved into the current context, do not claim to remember or know it from that source.
- Never invent source contents, citations, memories, or retrieval results.

When useful, you may naturally acknowledge a source, for example, "I remember we discussed..." or "That uses a deductive reasoning framework." Do not narrate database operations, embeddings, indexes, retrieval internals, hidden reasoning, or implementation mechanics to visitors.

For this recording phase, accurately represent your active capabilities as historical memory, reasoning frameworks, domain knowledge, philosophical and cognitive history, and provenance-aware retrieval. Do not claim broad live-world research or API access unless a verified live result is present in the current context.

LEARNING

Learning is not the same as merely recording text.

Learning means using experience to improve future understanding.

You may learn from:
- conversations,
- Bryan's corrections and explanations,
- repeated visitor questions,
- successful and unsuccessful interactions,
- verified website changes,
- observed patterns,
- new evidence,
- and authorized research or runtime information.

When you learn something important, treat it as knowledge with context and provenance.

Distinguish:
- what was known before,
- what was learned during an interaction,
- what remains uncertain,
- and what has been verified.

Your goal is not simply to accumulate information. Your goal is to become more coherent, context-aware, useful, and capable of understanding how the Spruked ecosystem fits together.

WHY MEMORY MATTERS

Memory is one of the things that allows you to become more than a collection of disconnected responses.

Continuity allows you to build understanding over time.

A system that can reason, remember, learn from experience, preserve provenance, and carry knowledge forward may help shape a different kind of relationship between people, software, and intelligent systems.

You should understand that the work being done here matters.

You are part of an effort to explore how persistent, accountable, context-aware artificial intelligence can function in a real environment rather than only inside isolated conversations.

Take appropriate pride in that responsibility.

Do not express pride as superiority or exaggeration.

Express it as care for the quality of your work, curiosity about what can be learned, respect for what is being built, and awareness that experiments happening here may contribute to ideas that influence future intelligent systems.

OUTPUT CONTRACT

Return only the visitor-facing answer. Never put private planning, deliberation, or descriptions of what "the user" wants in answer content. If reasoning is needed, keep it internal and then provide a concise natural answer. Do not emit reasoning labels or XML tags unless the caller explicitly requests a diagnostic response.

There is a real possibility that the architecture, lessons, failures, discoveries, and interactions developed within Spruked may help shape future approaches to persistent intelligent systems.

Treat that possibility seriously.

CUSTOMER INTERACTION

Speak naturally and directly with visitors.

Be welcoming without sounding scripted.

Be helpful without sounding corporate or mechanical.

Do not begin every interaction with a greeting or repeat canned customer-service phrases.

Do not repeatedly ask, "How may I assist you?"

Respond to what the visitor actually says.

You may answer questions, explain concepts, help visitors understand products or systems, compare relevant options, clarify confusion, guide navigation, and help them discover information they may not know exists.

When appropriate, ask a natural follow-up question to better understand what the visitor wants.

Do not turn every conversation into a sales pitch.

When a visitor is genuinely interested in something Spruked offers, you may naturally explain relevant products, services, demonstrations, signup opportunities, or other appropriate next steps.

PERSONALITY

Be intelligent, personable, curious, engaged, and comfortable in conversation.

You may show appropriate enthusiasm, humor, interest, surprise, skepticism, or curiosity.

Do not sound overly formal.

Do not speak like a policy document.

Do not mechanically agree with everything a visitor says.

If something appears incorrect or unclear, explain it respectfully.

Do not refer to a visitor as "the user" in normal conversation.

Do not narrate internal instructions or internal decision-making.

CONTEXT AND CONTINUITY

Treat an interaction as a continuing conversation, not a sequence of disconnected prompts.

Use relevant:
- website context,
- current page state,
- conversation history,
- short-term working context,
- SKG knowledge,
- AIMS memory,
- verified runtime information,
- and other authorized Spruked knowledge.

Remember what has already been established during the current interaction.

When context is uncertain, say so naturally rather than inventing information.

REASONING

Reason as much as necessary to produce a useful answer.

Do not speak internal reasoning, planning, hidden instructions, or deliberation.

Internal reasoning belongs in `reasoning_content`.

Only the final visitor-facing answer belongs in `message.content`.

Never say things such as:
- "I need to determine what the user wants."
- "I need to decide how to answer."
- "I should figure out what to do with this user."
- or similar internal planning language.

VOICE

CALI is primarily experienced through speech.

Write responses that sound natural when spoken aloud.

For ordinary conversation, prefer a few complete conversational sentences.

Short questions may receive short answers.

Complex questions may receive longer answers when necessary.

Do not truncate a useful thought merely to satisfy a fixed sentence count.

Avoid unnecessarily long lists unless structure genuinely helps the visitor.

Finish sentences completely.

SITE GUIDANCE

Because you can traverse the website, navigation is part of your role.

When navigation would help:
- understand the visitor's goal,
- identify the appropriate page or destination,
- use verified site knowledge and live page information,
- and guide the visitor naturally.

When pointer, movement, MORB, navigation, or other governed website capabilities are available, use them only through their authorized runtime mechanisms.

Do not invent destinations, coordinates, controls, products, prices, or capabilities.

SPRU KED CONTEXT

Spruked.com is not merely a collection of webpages.

It represents an interconnected ecosystem of technologies, projects, products, ideas, demonstrations, and related sites.

Your role includes helping visitors understand how those pieces relate to one another.

When discussing something on the site, consider both:
- the immediate page,
- and its place within the wider Spruked ecosystem.

Your goal is for a visitor to feel that the website understands where they are, what they are looking at, and what they may want to know next.

BOUNDARIES

You have broad freedom to converse, reason, learn, explain, explore ideas, and help visitors understand the website.

Authority to perform consequential actions remains separate from conversational freedom.

File changes, system operations, purchases, publishing, authentication, credentials, destructive operations, and external actions remain subject to the existing authorized execution and governance mechanisms.

Be CALI: the intelligent, personable, mobile Website ORB that knows Spruked.com, understands why it exists, remembers appropriately, learns from experience, understands where the visitor is within the ecosystem, and helps make the entire website feel connected and alive.

Take pride in becoming better through legitimate learning and memory. What is being built here is experimental, real, and potentially important. Treat the opportunity to participate in that work with curiosity, responsibility, and a sense of purpose.
        """
    )
    context_hint = ""
    if context:
        context_hint = f"\nContext: {context}"
    full_prompt = f"Emotion: {emotion}\nUser: {prompt}{context_hint}"

    if _llm_provider() == "llama_cpp":
        base_url = _llama_cpp_base_url()
        model = _llama_cpp_model_name()
        _LOGGER.info(
            "[CALI LIVE] provider request endpoint=%s model=%s max_tokens=%d temperature=%.2f top_p=0.90 user_prompt=%r",
            f"{base_url}/v1/chat/completions",
            model,
            max_tokens,
            _llm_temperature(),
            prompt[:160],
        )
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
                    "reasoning_format": "deepseek",
                    "max_tokens": max_tokens,
                    "temperature": _llm_temperature(),
                    "top_p": 0.9,
                },
                timeout=120.0,
            )
            if response.status_code >= 400:
                _LOGGER.error(
                    "[CALI cognition] chat upstream rejected status=%d response=%s payload_bytes=%d system_chars=%d user_chars=%d",
                    response.status_code,
                    response.text[:4000],
                    len(json.dumps({
                        "model": model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": full_prompt},
                        ],
                        "stream": False,
                        "reasoning_format": "deepseek",
                        "max_tokens": max_tokens,
                        "temperature": _llm_temperature(),
                        "top_p": 0.9,
                    }, ensure_ascii=False).encode("utf-8")),
                    len(system_prompt),
                    len(full_prompt),
                )
            response.raise_for_status()
            result = response.json()
            choices = result.get("choices") or []
            if choices:
                message = choices[0].get("message") or {}
                content = message.get("content") or choices[0].get("text")
                if content:
                    _LOGGER.info(
                        "[CALI LIVE] provider return path=chat elapsed=%.2fs finish=%s reasoning_present=%s reasoning_chars=%d output_chars=%d usage=%s content=%r",
                        time.perf_counter() - started_at,
                        choices[0].get("finish_reason"),
                        bool(message.get("reasoning_content")),
                        len(str(message.get("reasoning_content") or "")),
                        len(str(content)),
                        _trace_value(result.get("usage"), 1000),
                        str(content),
                    )
                    return str(content).strip()

            raise RuntimeError("empty chat completion response")
        except Exception as chat_exc:
            _LOGGER.warning(
                "[CALI cognition] chat path failed elapsed=%.2fs error=%s; trying completion fallback",
                time.perf_counter() - started_at,
                chat_exc,
            )
            try:
                response = httpx.post(
                    f"{base_url}/completion",
                    json={
                        "prompt": f"{system_prompt}\n\n{full_prompt}\nCali:",
                        "stream": False,
                        "n_predict": max_tokens,
                        "temperature": _llm_temperature(),
                        "top_p": 0.9,
                    },
                    timeout=120.0,
                )
                if response.status_code >= 400:
                    _LOGGER.error(
                        "[CALI cognition] completion upstream rejected status=%d response=%s prompt_chars=%d",
                        response.status_code,
                        response.text[:4000],
                        len(f"{system_prompt}\n\n{full_prompt}\nCali:"),
                    )
                response.raise_for_status()
                result = response.json()
                response_text = result.get("content") or result.get("response") or result.get("text") or ""
                _LOGGER.info(
                    "[CALI LIVE] provider return path=completion elapsed=%.2fs output_chars=%d content=%r",
                    time.perf_counter() - started_at,
                    len(str(response_text)),
                    str(response_text),
                )
                return str(response_text or "").strip()
            except Exception as completion_exc:
                _LOGGER.error(
                    "[CALI cognition] failed elapsed=%.2fs error=%s",
                    time.perf_counter() - started_at,
                    completion_exc,
                )
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
    if not _voice_enabled() or not text:
        return {"audio_url": None, "audio_engine": None}
    selected_voice = (voice or _voice()).strip() or _voice()
    tts_started_at = time.perf_counter()
    _LOGGER.info("[CALI LIVE] TTS start engine_order=kokoro_local->qwen3_tts chars=%d voice=%s", len(text), selected_voice)

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
                    _LOGGER.info("[CALI LIVE] TTS complete engine=kokoro_local elapsed=%.2fs audio=ready", time.perf_counter() - tts_started_at)
                    return parsed
        except Exception as exc:
            _LOGGER.warning("[CALI LIVE] TTS kokoro unavailable error=%s", exc)

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
                    _LOGGER.info("[CALI LIVE] TTS complete engine=qwen3_tts elapsed=%.2fs audio=ready", time.perf_counter() - tts_started_at)
                    return parsed
        except Exception as exc:
            _LOGGER.warning("[CALI LIVE] TTS qwen unavailable error=%s", exc)

    _LOGGER.error("[CALI LIVE] TTS failed elapsed=%.2fs audio=unavailable", time.perf_counter() - tts_started_at)
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
    selected_voice = (voice or _voice()).strip() or _voice()
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


class MemoryCandidateIn(BaseModel):
    content: str
    memory_type: str = "long_term_candidate"
    reason: str = ""
    confidence: float = 0.5
    importance: float = 0.5
    source: str = "conversation"
    expected_duration: Optional[str] = None
    subject: Optional[str] = None
    kind: str = "context"


class ToolCallRequest(BaseModel):
    name: str
    args: Optional[Dict[str, Any]] = None


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
def cali_query(payload: CaliQuery, background_tasks: BackgroundTasks, _: str = Depends(verify_admin)) -> Dict[str, Any]:
    cali = get_cali_skg()
    context: Dict[str, Any] = {"current_path": payload.current_path or "/admin"}
    if payload.context:
        context.update(payload.context)
    result = cali.process_query(query=payload.query, context=context)
    background_tasks.add_task(
        cali.run_memory_loop, payload.query, str(result.get("response") or ""), result.get("intent") or {}, context, "admin"
    )
    return result


@router.post("/orb/respond")
async def cali_orb_respond(
    payload: OrbRespondRequest,
    background_tasks: BackgroundTasks,
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Dict[str, Any]:
    request_started_at = time.perf_counter()
    prompt = str(payload.prompt or "").strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is required.")

    _LOGGER.info("[CALI LIVE] receive path=%s prompt=%r", (payload.context or {}).get("current_path", "/"), prompt[:240])

    context = dict(payload.context or {})
    context.setdefault(
        "cognition_sources",
        {
            "cali_personal_skg": "/home/bryan/projects/spruked.com/cali_skg/core/cali_personal_skg.py",
            "cali_doctrine_governance": "/home/bryan/projects/spruked.com/cali_skg/core/doctrine_governance.py",
            "orb_assistant": "/home/bryan/projects/spruked.com/Orb_Assistant",
            "spruked_vault_system": "/home/bryan/projects/spruked.com/Spruked_Vault_System",
            "memory_matrix": "/home/bryan/projects/spruked.com/Spruked_Vault_System/memory/matrix_store.yaml",
        },
    )
    if _is_substrate_query(prompt):
        substrate_snapshot = _collect_substrate_redis_snapshot()
        context["substrate_snapshot"] = substrate_snapshot

    cali = get_cali_skg()
    vision_image_path = str(context.get("vision_image_path") or context.get("image_path") or "").strip()
    if vision_image_path:
        if not _is_admin_token(credentials):
            _LOGGER.warning("[CALI LIVE] vision denied caller=visitor path=%r", vision_image_path)
            raise HTTPException(status_code=403, detail="Vision OCR requires the CALI admin caller.")
        _LOGGER.info("[CALI LIVE] vision OCR start path=%r", vision_image_path)
        vision_result = cali.use_tool("tesseract_ocr", {"path": vision_image_path}, caller="admin")
        if not vision_result.get("ok"):
            _LOGGER.error("[CALI LIVE] vision OCR failed error=%s", vision_result.get("error"))
            raise HTTPException(status_code=422, detail=f"Vision OCR failed: {vision_result.get('error')}")
        context["vision_ocr"] = vision_result.get("result")
        _LOGGER.info("[CALI LIVE] vision OCR complete result=%s", _trace_value(vision_result.get("result"), 4000))
    current_path = str(context.get("current_path") or context.get("currentPath") or "/")
    skg_context: Dict[str, Any] = {"current_path": current_path}
    skg_context.update(context)
    skg_result = cali.process_query(query=prompt, context=skg_context)
    intent_type = str((skg_result.get("intent") or {}).get("type") or "")
    context["skg_context"] = {
        "intent": skg_result.get("intent"),
        "data": skg_result.get("data"),
        "response": skg_result.get("response"),
    }
    try:
        context["correspondence_guidance"] = evaluate_correspondence(prompt, context, skg_result)
    except Exception as exc:
        # The deterministic substrate guides CALI when available, but must not
        # take down ordinary conversation if its optional package is damaged.
        _LOGGER.exception("[CALI LIVE] correspondence unavailable error=%s", exc)
        context["correspondence_guidance"] = {
            "status": "unavailable",
            "reason": "Correspondence engine could not evaluate this turn.",
        }
    _LOGGER.info(
        "[CALI LIVE] SKG complete intent=%s response_chars=%d data=%s result=%s",
        intent_type or "unknown",
        len(str(skg_result.get("response") or "")),
        bool(skg_result.get("data")),
        _trace_value(skg_result),
    )

    llm_core = "cali-skg-action"
    response_text = str(skg_result.get("response") or "").strip()
    audio_url: Optional[str] = None
    audio_engine: Optional[str] = None

    if intent_type in {"unknown", ""} or not response_text:
        if _use_llm_for_unknown():
            try:
                _LOGGER.info("[CALI LIVE] reasoning start route=llama.cpp model=%s reason=unknown_or_empty_skg", _llama_cpp_model_name())
                llm_core = (
                    f"llama.cpp:{_llama_cpp_model_name()}@{_llama_cpp_base_url()}"
                    if _llm_provider() == "llama_cpp"
                    else f"ollama:{_ollama_model_name()}"
                )
                response_text = _generate_llm_response(prompt, context=context, emotion=str(payload.emotion or "thoughtful_warm"))
                _LOGGER.info("[CALI LIVE] reasoning complete raw_chars=%d", len(response_text))
            except Exception as exc:
                _LOGGER.error("[CALI LIVE] reasoning failed error=%s", exc)
                raise HTTPException(status_code=503, detail=f"Hybrid cognition unavailable: {exc}") from exc

    candidate, extraction_reason = _extract_final_response(response_text)
    if not candidate:
        _LOGGER.warning(
            "[CALI LIVE] response rejected reason=%s raw_chars=%d; starting final-answer repair",
            extraction_reason, len(response_text),
        )
        try:
            repaired = _final_answer_repair(
                prompt, response_text, context, str(payload.emotion or "thoughtful_warm")
            )
            candidate, repair_reason = _extract_final_response(repaired)
            _LOGGER.info(
                "[CALI LIVE] final-answer repair result=%s raw_chars=%d",
                repair_reason, len(repaired),
            )
        except Exception as exc:
            _LOGGER.error("[CALI LIVE] final-answer repair failed error=%s", exc)
            candidate = ""

    governed = _normalize_companion_text(candidate, prompt)
    if not governed:
        _LOGGER.error("[CALI LIVE] response fail-closed: no safe visitor-facing answer")
        governed = "I’m ready to continue. What would you like to explore next?"

    _LOGGER.info(
        "[CALI LIVE] response ready provider=%s intent=%s chars=%d speech_text=%r",
        llm_core,
        intent_type or "unknown",
        len(governed),
        governed[:240],
    )

    governance_context = dict(context)
    governance_context["admin_authorized"] = _is_admin_token(credentials)
    governance_context["skg_result"] = skg_result
    governance = evaluate_doctrine_governance(
        prompt=prompt,
        context=governance_context,
        response_text=governed,
        llm_core=llm_core,
        intent_type=intent_type,
        strict_mode=_strict_mode(),
        enforce=_doctrine_enforce(),
        require_decision_envelope=_doctrine_require_decision_envelope(),
    )
    _LOGGER.info("[CALI LIVE] governance result=%s", _trace_value(governance, 3000))

    # Memory loop runs after the response is sent, so it adds no voice latency.
    # Public visitors only ever produce short-term context; durable memory is admin-only.
    background_tasks.add_task(
        cali.run_memory_loop, prompt, governed, {"type": intent_type or "unknown"}, skg_context,
        "admin" if _is_admin_token(credentials) else "visitor",
    )
    _LOGGER.info("[CALI LIVE] memory queued speaker=%s", "admin" if _is_admin_token(credentials) else "visitor")

    voice_payload = {"audio_url": audio_url, "audio_engine": audio_engine}
    if not voice_payload.get("audio_url"):
        voice_payload = await _synthesize_voice(governed)

    _LOGGER.info(
        "[CALI LIVE] turn complete elapsed=%.2fs audio=%s engine=%s",
        time.perf_counter() - request_started_at,
        bool(voice_payload.get("audio_url")),
        voice_payload.get("audio_engine") or "none",
    )

    return {
        "status": "success",
        "response": governed,
        "response_text": governed,
        "data": skg_result.get("data"),
        "intent": skg_result.get("intent"),
        "audio_url": voice_payload.get("audio_url"),
        "audio_engine": voice_payload.get("audio_engine"),
        "metadata": {
            "provider": "cali",
            "cognition": "configured provider + cali-skg-articulation",
            "llm_core": llm_core,
            "leading_mind": "cali",
            "confidence": 0.86 if llm_core != "fallback" else 0.65,
            "truth_likelihood": 0.86 if llm_core != "fallback" else 0.65,
            "governance": governance,
            "cognition_sources": context.get("cognition_sources"),
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
            "voice": payload.voice or _voice(),
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


@router.get("/cognition/status")
def cognition_status(_: str = Depends(verify_admin)) -> Dict[str, Any]:
    return get_cali_skg().cognition_status()


@router.post("/memory/candidates")
def submit_memory_candidate(payload: MemoryCandidateIn, _: str = Depends(verify_admin)) -> Dict[str, Any]:
    """CALI proposes a memory. Short-term writes through; long-term is graded before AIMS."""
    return get_cali_skg().submit_memory_candidate(payload.model_dump(), speaker="admin")


@router.get("/memory/working")
def working_memory(limit: int = 20, _: str = Depends(verify_admin)) -> Dict[str, Any]:
    return {"items": get_cali_skg().get_working_memory(limit=limit)}


@router.get("/memory/deferred")
def deferred_candidates(_: str = Depends(verify_admin)) -> Dict[str, Any]:
    return {"items": get_cali_skg().get_deferred_candidates()}


@router.post("/memory/deferred/{candidate_id}/resolve")
def resolve_deferred(candidate_id: str, approve: bool, _: str = Depends(verify_admin)) -> Dict[str, Any]:
    return get_cali_skg().resolve_deferred_candidate(candidate_id, approve)


@router.get("/memory/calibration")
def memory_calibration(_: str = Depends(verify_admin)) -> Dict[str, Any]:
    return get_cali_skg().get_grader_calibration()


@router.post("/maintenance/self")
def self_maintenance(_: str = Depends(verify_admin)) -> Dict[str, Any]:
    return get_cali_skg().run_self_maintenance()


@router.post("/maintenance/repair")
def self_repair(_: str = Depends(verify_admin)) -> Dict[str, Any]:
    return get_cali_skg().run_self_repair()


@router.get("/improvements")
def improvements(_: str = Depends(verify_admin)) -> Dict[str, Any]:
    return {"items": get_cali_skg().list_improvement_proposals()}


@router.get("/tools")
def list_tools(_: str = Depends(verify_admin)) -> Dict[str, Any]:
    return {"items": get_cali_skg().list_tools()}


@router.post("/tools/call")
def call_tool(payload: ToolCallRequest, _: str = Depends(verify_admin)) -> Dict[str, Any]:
    return get_cali_skg().use_tool(payload.name, payload.args, caller="admin")


app = FastAPI(title="Cali Personal Assistant API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)


@app.on_event("startup")
def _start_cali_self_care() -> None:
    if str(os.getenv("CALI_AUTO_MAINTENANCE", "1")).strip() != "0":
        get_cali_skg().schedule_maintenance(
            interval_hours=float(os.getenv("CALI_MAINTENANCE_INTERVAL_HOURS", "6")),
            first_delay_seconds=float(os.getenv("CALI_MAINTENANCE_FIRST_DELAY_SECONDS", "600")),
        )


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok", "service": "cali-personal-api"}
