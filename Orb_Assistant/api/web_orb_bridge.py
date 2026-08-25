#!/usr/bin/env python3
"""One-shot web bridge for the website ORB instance."""

from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List


PROJECT_ROOT = Path(__file__).resolve().parent.parent
SITE_ROOT = PROJECT_ROOT.parent
if str(SITE_ROOT) not in sys.path:
    sys.path.append(str(SITE_ROOT))

os.environ.setdefault("ORB_INSTANCE_ID", "web")
os.environ.setdefault("ORB_SYSTEM_ROOT", str(SITE_ROOT / ".orb-web-runtime"))
os.environ.setdefault("ORB_SHARED_MESH_ROOT", "/mnt/r/orb_mesh")
os.environ.setdefault("CP3_ROOT", os.environ.get("ACP3_ROOT", "/mnt/r/cochlear_processor_3.0"))
os.environ.setdefault("ACP3_ROOT", os.environ.get("CP3_ROOT", "/mnt/r/cochlear_processor_3.0"))

from cali_skg.core.orb_cognition_skg import CALISKG  # noqa: E402


def normalize_mind_name(name: str) -> str:
    lowered = str(name or "").lower()
    if "locke" in lowered:
        return "locke"
    if "hume" in lowered:
        return "hume"
    if "kant" in lowered:
        return "kant"
    if "spinoza" in lowered:
        return "spinoza"
    if "inductive" in lowered:
        return "inductive"
    if "deductive" in lowered:
        return "deductive"
    if "intuitive" in lowered:
        return "intuitive"
    return "cali"


def leading_reasoner(reasoning: List[Dict[str, Any]], weights: List[float]) -> str:
    if not reasoning:
        return "cali"

    if weights:
        try:
            best_index = max(range(len(weights)), key=lambda index: weights[index])
            return normalize_mind_name(reasoning[best_index].get("philosopher", "cali"))
        except Exception:
            pass

    return normalize_mind_name(reasoning[0].get("philosopher", "cali"))


def make_query_response(cali: CALISKG, result: Dict[str, Any], emotion: str) -> Dict[str, Any]:
    _ = emotion
    advisory = result.get("advisory_verdict", {})
    reasoning = result.get("philosophical_reasoning", [])
    weights = advisory.get("weights", []) or []
    response_text = result.get("recommended_response", "")
    lead = leading_reasoner(reasoning, weights)

    return {
        "status": "success",
        "response": response_text,
        "metadata": {
            "leading_mind": lead,
            "confidence": advisory.get("confidence", 0.0),
            "truth_likelihood": advisory.get("truth_likelihood", 0.0),
            "tension_detected": advisory.get("tension_detected", False),
            "outlier_count": advisory.get("outlier_count", 0),
            "weights": weights,
            "instance_id": cali.instance_id,
            "shared_mesh_root": cali.shared_mesh_root,
            "voice_ready": False,
        },
        "advisory": advisory,
        "reasoning": reasoning,
        "voice": {
            "engine": "kokoro",
            "profile": "am_echo",
            "audio_url": None,
            "mode": "text-only-bridge",
        },
        "timestamp": result.get("timestamp"),
    }


def make_research_response(cali: CALISKG, result: Dict[str, Any], emotion: str) -> Dict[str, Any]:
    _ = emotion
    voice_text = result.get("voice_response", "")
    synthesis = result.get("research_synthesis", {})

    return {
        "status": "success",
        "response": voice_text,
        "metadata": {
            "instance_id": cali.instance_id,
            "shared_mesh_root": cali.shared_mesh_root,
            "domains": result.get("domains", []),
            "successful_returns": synthesis.get("successful_returns", 0),
            "confidence_aggregate": synthesis.get("confidence_aggregate", 0.0),
            "voice_ready": False,
        },
        "research": result,
        "voice": {
            "engine": "kokoro",
            "profile": "am_echo",
            "audio_url": None,
            "mode": "text-only-bridge",
        },
        "timestamp": result.get("timestamp"),
    }


def make_status_response(cali: CALISKG) -> Dict[str, Any]:
    status = cali.get_status()
    return {
        "status": "success",
        "response": "Website ORB status available.",
        "metadata": {
            "instance_id": cali.instance_id,
            "shared_mesh_root": cali.shared_mesh_root,
        },
        "orb_status": status,
    }


def make_speak_response(cali: CALISKG, text: str, emotion: str) -> Dict[str, Any]:
    _ = cali, emotion
    return {
        "status": "success",
        "response": text,
        "metadata": {
            "emotion": emotion,
            "voice_ready": False,
        },
        "voice": {
            "engine": "kokoro",
            "profile": "am_echo",
            "audio_url": None,
            "mode": "text-only-bridge",
        },
    }


async def handle_command(cali: CALISKG, command: Dict[str, Any]) -> Dict[str, Any]:
    action = str(command.get("action") or "query").strip().lower()
    emotion = str(command.get("emotion") or "thoughtful_warm").strip() or "thoughtful_warm"

    if action == "query":
        prompt = str(command.get("prompt") or command.get("text") or "").strip()
        context = command.get("context") or {}
        result = cali.reason(prompt, context)
        return make_query_response(cali, result, emotion)

    if action == "research":
        query = str(command.get("query") or command.get("prompt") or "").strip()
        domains = command.get("domains") or None
        result = await cali.research(query, domains)
        return make_research_response(cali, result, emotion)

    if action == "speak":
        text = str(command.get("text") or command.get("prompt") or "").strip()
        return make_speak_response(cali, text, emotion)

    if action == "status":
        return make_status_response(cali)

    raise ValueError(f"Unsupported action: {action}")


def read_stdin_json() -> Dict[str, Any]:
    raw = sys.stdin.read().strip()
    if not raw:
        raise ValueError("No command payload received on stdin")
    return json.loads(raw)


def main() -> int:
    cali = CALISKG(Path(os.environ["ORB_SYSTEM_ROOT"]))
    try:
        command = read_stdin_json()
        response = asyncio.run(handle_command(cali, command))
        print(json.dumps(response))
        return 0
    except Exception as exc:  # pragma: no cover - bridge error path
        error_payload = {"status": "error", "message": str(exc)}
        print(json.dumps(error_payload))
        return 1
    finally:
        try:
            if cali.swarm.session is not None:
                asyncio.run(cali.swarm.close())
        except Exception:
            pass
        try:
            cali.patterns_db.close()
        except Exception:
            pass


if __name__ == "__main__":
    raise SystemExit(main())
