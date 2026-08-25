"""CALI core vault adapter for a priori and a posteriori memory."""

from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _tokens(value: str) -> set[str]:
    return {token for token in re.findall(r"[a-z0-9]+", value.lower()) if len(token) > 2}


def _flatten(value: Any) -> str:
    if isinstance(value, dict):
        return " ".join(_flatten(item) for item in value.values())
    if isinstance(value, list):
        return " ".join(_flatten(item) for item in value)
    return str(value or "")


class CoreVaults:
    def __init__(self, cali_system_root: Path | None = None, vault_system_root: Path | None = None):
        repo_root = _repo_root()
        self.cali_system_root = cali_system_root or repo_root / "Orb_Assistant" / "CALI_System"
        self.memory_root = self.cali_system_root / "memory"
        self.a_priori_file = self.memory_root / "a_priori" / "vault.jsonl"
        self.a_posteriori_file = self.memory_root / "a_posteriori" / "vault.jsonl"
        self.vault_system_root = vault_system_root or repo_root / "Orb_Assistant" / "vault_system"
        self.posteriori_object_root = self.vault_system_root / "posteriori"
        for path in [self.a_priori_file.parent, self.a_posteriori_file.parent, self.posteriori_object_root]:
            path.mkdir(parents=True, exist_ok=True)

    def _hash(self, payload: Dict[str, Any]) -> str:
        return hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()

    def _append_jsonl(self, file_path: Path, payload: Dict[str, Any]) -> None:
        file_path.parent.mkdir(parents=True, exist_ok=True)
        with file_path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(payload) + "\n")

    def _read_jsonl(self, file_path: Path) -> List[Dict[str, Any]]:
        if not file_path.exists():
            return []
        entries: List[Dict[str, Any]] = []
        for line in file_path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            try:
                data = json.loads(line)
                if isinstance(data, dict):
                    entries.append(data)
            except json.JSONDecodeError:
                continue
        return entries

    def seed_apriori_from_minds(self, minds: Iterable[Dict[str, Any]]) -> None:
        existing = self._read_jsonl(self.a_priori_file)
        existing_ids = {str(item.get("hash_id") or item.get("id") or "") for item in existing}
        for mind in minds:
            content = {
                "kind": "core_mind_axiom",
                "mind": mind.get("philosopher"),
                "mind_id": mind.get("id"),
                "system": mind.get("system"),
                "core_axiom": mind.get("core_axiom", {}),
                "source": mind.get("path"),
            }
            hash_id = self._hash(content)[:16]
            if hash_id in existing_ids:
                continue
            self._append_jsonl(
                self.a_priori_file,
                {
                    "timestamp": datetime.utcnow().isoformat(),
                    "category": "a_priori_core_mind",
                    "content": content,
                    "hash_id": hash_id,
                    "confidence": 1.0,
                    "source": "core_4_minds",
                    "mutability": "immutable",
                },
            )
            existing_ids.add(hash_id)

    def recall(self, prompt: str, limit: int = 5) -> Dict[str, Any]:
        prompt_tokens = _tokens(prompt)

        def score(entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
            ranked = []
            for entry in entries:
                text = _flatten(entry.get("content", entry))
                overlap = sorted(prompt_tokens & _tokens(text))
                if not overlap:
                    continue
                ranked.append(
                    {
                        "hash_id": entry.get("hash_id"),
                        "category": entry.get("category"),
                        "source": entry.get("source"),
                        "confidence": entry.get("confidence"),
                        "overlap": overlap[:10],
                        "content": entry.get("content", {}),
                        "score": len(overlap) / max(1, len(prompt_tokens)),
                    }
                )
            ranked.sort(key=lambda item: item["score"], reverse=True)
            return ranked[:limit]

        return {
            "a_priori": score(self._read_jsonl(self.a_priori_file)),
            "a_posteriori": score(self._read_jsonl(self.a_posteriori_file)),
            "paths": {
                "a_priori": str(self.a_priori_file),
                "a_posteriori": str(self.a_posteriori_file),
                "posteriori_objects": str(self.posteriori_object_root),
            },
        }

    def append_posteriori(self, content: Dict[str, Any], confidence: float = 0.86, source: str = "website_orb") -> Dict[str, Any]:
        hash_id = self._hash(content)
        record = {
            "timestamp": datetime.utcnow().isoformat(),
            "category": "orb_exchange",
            "content": content,
            "hash_id": hash_id[:16],
            "confidence": confidence,
            "source": source,
            "mutability": "append_only",
        }
        self._append_jsonl(self.a_posteriori_file, record)
        object_path = self.posteriori_object_root / f"{hash_id}.json"
        object_path.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
        return {
            "recorded": True,
            "hash_id": record["hash_id"],
            "paths": [str(self.a_posteriori_file), str(object_path)],
        }
