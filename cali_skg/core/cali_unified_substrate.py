"""Unified CALI substrate and autobiographical-memory index.

This module turns CALI's inherited SeedVaults, historical conversation vaults,
legacy state, evidence packets, and domain knowledge into a local, low-latency
runtime substrate. The source archive remains authoritative and read-only;
local copies are operational mirrors.

Historical conversation material is indexed as *prior conversation memory*.
It is evidence of what Bryan and CALI previously discussed, not an assertion
that every historical statement remains currently true.
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import shutil
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

_LOG = logging.getLogger("cali.substrate")

DEFAULT_LEGACY_SOURCE = Path(
    "/home/bryan/projects/spruked.com/Spruked_Vault_System/cali_legacy/spruk_legacy_orb"
)
DEFAULT_SEED_VAULT_SOURCE = Path(
    "/home/bryan/projects/spruked.com/Spruked_Vault_System/seed_vault"
)
DEFAULT_DOMAIN_KNOWLEDGE_SOURCE = Path(
    "/home/bryan/projects/spruked.com/Spruked_Vault_System/Domain_Knowledge"
)
DEFAULT_PHILOSOPHICAL_VAULT_SOURCE = Path(
    "/home/bryan/projects/spruked.com/Spruked_Vault_System/philosophical_vaults"
)
_TOKEN_RE = re.compile(r"[A-Za-z0-9_'-]{3,}")


@dataclass(frozen=True)
class AssetSpec:
    source_name: str
    target: str
    asset_class: str
    ingest: str = "preserve"
    canonical: bool = True
    source_root: str = "legacy"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _json_load(path: Path) -> Any:
    text = path.read_text(encoding="utf-8")
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Several inherited vaults are JSON-with-comments and/or retain a
        # trailing comma from their authoring tools. Keep the source untouched
        # and normalize only the in-memory parser input.
        text = re.sub(r"(?m)^\s*//.*$", "", text)
        text = re.sub(r"(?m)\s+//[^\n\r]*$", "", text)
        text = re.sub(r",(\s*[}\]])", r"\1", text)
        return json.loads(text)


def _tokens(text: str, limit: int = 16) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for token in _TOKEN_RE.findall(str(text or "").lower()):
        if token in seen:
            continue
        seen.add(token)
        result.append(token)
        if len(result) >= limit:
            break
    return result


def _default_assets() -> list[AssetSpec]:
    assets: list[AssetSpec] = [
        AssetSpec("cali_voice.pt", "assets/voice/cali_voice.pt", "identity_voice"),
        AssetSpec("gpt_seed_vault2.json", "substrate/behavioral/gpt_seed_vault.json", "behavioral_seed", "seed_vault"),
        AssetSpec("gpt4_parsed_seed.json", "substrate/archive/duplicates/gpt4_parsed_seed.json", "behavioral_seed_duplicate", canonical=False),
        AssetSpec("tone_anchor_map.json", "substrate/behavioral/tone_anchor_map.json", "tone_anchor"),
    ]

    for name in (
        "math", "philosophy", "reality", "reasoning", "science_philosophy",
        "society", "consciousness", "ethics", "existence",
    ):
        assets.append(
            AssetSpec(
                f"{name}_vault.json",
                f"memory/legacy_conversations/{name}_vault.json",
                "autobiographical_conversation",
                "conversation_vault",
            )
        )

    for name in ("observations.jsonl", "profile_snapshot.json", "orb_state.json", "heartbeat.json"):
        assets.append(AssetSpec(name, f"substrate/legacy_state/{name}", "legacy_state"))
    assets.append(
        AssetSpec(
            "observations(1).jsonl",
            "substrate/archive/duplicates/observations(1).jsonl",
            "legacy_state_duplicate",
            canonical=False,
        )
    )

    for name in (
        "seed_apriori.json", "seed_aposteriori.json", "seed_biology.json",
        "seed_deductive_reasoner.json", "seed_geography.json", "seed_gladwell.json",
        "seed_hedonic_reflex.json", "seed_kant.json", "seed_locke.json",
        "seed_logic.json", "seed_monotonic.json",
    ):
        assets.append(AssetSpec(name, f"substrate/apriori/seeds/{name}", "seed_vault", "seed_vault"))

    assets.extend(
        [
            AssetSpec("core_certainties.json", "substrate/apriori/core_certainties.json", "core_certainties", "seed_vault"),
            AssetSpec("measurement_units", "substrate/apriori/domains/measurement_units.json", "domain_seed", "seed_vault"),
            AssetSpec("seed.index.json", "substrate/apriori/indexes/seed.index.legacy.json", "seed_index", canonical=False),
            AssetSpec("master_index,json", "substrate/apriori/indexes/master_index.legacy.json", "seed_index_legacy", canonical=False),
            AssetSpec("seed_deductive_reasoner.json.backup", "substrate/archive/backups/seed_deductive_reasoner.json.backup", "seed_backup", canonical=False),
            AssetSpec("seed_locke.json.backup", "substrate/archive/backups/seed_locke.json.backup", "seed_backup", canonical=False),
            AssetSpec("seed.physics.v0.9.0.json", "substrate/archive/legacy_seeds/seed.physics.v0.9.0.json", "legacy_seed", canonical=False),
        ]
    )

    for name in (
        "code_rule_set.csv", "code_topics.csv", "code_use_cases.csv",
        "cross_domain_topic_links.csv", "cross_domain_usecase_links.csv",
        "domain_priority_matrix.csv", "cross_domain_query_patterns.csv",
        "financial_topics.csv", "financial_use_cases.csv",
    ):
        assets.append(AssetSpec(name, f"substrate/domain_knowledge/{name}", "domain_knowledge"))

    assets.append(
        AssetSpec(
            "claim_731f05213c84.json",
            "substrate/evidence/claims/claim_731f05213c84.json",
            "governed_claim",
        )
    )
    for name in (
        "MORB-03-d2914032-1781982183.json",
        "MORB-04-3a240fd8-1781982272.json",
        "MORB-04-5f5972ac-1781982420.json",
        "MORB-04-7b125ced-1781982183.json",
        "MORB-04-a24adb99-1781982183.json",
        "MORB-04-d96dd4b4-1781982264.json",
        "MORB-04-dc7b6bf4-1781982272.json",
        "MORB-05-1ca15bad-1781982272.json",
        "MORB-05-27541381-1781982420.json",
        "MORB-05-801dd572-1781982183.json",
    ):
        assets.append(AssetSpec(name, f"substrate/evidence/morb/{name}", "morb_evidence"))

    for name in (
        "cognitive_substrate_extractor.py", "consolidate_memory.py",
        "export_telemetry.js", "export_to_json.lua", "generate_glyph_report.py",
        "validate_vaults.sh",
    ):
        assets.append(AssetSpec(name, f"substrate/archive/legacy_tools/{name}", "legacy_tool", canonical=False))
    assets.append(
        AssetSpec(
            "query_speed_of_light.json",
            "substrate/archive/legacy_tools/query_speed_of_light.c",
            "legacy_tool_misnamed",
            canonical=False,
        )
    )
    return assets


class CaliUnifiedSubstrate:
    """Owns CALI's local operational mirror and retrieval index."""

    def __init__(
        self,
        base_path: str | Path | None = None,
        source_path: str | Path | None = None,
    ) -> None:
        self.base_path = Path(base_path or Path(__file__).resolve().parents[1])
        self.substrate_path = self.base_path / "substrate"
        self.memory_path = self.base_path / "memory"
        self.source_path = Path(
            source_path
            or os.getenv("CALI_LEGACY_SOURCE_DIR", "").strip()
            or DEFAULT_LEGACY_SOURCE
        )
        self.seed_vault_path = Path(
            os.getenv("CALI_SEED_VAULT_SOURCE_DIR", "").strip()
            or DEFAULT_SEED_VAULT_SOURCE
        )
        self.domain_knowledge_path = Path(
            os.getenv("CALI_DOMAIN_KNOWLEDGE_SOURCE_DIR", "").strip()
            or DEFAULT_DOMAIN_KNOWLEDGE_SOURCE
        )
        self.philosophical_vault_path = Path(
            os.getenv("CALI_PHILOSOPHICAL_VAULT_SOURCE_DIR", "").strip()
            or DEFAULT_PHILOSOPHICAL_VAULT_SOURCE
        )
        self.db_path = self.memory_path / "cali_substrate_index.db"
        self.substrate_path.mkdir(parents=True, exist_ok=True)
        self.memory_path.mkdir(parents=True, exist_ok=True)
        self._fts_available = False
        self._init_db()

    @property
    def assets(self) -> list[AssetSpec]:
        assets = _default_assets()
        assets.extend(self._external_assets(self.seed_vault_path, "seed_vault"))
        assets.extend(self._external_assets(self.domain_knowledge_path, "domain_knowledge"))
        assets.extend(self._external_assets(self.philosophical_vault_path, "philosophical_vaults"))
        return assets

    @staticmethod
    def _external_assets(root: Path, source_root: str) -> list[AssetSpec]:
        if not root.exists():
            return []
        if source_root == "seed_vault":
            paths = sorted(
                path for path in root.iterdir()
                if path.is_file() and path.suffix.lower() in {".json", ".svbin"}
            )
            assets: list[AssetSpec] = []
            for path in paths:
                ingest = "preserve"
                if path.suffix.lower() == ".json":
                    try:
                        _json_load(path)
                        ingest = "seed_vault"
                    except Exception:
                        # Preserve legacy files even when their extension is
                        # JSON but their contents are source code or schemas
                        # for another runtime. They remain referenceable via
                        # asset_registry without poisoning the seed index.
                        ingest = "preserve"
                assets.append(
                    AssetSpec(
                        f"seed_vault/{path.name}",
                        f"substrate/apriori/external_seed_vault/{path.name}",
                        "seed_vault_external",
                        ingest,
                        True,
                        source_root,
                    )
                )
            return assets

        if source_root == "philosophical_vaults":
            return [
                AssetSpec(
                    f"philosophical_vaults/{path.name}",
                    f"memory/legacy_conversations/philosophical/{path.name}",
                    "philosophical_conversation_vault",
                    "conversation_vault",
                    True,
                    source_root,
                )
                for path in sorted(root.glob("*.json"))
                if path.is_file()
            ]

        assets = []
        for path in sorted(root.rglob("*")):
            if not path.is_file() or path.suffix.lower() not in {".json", ".csv", ".md", ".txt"}:
                continue
            relative = path.relative_to(root).as_posix()
            assets.append(
                AssetSpec(
                    f"domain_knowledge/{relative}",
                    f"substrate/domain_knowledge/external/{relative}",
                    "domain_knowledge_external",
                    "domain_knowledge",
                    True,
                    source_root,
                )
            )
        return assets

    def _source_for(self, spec: AssetSpec) -> Path:
        if spec.source_root == "seed_vault":
            return self.seed_vault_path / spec.source_name.removeprefix("seed_vault/")
        if spec.source_root == "domain_knowledge":
            return self.domain_knowledge_path / spec.source_name.removeprefix("domain_knowledge/")
        if spec.source_root == "philosophical_vaults":
            return self.philosophical_vault_path / spec.source_name.removeprefix("philosophical_vaults/")
        return self.source_path / spec.source_name

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=30)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.executescript(
                """
                PRAGMA journal_mode=WAL;
                CREATE TABLE IF NOT EXISTS substrate_meta (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS conversation_memory (
                    id TEXT PRIMARY KEY,
                    conversation_id TEXT,
                    theme TEXT,
                    title TEXT,
                    timestamp REAL,
                    message_index INTEGER,
                    source_file TEXT NOT NULL,
                    content TEXT NOT NULL,
                    context_json TEXT,
                    content_hash TEXT NOT NULL,
                    ingested_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_conversation_theme ON conversation_memory(theme);
                CREATE INDEX IF NOT EXISTS idx_conversation_id ON conversation_memory(conversation_id);
                CREATE TABLE IF NOT EXISTS seed_entries (
                    id TEXT PRIMARY KEY,
                    source_file TEXT NOT NULL,
                    vault_id TEXT,
                    category TEXT,
                    reasoning_type TEXT,
                    term TEXT,
                    definition TEXT,
                    metadata_json TEXT NOT NULL,
                    ingested_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_seed_category ON seed_entries(category);
                CREATE TABLE IF NOT EXISTS domain_documents (
                    id TEXT PRIMARY KEY,
                    source_file TEXT NOT NULL,
                    document_type TEXT NOT NULL,
                    content TEXT NOT NULL,
                    metadata_json TEXT NOT NULL,
                    ingested_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_domain_document_type ON domain_documents(document_type);
                CREATE TABLE IF NOT EXISTS asset_registry (
                    source_name TEXT PRIMARY KEY,
                    target TEXT NOT NULL,
                    asset_class TEXT NOT NULL,
                    ingest TEXT NOT NULL,
                    canonical INTEGER NOT NULL,
                    sha256 TEXT,
                    size_bytes INTEGER,
                    status TEXT NOT NULL,
                    indexed_at TEXT
                );
                """
            )
            try:
                conn.execute(
                    "CREATE VIRTUAL TABLE IF NOT EXISTS conversation_memory_fts USING fts5(id UNINDEXED, title, theme, content)"
                )
                conn.execute(
                    "CREATE VIRTUAL TABLE IF NOT EXISTS seed_entries_fts USING fts5(id UNINDEXED, term, category, definition)"
                )
                conn.execute(
                    "CREATE VIRTUAL TABLE IF NOT EXISTS domain_documents_fts USING fts5(id UNINDEXED, source_file, content)"
                )
                self._fts_available = True
            except sqlite3.OperationalError:
                self._fts_available = False

    def sync_from_archive(self, *, overwrite: bool = False) -> dict[str, Any]:
        report: dict[str, Any] = {
            "source": str(self.source_path),
            "copied": [],
            "unchanged": [],
            "missing": [],
            "errors": [],
        }
        if not self.source_path.exists():
            report["errors"].append(f"legacy source does not exist: {self.source_path}")
            return report

        with self._connect() as conn:
            for spec in self.assets:
                src = self._source_for(spec)
                dst = self.base_path / spec.target
                if not src.exists():
                    report["missing"].append(spec.source_name)
                    self._upsert_asset(conn, spec, None, None, "missing")
                    continue
                try:
                    src_hash = _sha256(src)
                    src_size = src.stat().st_size
                    if dst.exists() and _sha256(dst) == src_hash:
                        report["unchanged"].append(spec.target)
                        self._upsert_asset(conn, spec, src_hash, src_size, "ready")
                        continue
                    if dst.exists() and not overwrite:
                        report["errors"].append(f"target differs and overwrite is disabled: {spec.target}")
                        self._upsert_asset(conn, spec, src_hash, src_size, "conflict")
                        continue
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(src, dst)
                    report["copied"].append(spec.target)
                    self._upsert_asset(conn, spec, src_hash, src_size, "ready")
                except Exception as exc:
                    report["errors"].append(f"{spec.source_name}: {exc}")
                    self._upsert_asset(conn, spec, None, None, "error")
            conn.commit()
        return report

    @staticmethod
    def _upsert_asset(
        conn: sqlite3.Connection,
        spec: AssetSpec,
        sha256: str | None,
        size_bytes: int | None,
        status: str,
    ) -> None:
        conn.execute(
            """
            INSERT INTO asset_registry
                (source_name,target,asset_class,ingest,canonical,sha256,size_bytes,status,indexed_at)
            VALUES (?,?,?,?,?,?,?,?,?)
            ON CONFLICT(source_name) DO UPDATE SET
                target=excluded.target,
                asset_class=excluded.asset_class,
                ingest=excluded.ingest,
                canonical=excluded.canonical,
                sha256=excluded.sha256,
                size_bytes=excluded.size_bytes,
                status=excluded.status,
                indexed_at=excluded.indexed_at
            """,
            (
                spec.source_name,
                spec.target,
                spec.asset_class,
                spec.ingest,
                1 if spec.canonical else 0,
                sha256,
                size_bytes,
                status,
                _utc_now(),
            ),
        )

    def rebuild_indexes(self) -> dict[str, int]:
        counts = {"conversation_segments": 0, "seed_entries": 0, "domain_documents": 0}
        with self._connect() as conn:
            conn.execute("DELETE FROM conversation_memory")
            conn.execute("DELETE FROM seed_entries")
            conn.execute("DELETE FROM domain_documents")
            if self._fts_available:
                conn.execute("DELETE FROM conversation_memory_fts")
                conn.execute("DELETE FROM seed_entries_fts")
                conn.execute("DELETE FROM domain_documents_fts")

            for spec in self.assets:
                path = self.base_path / spec.target
                if not path.exists() or not spec.canonical:
                    continue
                if spec.ingest == "conversation_vault":
                    counts["conversation_segments"] += self._index_conversation_vault(conn, path)
                elif spec.ingest == "seed_vault":
                    counts["seed_entries"] += self._index_seed_vault(conn, path)
                elif spec.ingest == "domain_knowledge":
                    counts["domain_documents"] += self._index_domain_document(conn, path)
            conn.execute(
                "INSERT INTO substrate_meta(key,value) VALUES('last_rebuild',?) "
                "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                (_utc_now(),),
            )
            conn.commit()
        return counts

    def _index_conversation_vault(self, conn: sqlite3.Connection, path: Path) -> int:
        try:
            payload = _json_load(path)
        except Exception as exc:
            _LOG.warning("cannot index conversation vault %s: %s", path, exc)
            return 0
        theme = str(payload.get("theme") or path.stem.replace("_vault", ""))
        source_file = str(path.relative_to(self.base_path)) if path.is_relative_to(self.base_path) else str(path)
        count = 0
        for conv in payload.get("conversations") or []:
            conv_id = str(conv.get("conversation_id") or "")
            title = str(conv.get("title") or "")
            timestamp = conv.get("timestamp")
            try:
                timestamp_value = float(timestamp) if timestamp is not None else None
            except (TypeError, ValueError):
                timestamp_value = None
            for ordinal, segment in enumerate(conv.get("segments") or []):
                if not isinstance(segment, dict):
                    continue
                content = str(segment.get("core_message") or segment.get("text") or "").strip()
                if not content:
                    continue
                message_index = segment.get("message_index")
                try:
                    message_index_value = int(message_index) if message_index is not None else ordinal
                except (TypeError, ValueError):
                    message_index_value = ordinal
                context = segment.get("context")
                content_hash = hashlib.sha256(content.encode("utf-8", errors="ignore")).hexdigest()
                memory_id = hashlib.sha256(
                    f"{source_file}|{conv_id}|{message_index_value}|{ordinal}|{content_hash}".encode("utf-8")
                ).hexdigest()
                conn.execute(
                    """INSERT OR REPLACE INTO conversation_memory
                       (id,conversation_id,theme,title,timestamp,message_index,source_file,
                        content,context_json,content_hash,ingested_at)
                       VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                    (
                        memory_id,
                        conv_id,
                        theme,
                        title,
                        timestamp_value,
                        message_index_value,
                        source_file,
                        content,
                        json.dumps(context, ensure_ascii=False) if context is not None else None,
                        content_hash,
                        _utc_now(),
                    ),
                )
                if self._fts_available:
                    conn.execute(
                        "INSERT INTO conversation_memory_fts(id,title,theme,content) VALUES (?,?,?,?)",
                        (memory_id, title, theme, content),
                    )
                count += 1
        return count

    def _index_seed_vault(self, conn: sqlite3.Connection, path: Path) -> int:
        try:
            payload = _json_load(path)
        except Exception as exc:
            _LOG.warning("cannot index seed vault %s: %s", path, exc)
            return 0
        if not isinstance(payload, dict):
            return 0
        vault_id = str(payload.get("vault_id") or payload.get("vault_name") or path.stem)
        category = str(payload.get("category") or "")
        reasoning_type = str(payload.get("reasoning_type") or "")
        source_file = str(path.relative_to(self.base_path)) if path.is_relative_to(self.base_path) else str(path)
        entries = self._extract_seed_entries(payload)
        if not isinstance(entries, list):
            return 0
        count = 0
        for ordinal, entry in enumerate(entries):
            if not isinstance(entry, dict):
                continue
            entry_id = str(entry.get("id") or f"{vault_id}:{ordinal}")
            term = str(entry.get("term") or entry.get("name") or entry.get("phrase") or entry.get("statement") or f"{vault_id}:{ordinal}")
            definition = str(entry.get("definition") or entry.get("description") or entry.get("explanation") or entry.get("value") or "")
            stable_id = hashlib.sha256(f"{source_file}|{entry_id}".encode("utf-8")).hexdigest()
            conn.execute(
                """INSERT OR REPLACE INTO seed_entries
                   (id,source_file,vault_id,category,reasoning_type,term,definition,metadata_json,ingested_at)
                   VALUES (?,?,?,?,?,?,?,?,?)""",
                (
                    stable_id,
                    source_file,
                    vault_id,
                    category,
                    reasoning_type,
                    term,
                    definition,
                    json.dumps(entry, ensure_ascii=False),
                    _utc_now(),
                ),
            )
            if self._fts_available:
                conn.execute(
                    "INSERT INTO seed_entries_fts(id,term,category,definition) VALUES (?,?,?,?)",
                    (stable_id, term, category, definition),
                )
            count += 1
        return count

    @classmethod
    def _extract_seed_entries(cls, payload: dict[str, Any]) -> list[dict[str, Any]]:
        direct = payload.get("entries")
        if direct is None:
            direct = payload.get("core_concepts")
        if direct is None:
            direct = payload.get("e")
        if isinstance(direct, list):
            normalized: list[dict[str, Any]] = []
            for item in direct:
                if not isinstance(item, dict):
                    continue
                if "i" in item or "t" in item:
                    normalized.append(
                        {
                            **item,
                            "id": item.get("id") or item.get("i"),
                            "term": item.get("term") or item.get("t"),
                            "definition": item.get("definition") or item.get("d") or item.get("v") or item.get("value"),
                        }
                    )
                else:
                    normalized.append(item)
            if normalized:
                return normalized

        extracted: list[dict[str, Any]] = []

        def visit(value: Any, path: str = "") -> None:
            if isinstance(value, dict):
                has_text = any(key in value for key in ("term", "name", "phrase", "statement"))
                has_definition = any(key in value for key in ("definition", "description", "explanation", "value"))
                if has_text and has_definition:
                    extracted.append(value)
                    return
                for key, child in value.items():
                    visit(child, f"{path}.{key}" if path else str(key))
            elif isinstance(value, list):
                for index, child in enumerate(value):
                    visit(child, f"{path}[{index}]")

        for key, value in payload.items():
            if key not in {"index", "$schema", "metadata", "access_control"}:
                visit(value, key)
        if not extracted and payload.get("description"):
            extracted.append(
                {
                    "id": payload.get("vault_id") or payload.get("vault_name") or "seed",
                    "term": payload.get("vault_name") or payload.get("vault_id") or "SeedVault",
                    "definition": payload.get("description"),
                }
            )
        return extracted

    def _index_domain_document(self, conn: sqlite3.Connection, path: Path) -> int:
        try:
            if path.suffix.lower() == ".json":
                payload = _json_load(path)
                content = json.dumps(payload, ensure_ascii=False, indent=2)
            else:
                content = path.read_text(encoding="utf-8", errors="replace")
        except Exception as exc:
            _LOG.warning("cannot index domain document %s: %s", path, exc)
            return 0
        content = content.strip()
        if not content:
            return 0
        source_file = str(path.relative_to(self.base_path)) if path.is_relative_to(self.base_path) else str(path)
        document_id = hashlib.sha256(source_file.encode("utf-8")).hexdigest()
        conn.execute(
            """INSERT OR REPLACE INTO domain_documents
               (id,source_file,document_type,content,metadata_json,ingested_at)
               VALUES (?,?,?,?,?,?)""",
            (document_id, source_file, path.suffix.lower().lstrip("."), content, "{}", _utc_now()),
        )
        if self._fts_available:
            conn.execute(
                "INSERT INTO domain_documents_fts(id,source_file,content) VALUES (?,?,?)",
                (document_id, source_file, content),
            )
        return 1

    def bootstrap(self, *, overwrite: bool = False) -> dict[str, Any]:
        sync = self.sync_from_archive(overwrite=overwrite)
        index = self.rebuild_indexes()
        return {"sync": sync, "index": index, "status": self.status()}

    def ensure_ready(self) -> dict[str, Any]:
        status = self.status()
        if status["conversation_segments"] > 0 and status["seed_entries"] > 0:
            return status
        return self.bootstrap(overwrite=False)["status"]

    def _fts_expression(self, query: str) -> str:
        return " OR ".join(f'"{token}"' for token in _tokens(query))

    def recall_prior_conversations(self, query: str, *, limit: int = 5) -> list[dict[str, Any]]:
        terms = _tokens(query)
        if not terms:
            return []
        with self._connect() as conn:
            rows: Iterable[sqlite3.Row]
            if self._fts_available:
                try:
                    rows = conn.execute(
                        """SELECT cm.* FROM conversation_memory_fts f
                           JOIN conversation_memory cm ON cm.id=f.id
                           WHERE conversation_memory_fts MATCH ?
                           ORDER BY bm25(conversation_memory_fts) LIMIT ?""",
                        (self._fts_expression(query), max(1, min(12, limit))),
                    ).fetchall()
                except sqlite3.OperationalError:
                    rows = []
            else:
                like = f"%{terms[0]}%"
                rows = conn.execute(
                    """SELECT * FROM conversation_memory
                       WHERE lower(content) LIKE ? OR lower(title) LIKE ?
                       ORDER BY timestamp DESC LIMIT ?""",
                    (like, like, max(1, min(12, limit))),
                ).fetchall()
        return [
            {
                "conversation_id": row["conversation_id"],
                "theme": row["theme"],
                "title": row["title"],
                "timestamp": row["timestamp"],
                "message_index": row["message_index"],
                "source_file": row["source_file"],
                "content": row["content"],
                "truth_status": "historical_conversation_record",
            }
            for row in rows
        ]

    def retrieve_reasoning_seeds(self, query: str, *, limit: int = 5) -> list[dict[str, Any]]:
        terms = _tokens(query)
        if not terms:
            return []
        with self._connect() as conn:
            rows: Iterable[sqlite3.Row]
            if self._fts_available:
                try:
                    rows = conn.execute(
                        """SELECT se.* FROM seed_entries_fts f
                           JOIN seed_entries se ON se.id=f.id
                           WHERE seed_entries_fts MATCH ?
                           ORDER BY bm25(seed_entries_fts) LIMIT ?""",
                        (self._fts_expression(query), max(1, min(12, limit))),
                    ).fetchall()
                except sqlite3.OperationalError:
                    rows = []
            else:
                like = f"%{terms[0]}%"
                rows = conn.execute(
                    """SELECT * FROM seed_entries
                       WHERE lower(term) LIKE ? OR lower(definition) LIKE ? OR lower(category) LIKE ?
                       LIMIT ?""",
                    (like, like, like, max(1, min(12, limit))),
                ).fetchall()
        rows = sorted(
            rows,
            key=lambda row: (
                0 if any(term in str(row["reasoning_type"] or "").lower() for term in terms) else 1,
                0 if any(term in str(row["term"] or "").lower() for term in terms) else 1,
            ),
        )
        return [
            {
                "vault_id": row["vault_id"],
                "category": row["category"],
                "reasoning_type": row["reasoning_type"],
                "term": row["term"],
                "definition": row["definition"],
                "source_file": row["source_file"],
            }
            for row in rows
        ]

    def retrieve_domain_knowledge(self, query: str, *, limit: int = 4) -> list[dict[str, Any]]:
        terms = _tokens(query)
        if not terms:
            return []
        with self._connect() as conn:
            rows: Iterable[sqlite3.Row]
            if self._fts_available:
                try:
                    rows = conn.execute(
                        """SELECT dd.* FROM domain_documents_fts f
                           JOIN domain_documents dd ON dd.id=f.id
                           WHERE domain_documents_fts MATCH ?
                           ORDER BY bm25(domain_documents_fts) LIMIT ?""",
                        (self._fts_expression(query), max(1, min(8, limit))),
                    ).fetchall()
                except sqlite3.OperationalError:
                    rows = []
            else:
                like = f"%{terms[0]}%"
                rows = conn.execute(
                    """SELECT * FROM domain_documents
                       WHERE lower(source_file) LIKE ? OR lower(content) LIKE ?
                       LIMIT ?""",
                    (like, like, max(1, min(8, limit))),
                ).fetchall()
        return [
            {
                "source_file": row["source_file"],
                "document_type": row["document_type"],
                "content": row["content"][:4000],
                "truth_status": "canonical_domain_source",
            }
            for row in rows
        ]

    def build_llm_context(self, query: str, *, memory_limit: int = 4, seed_limit: int = 4) -> dict[str, Any]:
        return {
            "memory_semantics": (
                "Historical items are CALI's prior conversations with Bryan. "
                "They establish conversational continuity, not automatic present-day factual truth. "
                "Prefer verified current runtime/site evidence when facts have changed."
            ),
            "prior_conversations": self.recall_prior_conversations(query, limit=memory_limit),
            "reasoning_options": self.retrieve_reasoning_seeds(query, limit=seed_limit),
            "domain_knowledge": self.retrieve_domain_knowledge(query, limit=memory_limit),
        }

    def status(self) -> dict[str, Any]:
        with self._connect() as conn:
            conversation_count = int(conn.execute("SELECT COUNT(*) FROM conversation_memory").fetchone()[0])
            seed_count = int(conn.execute("SELECT COUNT(*) FROM seed_entries").fetchone()[0])
            domain_count = int(conn.execute("SELECT COUNT(*) FROM domain_documents").fetchone()[0])
            asset_rows = conn.execute("SELECT status,COUNT(*) n FROM asset_registry GROUP BY status").fetchall()
        return {
            "source_path": str(self.source_path),
            "base_path": str(self.base_path),
            "database": str(self.db_path),
            "fts5": self._fts_available,
            "conversation_segments": conversation_count,
            "seed_entries": seed_count,
            "domain_documents": domain_count,
            "assets": {row["status"]: int(row["n"]) for row in asset_rows},
        }


_INSTANCE: CaliUnifiedSubstrate | None = None


def get_unified_substrate() -> CaliUnifiedSubstrate:
    global _INSTANCE
    if _INSTANCE is None:
        _INSTANCE = CaliUnifiedSubstrate()
    return _INSTANCE
