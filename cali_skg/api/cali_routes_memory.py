"""Memory-aware CALI API wrapper.

This module preserves the existing CALI API/router implementation and wraps only
the LLM context assembly point. The existing route handlers continue to execute;
prior-conversation recall and SeedVault reasoning context are injected before the
existing provider call.
"""
from __future__ import annotations

import logging
import os
import threading
from typing import Any, Dict

from cali_skg.api import cali_routes as _legacy
from cali_skg.core.cali_unified_substrate import get_unified_substrate

_LOG = logging.getLogger("cali.memory")
_ORIGINAL_GENERATE = _legacy._generate_llm_response
_BOOTSTRAP_LOCK = threading.Lock()
_BOOTSTRAPPED = False


def _memory_enabled() -> bool:
    return str(os.getenv("CALI_UNIFIED_MEMORY_ENABLED", "1")).strip() != "0"


def _bootstrap_enabled() -> bool:
    return str(os.getenv("CALI_UNIFIED_MEMORY_BOOTSTRAP", "1")).strip() != "0"


def _ensure_substrate_ready() -> None:
    global _BOOTSTRAPPED
    if _BOOTSTRAPPED or not _memory_enabled():
        return
    with _BOOTSTRAP_LOCK:
        if _BOOTSTRAPPED:
            return
        substrate = get_unified_substrate()
        if _bootstrap_enabled():
            try:
                status = substrate.ensure_ready()
                _LOG.info(
                    "[CALI memory] ready conversations=%s seeds=%s assets=%s",
                    status.get("conversation_segments"),
                    status.get("seed_entries"),
                    status.get("assets"),
                )
            except Exception:
                _LOG.exception("[CALI memory] substrate bootstrap failed; continuing without inherited recall")
        _BOOTSTRAPPED = True


def _memory_aware_generate_llm_response(
    prompt: str,
    context: Dict[str, Any],
    emotion: str,
) -> str:
    if not _memory_enabled():
        return _ORIGINAL_GENERATE(prompt, context, emotion)

    _ensure_substrate_ready()
    enriched_context: Dict[str, Any] = dict(context or {})
    try:
        memory_context = get_unified_substrate().build_llm_context(prompt)
        if memory_context.get("prior_conversations") or memory_context.get("reasoning_options"):
            enriched_context["cali_inherited_context"] = memory_context
    except Exception:
        _LOG.exception("[CALI memory] retrieval failed; continuing with existing context")

    return _ORIGINAL_GENERATE(prompt, enriched_context, emotion)


# Existing route functions resolve this module-global function dynamically from
# cali_routes, so replacing it here upgrades the existing endpoints without
# duplicating or forking the 50 KB route implementation.
_legacy._generate_llm_response = _memory_aware_generate_llm_response

app = _legacy.app
router = _legacy.router

__all__ = ["app", "router"]
