"""CALI adapter for the deterministic Correspondence/AUI engine.

The engine remains the authority for correspondence geometry, TPC beams,
Fifth Mind, Tribunal, and escalation. This adapter only translates CALI's
retrieved evidence into the engine's frozen EvidenceItem schema and returns a
compact, provenance-aware guidance object for synthesis and governance.
"""

from __future__ import annotations

import json
import logging
import threading
from datetime import datetime
from typing import Any, Dict, Iterable

_LOGGER = logging.getLogger("cali.correspondence")
_ENGINE: Any = None
_LOCK = threading.RLock()


def _get_engine() -> Any:
    global _ENGINE
    if _ENGINE is None:
        from Spruked_Vault_System.correspondence_engine import AUIEngine
        _ENGINE = AUIEngine()
    return _ENGINE


def _render(value: Any, limit: int = 1200) -> str:
    if isinstance(value, str):
        text = value
    else:
        try:
            text = json.dumps(value, ensure_ascii=False, default=str)
        except Exception:
            text = repr(value)
    return text[:limit]


def _evidence(claim: str, source: str, *, confidence: float, degradation: float,
              dimension: str, caveats: Iterable[str] = ()) -> EvidenceItem:
    from Spruked_Vault_System.correspondence_engine import EvidenceItem

    return EvidenceItem(
        claim=_render(claim),
        source=source,
        confidence=max(0.0, min(1.0, confidence)),
        degradation_signal=max(0.0, min(1.0, degradation)),
        timestamp=datetime.utcnow(),
        supports_dimension=dimension,
        caveats=list(caveats),
    )


def evaluate_correspondence(prompt: str, context: Dict[str, Any], skg_result: Dict[str, Any]) -> Dict[str, Any]:
    """Run one deterministic correspondence judgment for a CALI turn."""
    evidence: list[EvidenceItem] = [
        _evidence(
            prompt,
            "orb.prompt",
            confidence=0.72,
            degradation=0.35,
            dimension="purpose",
            caveats=("Visitor input expresses intent but is not proof of external facts.",),
        )
    ]

    if skg_result.get("response") or skg_result.get("data"):
        evidence.append(_evidence(
            {"response": skg_result.get("response"), "data": skg_result.get("data"), "intent": skg_result.get("intent")},
            "cali.skg",
            confidence=0.78,
            degradation=0.25,
            dimension="representation",
            caveats=("SKG output is structured context and must retain its provenance.",),
        ))

    if context.get("current_path") or context.get("current_page"):
        evidence.append(_evidence(
            {"current_path": context.get("current_path"), "current_page": context.get("current_page")},
            "website.current_context",
            confidence=0.82,
            degradation=0.2,
            dimension="reality",
        ))

    if context.get("vision_ocr"):
        evidence.append(_evidence(
            context["vision_ocr"],
            "orb.vision.tesseract",
            confidence=0.68,
            degradation=0.42,
            dimension="representation",
            caveats=("OCR is an observation and may contain recognition errors.",),
        ))

    for key, source, dimension in (
        ("prior_conversations", "cali.prior_conversation_memory", "continuity"),
        ("domain_knowledge", "cali.domain_knowledge", "reality"),
        ("reasoning_options", "cali.seedvault_framework", "purpose"),
    ):
        if context.get(key):
            evidence.append(_evidence(
                context[key], source, confidence=0.62, degradation=0.48, dimension=dimension,
                caveats=("Retrieved substrate is contextual evidence, not automatically current truth.",),
            ))

    engine = _get_engine()
    with _LOCK:
        judgment = engine.query(evidence)
        atom = engine.vault.atoms[next(reversed(engine.vault.atoms))]

    vector = atom.correspondence_vector
    guidance = {
        "status": "escalation_required" if judgment.action == "escalate_to_ecm" else "guided",
        "verdict": judgment.final_verdict,
        "action": judgment.action,
        "confidence": round(judgment.confidence, 6),
        "correspondence_vector": {
            "reality": round(vector.reality, 6),
            "representation": round(vector.representation, 6),
            "purpose": round(vector.purpose, 6),
            "personhood": round(vector.personhood, 6),
            "continuity": round(vector.continuity, 6),
        },
        "beam_breakdown": judgment.beam_breakdown,
        "fifth_mind": judgment.fifth_mind_assessment,
        "reasoning_summary": judgment.reasoning,
        "evidence_sources": [item.source for item in evidence],
        "atom_id": atom.atom_id,
        "consequential_execution": "requires separate authorization",
    }
    _LOGGER.info(
        "[CALI LIVE] correspondence verdict=%s action=%s confidence=%.3f atom=%s sources=%s",
        guidance["verdict"], guidance["action"], guidance["confidence"], atom.atom_id, guidance["evidence_sources"],
    )
    return guidance
