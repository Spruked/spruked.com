from __future__ import annotations

from typing import Any, Dict, Optional

DOCTRINE_CANONICAL_VERSION = "DOCTRINE_v1.0+B+C+D"
DOCTRINE_RATIFIED_DATE = "2026-03-05"
DOCTRINE_STATUS = "SEALED / IMMUTABLE"
DOCTRINE_CANONICAL_SHA256 = "b601457ace7f0639f790ec8f573bc343363d19f6e53291f3ab04e5e97a2b8c4e"
DOCTRINE_FILE_BUNDLE_SHA256 = "27c7bfa71574f3b381bf4db860c44b9fd2daa3b414bf932078524b4b0d020747"
DOCTRINE_ALLOWED_HASHES = {
    DOCTRINE_CANONICAL_SHA256,
    DOCTRINE_FILE_BUNDLE_SHA256,
}

DDR_HEALTHY_THRESHOLD = 0.8
DDR_CAUTION_THRESHOLD = 0.5


def _as_float(value: Any, default: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _estimate_observed_tension(prompt: str, response_text: str, llm_core: str, intent_type: str) -> float:
    combined = f"{prompt} {response_text}".lower()
    tension = 0.62

    if llm_core.startswith("ollama:"):
        tension -= 0.03
    if llm_core == "kaygee-fallback":
        tension += 0.02
    if any(term in combined for term in ("vs", "versus", "tradeoff", "risk", "uncertain", "dilemma")):
        tension += 0.1
    if intent_type in {"unknown", ""}:
        tension -= 0.05

    return _clamp(tension, 0.05, 1.5)


def _ddr_state(ddr_value: float) -> str:
    if ddr_value > DDR_HEALTHY_THRESHOLD:
        return "healthy"
    if ddr_value > DDR_CAUTION_THRESHOLD:
        return "caution"
    return "critical"


def evaluate_doctrine_governance(
    *,
    prompt: str,
    context: Dict[str, Any],
    response_text: str,
    llm_core: str,
    intent_type: str,
    strict_mode: bool,
    enforce: bool,
    require_decision_envelope: bool,
) -> Dict[str, Any]:
    governance_context = context.get("governance") if isinstance(context, dict) else None
    if not isinstance(governance_context, dict):
        governance_context = {}

    llm_plugged = llm_core not in {"fast-path", "cali-skg-action"}
    provided_hash = str(
        governance_context.get("doctrine_sha256")
        or governance_context.get("canonical_hash")
        or governance_context.get("doctrine_hash")
        or ""
    ).strip().lower()
    hash_in_use = provided_hash or DOCTRINE_CANONICAL_SHA256
    hash_match = (not provided_hash) or (provided_hash in DOCTRINE_ALLOWED_HASHES)

    observed = _as_float(
        governance_context.get("observed_tension"),
        _estimate_observed_tension(prompt, response_text, llm_core, intent_type),
    )
    expected = _as_float(governance_context.get("expected_tension_under_independence"), 0.72)
    expected = max(0.01, expected)
    ddr_value = observed / expected
    ddr_state = _ddr_state(ddr_value)

    override_id = str(governance_context.get("article_viii_override_id") or "").strip() or None
    decision_envelope_hash = str(
        governance_context.get("decision_envelope_hash")
        or context.get("decision_envelope_hash")
        or ""
    ).strip()
    decision_envelope_hash = decision_envelope_hash or None

    critical_alerts: list[str] = []
    reasons: list[str] = []

    if not hash_match:
        critical_alerts.append("DOCTRINE HASH MISMATCH")
        reasons.append("Provided doctrine hash is not in canonical allow-list.")

    if ddr_state == "critical":
        critical_alerts.append("DOCTRINE DRIFT: Lenses no longer independent")
        if not override_id:
            reasons.append("DDR is critical and no Article VIII override was provided.")

    if llm_plugged and require_decision_envelope and not decision_envelope_hash:
        reasons.append("DecisionEnvelope hash is required when an LLM is plugged into ORB.")

    if strict_mode and llm_plugged and ddr_state == "caution" and not override_id:
        reasons.append("Strict mode requires override or remediation when DDR is in caution range.")

    compliant = (not enforce) or (len(reasons) == 0)
    trust_state = "trusted" if compliant else "degraded"
    block = bool(enforce and reasons and (strict_mode or llm_plugged))

    return {
        "canonical_version": DOCTRINE_CANONICAL_VERSION,
        "ratified": DOCTRINE_RATIFIED_DATE,
        "status": DOCTRINE_STATUS,
        "doctrine_sha256": DOCTRINE_CANONICAL_SHA256,
        "file_bundle_sha256": DOCTRINE_FILE_BUNDLE_SHA256,
        "hash_in_use": hash_in_use,
        "hash_match": hash_match,
        "llm_plugged": llm_plugged,
        "mcp_required": False,
        "decision_envelope_hash": decision_envelope_hash,
        "article_viii_override_id": override_id,
        "ddr": {
            "formula": "observed_tension / expected_tension_under_independence",
            "observed_tension": round(observed, 6),
            "expected_tension_under_independence": round(expected, 6),
            "value": round(ddr_value, 6),
            "state": ddr_state,
            "thresholds": {
                "healthy_gt": DDR_HEALTHY_THRESHOLD,
                "caution_gt": DDR_CAUTION_THRESHOLD,
            },
        },
        "critical_alerts": critical_alerts,
        "compliant": compliant,
        "trust_state": trust_state,
        "enforcement": {
            "enabled": enforce,
            "strict_mode": strict_mode,
            "require_decision_envelope": require_decision_envelope,
            "block": block,
            "reasons": reasons,
        },
    }
