"""CALI research/tool manifest registry.

The registry is deliberately separate from memory. It describes live external
capabilities CALI may use to obtain current evidence. Manifests can be dropped
into cali_skg/substrate/tool_manifests without changing the LLM or memory schema.
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class ToolManifestEntry:
    tool_id: str
    domain: str
    purpose: str
    manifest_path: str
    enabled: bool
    auto_allowed: bool
    auth_type: str | None
    base_url: str | None
    raw: dict[str, Any]


class ToolManifestRegistry:
    def __init__(self, base_path: str | Path | None = None) -> None:
        self.base_path = Path(base_path or Path(__file__).resolve().parents[1])
        configured = os.getenv("CALI_TOOL_MANIFEST_DIR", "").strip()
        self.manifest_dir = Path(configured) if configured else self.base_path / "substrate" / "tool_manifests"
        self.manifest_dir.mkdir(parents=True, exist_ok=True)
        self._entries: dict[str, ToolManifestEntry] = {}
        self.reload()

    def reload(self) -> int:
        entries: dict[str, ToolManifestEntry] = {}
        for path in sorted(self.manifest_dir.rglob("*.json")):
            try:
                payload = json.loads(path.read_text(encoding="utf-8"))
            except Exception:
                continue
            for item in self._normalize_payload(payload, path):
                entries[item.tool_id] = item
        self._entries = entries
        return len(entries)

    def _normalize_payload(self, payload: Any, path: Path) -> list[ToolManifestEntry]:
        if isinstance(payload, dict) and isinstance(payload.get("apis"), list):
            raw_entries = payload["apis"]
        elif isinstance(payload, dict) and isinstance(payload.get("tools"), list):
            raw_entries = payload["tools"]
        elif isinstance(payload, list):
            raw_entries = payload
        elif isinstance(payload, dict):
            raw_entries = [payload]
        else:
            return []

        result: list[ToolManifestEntry] = []
        for idx, raw in enumerate(raw_entries):
            if not isinstance(raw, dict):
                continue
            tool_id = str(raw.get("id") or raw.get("tool_id") or raw.get("name") or f"{path.stem}:{idx}").strip()
            if not tool_id:
                continue
            permissions = raw.get("permissions") if isinstance(raw.get("permissions"), dict) else {}
            enabled = bool(raw.get("enabled", True))
            auto_allowed = bool(raw.get("auto_allowed", permissions.get("auto_allowed", False)))
            result.append(
                ToolManifestEntry(
                    tool_id=tool_id,
                    domain=str(raw.get("domain") or raw.get("category") or "general"),
                    purpose=str(raw.get("purpose") or raw.get("description") or ""),
                    manifest_path=str(path),
                    enabled=enabled,
                    auto_allowed=auto_allowed,
                    auth_type=(str(raw.get("auth_type")) if raw.get("auth_type") is not None else None),
                    base_url=(str(raw.get("base_url")) if raw.get("base_url") is not None else None),
                    raw=raw,
                )
            )
        return result

    def list_tools(self, *, domain: str | None = None, enabled_only: bool = True) -> list[dict[str, Any]]:
        items = []
        for entry in self._entries.values():
            if enabled_only and not entry.enabled:
                continue
            if domain and entry.domain.lower() != domain.lower():
                continue
            items.append(
                {
                    "id": entry.tool_id,
                    "domain": entry.domain,
                    "purpose": entry.purpose,
                    "enabled": entry.enabled,
                    "auto_allowed": entry.auto_allowed,
                    "auth_type": entry.auth_type,
                    "base_url": entry.base_url,
                    "manifest_path": entry.manifest_path,
                }
            )
        return sorted(items, key=lambda item: (item["domain"], item["id"]))

    def find(self, query: str, *, limit: int = 8) -> list[dict[str, Any]]:
        terms = [term for term in str(query or "").lower().split() if len(term) >= 3]
        scored: list[tuple[int, ToolManifestEntry]] = []
        for entry in self._entries.values():
            if not entry.enabled:
                continue
            haystack = f"{entry.tool_id} {entry.domain} {entry.purpose}".lower()
            score = sum(1 for term in terms if term in haystack)
            if score:
                scored.append((score, entry))
        scored.sort(key=lambda pair: (-pair[0], pair[1].tool_id))
        return [
            {
                "id": entry.tool_id,
                "domain": entry.domain,
                "purpose": entry.purpose,
                "auto_allowed": entry.auto_allowed,
                "auth_type": entry.auth_type,
                "base_url": entry.base_url,
            }
            for _, entry in scored[: max(1, min(limit, 20))]
        ]


_INSTANCE: ToolManifestRegistry | None = None


def get_tool_manifest_registry() -> ToolManifestRegistry:
    global _INSTANCE
    if _INSTANCE is None:
        _INSTANCE = ToolManifestRegistry()
    return _INSTANCE
