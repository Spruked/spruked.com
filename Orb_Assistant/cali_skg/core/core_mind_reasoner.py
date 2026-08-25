"""Core four-mind reasoner backed by CALI SKG JSON mind files."""

from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List

from cali_skg.core.core_vaults import CoreVaults


def _tokens(value: str) -> set[str]:
    return {token for token in re.findall(r"[a-z0-9]+", value.lower()) if len(token) > 2}


def _flatten_text(value: Any) -> str:
    if isinstance(value, dict):
        return " ".join(_flatten_text(item) for item in value.values())
    if isinstance(value, list):
        return " ".join(_flatten_text(item) for item in value)
    return str(value or "")


class CoreMindReasoner:
    def __init__(self, root: Path | None = None):
        self.root = root or Path(__file__).resolve().parent / "core_4_minds"
        self.minds = self._load_minds()
        self.vaults = CoreVaults()
        self.vaults.seed_apriori_from_minds(self.minds)

    def _load_minds(self) -> List[Dict[str, Any]]:
        minds: List[Dict[str, Any]] = []
        for file_path in sorted(self.root.glob("*/*_skg.json")):
            payload = json.loads(file_path.read_text(encoding="utf-8"))
            metadata = payload.get("skg_metadata", {})
            philosopher = str(metadata.get("philosopher") or file_path.parent.name).strip()
            concepts = payload.get("concept_nodes") if isinstance(payload.get("concept_nodes"), list) else []
            rules = payload.get("reasoning_rules") if isinstance(payload.get("reasoning_rules"), list) else []
            corpus = " ".join(
                [
                    _flatten_text(metadata),
                    _flatten_text(payload.get("core_axiom", {})),
                    _flatten_text(concepts),
                    _flatten_text(rules),
                ]
            )
            minds.append(
                {
                    "id": str(metadata.get("space_field_id") or file_path.stem),
                    "philosopher": philosopher,
                    "system": str(metadata.get("system") or ""),
                    "path": str(file_path),
                    "tokens": _tokens(corpus),
                    "concepts": concepts,
                    "rules": rules,
                    "core_axiom": payload.get("core_axiom", {}),
                }
            )
        return minds

    def reason(self, prompt: str) -> Dict[str, Any]:
        prompt_tokens = _tokens(prompt)
        if not prompt_tokens:
            return {
                "source": "cali_skg.core.core_4_minds",
                "leading_mind": "cali",
                "mind_scores": [],
                "matched_concepts": [],
                "advisory": "No prompt tokens available for core mind routing.",
            }

        scored: List[Dict[str, Any]] = []
        for mind in self.minds:
            overlap = sorted(prompt_tokens & mind["tokens"])
            score = len(overlap) / max(1, len(prompt_tokens))
            matched_concepts = []
            for concept in mind["concepts"][:24]:
                concept_text = _flatten_text(concept)
                concept_overlap = sorted(prompt_tokens & _tokens(concept_text))
                if concept_overlap:
                    matched_concepts.append(
                        {
                            "label": str(concept.get("label") or concept.get("node_id") or "concept"),
                            "overlap": concept_overlap[:8],
                        }
                    )
            scored.append(
                {
                    "mind": mind["philosopher"],
                    "mind_id": mind["id"],
                    "system": mind["system"],
                    "score": round(score, 4),
                    "overlap": overlap[:12],
                    "matched_concepts": matched_concepts[:5],
                }
            )

        scored.sort(key=lambda item: item["score"], reverse=True)
        leading = scored[0] if scored else {"mind": "cali", "score": 0}
        matched = leading.get("matched_concepts", [])
        vault_context = self.vaults.recall(prompt)
        return {
            "source": "cali_skg.core.core_4_minds",
            "leading_mind": leading.get("mind", "cali"),
            "mind_scores": scored,
            "matched_concepts": matched,
            "vault_context": vault_context,
            "advisory": (
                f"{leading.get('mind', 'CALI')} is the leading core mind for this prompt."
                if leading.get("score", 0) > 0
                else "No dominant philosopher mind matched; CALI should continue with general reasoning."
            ),
        }


@lru_cache(maxsize=1)
def get_core_mind_reasoner() -> CoreMindReasoner:
    return CoreMindReasoner()
