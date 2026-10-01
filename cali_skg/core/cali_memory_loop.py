"""
CALI memory loop - candidate generation, grader, and promotion into AIMS.

    interaction -> CALI reasons -> final answer -> memory candidates
        |- short-term candidate  -> local working memory (expires on its own)
        '- long-term candidate   -> grader -> accept / reject / revise / defer
                                       accept -> AIMS: /ltm/commit then /vault/aposteriori

CALI proposes what matters. The grader decides what persists.
AIMS is the authority for durable memory. The Vault is never deleted from here;
CALI only prunes its own local clutter (see cali_self_care.py).

Speaker rule: only the admin (Bryan) can create durable memory. Website visitors can
only leave short-term context, so the public ORB can never write into Bryan's vault.

This is a mixin for CaliPersonalSKG. It relies only on members the class already has:
_connect(), _rows(), _generate_hash(), _next_id(), _log_memory(), vault_path, kaygee_config.
"""

from __future__ import annotations

import json
import os
import re
import threading
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

try:  # httpx is already a cali_skg dependency
    import httpx
except Exception:  # pragma: no cover
    httpx = None  # type: ignore

MEMORY_AGENCY_PROMPT = (
    "You may decide that information from an interaction is worth remembering. "
    "You may write freely to short-term working memory. For durable memory, create a "
    "memory candidate with the fact, why it matters, confidence, source, and expected "
    "durability. Durable memories are evaluated before promotion into long-term AIMS storage."
)

SHORT_TERM = "short_term"
LONG_TERM_CANDIDATE = "long_term_candidate"
LONG_TERM_TARGET = "a_posteriori"

DURABILITY_SCORES = {"persistent": 1.0, "session": 0.4, "turn": 0.1}
SOURCE_QUALITY = {
    "explicit_user": 1.0,
    "user_correction": 1.0,
    "conversation": 0.8,
    "system": 0.7,
    "inferred": 0.5,
    "web": 0.4,
}
CORRECTION_SOURCES = {"user_correction", "explicit_user"}

WEIGHTS = {
    "importance": 0.25,
    "durability": 0.20,
    "confidence": 0.20,
    "novelty": 0.15,
    "source_quality": 0.10,
    "relevance": 0.10,
}
DEFAULT_ACCEPT_THRESHOLD = 0.75
DEFAULT_DEFER_THRESHOLD = 0.55
ACCEPT_BOUNDS = (0.70, 0.85)  # self_tune can never move the accept threshold outside this
DUPLICATE_SIMILARITY = 0.85

RELEVANCE_TERMS = {
    "bryan", "cali", "orb", "orbs", "aims", "tpc", "kaygee", "spruked", "truemark",
    "goat", "weaver", "vault", "skg", "doctrine", "dandy", "prefer", "decision",
}

_HARD_PRIVACY = [
    ("ssn", re.compile(r"\b\d{3}-\d{2}-\d{4}\b")),
    ("card_number", re.compile(r"\b(?:\d[ -]?){13,16}\b")),
    ("credential", re.compile(r"(?i)\b(password|passcode|api[_ -]?key|secret|token)\b\s*(is|=|:)\s*\S+")),
    ("payment_detail", re.compile(r"(?i)\b(cvv|cvc|routing number|account number)\b\D{0,12}\d{3,}")),
]
_SOFT_PRIVACY = re.compile(
    r"(?i)\b(diagnos\w*|medical|medication|prescription|therapy|salary|immigration|social security)\b"
)

_PREFERENCE_MARKERS = (
    "i prefer", "i like it when", "i want you to", "from now on", "going forward",
    "always ", "never ", "i don't want", "i do not want",
)
_DECISION_MARKERS = ("we decided", "i decided", "the plan is", "let's go with", "lets go with", "we're going with")
_CORRECTION_MARKERS = ("that's wrong", "that is wrong", "correction", "actually,", "no, it's", "not correct")
_REMEMBER_MARKERS = ("remember this", "remember that", "note that", "don't forget")

_INTENT_LABELS = {
    "crm_pipeline": "the CRM pipeline",
    "financial_summary": "financial summaries",
    "daily_briefing": "the daily briefing",
    "contact_query": "contacts",
    "verification_queue": "the call verification queue",
    "email_poll": "the mailbox",
    "email_status": "the mailbox",
    "site_nav": "site navigation",
    "add_task": "adding tasks",
}


def _tokens(text: str) -> set:
    return set(re.findall(r"[a-z0-9']+", str(text or "").lower()))


def _similarity(a: str, b: str) -> float:
    ta, tb = _tokens(a), _tokens(b)
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


def _clamp(value: Any, default: float = 0.5) -> float:
    try:
        return max(0.0, min(1.0, float(value)))
    except (TypeError, ValueError):
        return default


# ---------------------------------------------------------------- AIMS client
class AimsUnavailable(Exception):
    """AIMS unreachable or erroring - safe to retry later."""


class AimsRejected(Exception):
    """AIMS refused the request (4xx) - retrying the same payload will not help."""


class AimsClient:
    """Thin HTTP client for the A.I.M.S. service (service.py). No AIMS code is imported."""

    def __init__(self, base_url: Optional[str] = None, token: Optional[str] = None, timeout: float = 4.0):
        self.base_url = str(base_url or os.getenv("AIMS_API_BASE") or "http://127.0.0.1:8000").rstrip("/")
        self.token = token if token is not None else os.getenv("AIMS_API_TOKEN")
        self.timeout = timeout

    def _request(self, method: str, path: str, payload: Optional[Dict[str, Any]] = None) -> Any:
        if httpx is None:
            raise AimsUnavailable("httpx not installed")
        headers = {"X-AIMS-Token": self.token} if self.token else {}
        try:
            response = httpx.request(method, f"{self.base_url}{path}", json=payload, headers=headers, timeout=self.timeout)
        except Exception as exc:
            raise AimsUnavailable(str(exc)) from exc
        if response.status_code >= 500:
            raise AimsUnavailable(f"AIMS {response.status_code}")
        if response.status_code >= 400:
            raise AimsRejected(f"AIMS {response.status_code}: {response.text[:300]}")
        return response.json()

    def health(self) -> Dict[str, Any]:
        return self._request("GET", "/health")

    def integrity(self) -> Dict[str, Any]:
        return self._request("GET", "/api/v1/vault/integrity")

    def maintenance(self, passes: int = 3) -> Dict[str, Any]:
        return self._request("POST", f"/maintenance/run?self_eval_passes={int(passes)}")

    def commit(self, entry_type: str, content: Dict[str, Any], metadata: Dict[str, Any], writer_id: str = "cali") -> Dict[str, Any]:
        return self._request("POST", "/ltm/commit", {
            "entry_type": entry_type, "content": content, "metadata": metadata, "writer_id": writer_id,
        })

    def derive_aposteriori(self, statement: str, source_entry_ids: List[str], metadata: Dict[str, Any],
                           initial_confidence: float) -> Dict[str, Any]:
        return self._request("POST", "/vault/aposteriori", {
            "statement": statement, "source_entry_ids": source_entry_ids,
            "metadata": metadata, "initial_confidence": initial_confidence,
        })

    def link(self, source_atom_id: str, target_atom_id: str, relation: str, weight: float = 1.0) -> Dict[str, Any]:
        return self._request("POST", "/skg/link", {
            "source_atom_id": source_atom_id, "target_atom_id": target_atom_id,
            "relation": relation, "weight": weight,
        })


_ENTRY_TYPE_BY_KIND = {
    "decision": "decision", "correction": "learning", "preference": "learning",
    "pattern": "reflection", "insight": "reflection",
}


class CaliMemoryLoopMixin:
    aims_client: Optional[AimsClient] = None
    _aims_write_blocked: bool = False
    _memory_lock = threading.RLock()

    # ------------------------------------------------------------------ schema
    def _init_memory_loop_tables(self) -> None:
        with self._connect() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS working_memory (
                    id TEXT PRIMARY KEY, kind TEXT, content TEXT NOT NULL, source TEXT,
                    speaker TEXT DEFAULT 'admin', created_at TEXT, expires_at TEXT
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS memory_candidates (
                    id TEXT PRIMARY KEY, memory_type TEXT, content TEXT, reason TEXT,
                    confidence REAL, importance REAL, source TEXT, expected_duration TEXT,
                    subject TEXT, speaker TEXT DEFAULT 'admin', decision TEXT, target TEXT,
                    score REAL, grade_detail TEXT, resolved_by_owner INTEGER DEFAULT 0,
                    created_at TEXT, graded_at TEXT
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS long_term_index (
                    id TEXT PRIMARY KEY, content_hash TEXT, content TEXT, subject TEXT,
                    target TEXT, score REAL, status TEXT DEFAULT 'active', superseded_by TEXT,
                    candidate_id TEXT, aims_entry_id TEXT, aims_atom_id TEXT, created_at TEXT
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS aims_outbox (
                    id TEXT PRIMARY KEY, payload TEXT NOT NULL, status TEXT DEFAULT 'pending',
                    attempts INTEGER DEFAULT 0, last_error TEXT, index_id TEXT,
                    created_at TEXT, updated_at TEXT
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS calibration_rollup (
                    day TEXT, memory_type TEXT, decision TEXT, n INTEGER,
                    sum_importance REAL, sum_score REAL,
                    PRIMARY KEY (day, memory_type, decision)
                )
                """
            )
            cur.execute("CREATE TABLE IF NOT EXISTS cali_state (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT)")
            conn.commit()

    def _get_state(self, key: str, default: Optional[str] = None) -> Optional[str]:
        with self._connect() as conn:
            row = conn.execute("SELECT value FROM cali_state WHERE key = ?", (key,)).fetchone()
        return row[0] if row else default

    def _set_state(self, key: str, value: str) -> None:
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO cali_state (key, value, updated_at) VALUES (?, ?, ?) "
                "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
                (key, value, datetime.utcnow().isoformat()),
            )
            conn.commit()

    # ---------------------------------------------------------- short-term memory
    def write_working_memory(self, kind: str, content: str, source: str = "conversation",
                             ttl_hours: float = 24.0, speaker: str = "admin") -> Dict[str, Any]:
        text = str(content or "").strip()
        if not text:
            return {"success": False, "message": "Empty working memory."}
        if self._privacy_check(text)[0] == "hard":
            return {"success": False, "message": "Rejected: sensitive pattern."}
        now = datetime.utcnow()
        item_id = self._next_id("wm", {"kind": kind, "content": text})
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO working_memory (id, kind, content, source, speaker, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (item_id, kind, text, source, speaker, now.isoformat(), (now + timedelta(hours=ttl_hours)).isoformat()),
            )
            conn.commit()
        return {"success": True, "id": item_id, "kind": kind}

    def get_working_memory(self, limit: int = 20, kind: Optional[str] = None,
                           speaker: Optional[str] = None) -> List[Dict[str, Any]]:
        now = datetime.utcnow().isoformat()
        clauses, params = ["expires_at > ?"], [now]
        if kind:
            clauses.append("kind = ?")
            params.append(kind)
        if speaker:
            clauses.append("speaker = ?")
            params.append(speaker)
        params.append(min(200, max(1, int(limit or 20))))
        with self._connect() as conn:
            cur = conn.cursor()
            cur.execute(f"SELECT * FROM working_memory WHERE {' AND '.join(clauses)} ORDER BY created_at DESC LIMIT ?", params)
            return self._rows(cur)

    def prune_working_memory(self) -> int:
        with self._connect() as conn:
            cur = conn.cursor()
            cur.execute("DELETE FROM working_memory WHERE expires_at <= ?", (datetime.utcnow().isoformat(),))
            conn.commit()
            return cur.rowcount

    # --------------------------------------------------------- candidate intake
    def _normalize_candidate(self, candidate: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not isinstance(candidate, dict):
            return None
        content = str(candidate.get("content") or "").strip()
        if not content:
            return None
        memory_type = str(candidate.get("memory_type") or LONG_TERM_CANDIDATE).strip().lower()
        if memory_type not in (SHORT_TERM, LONG_TERM_CANDIDATE):
            memory_type = LONG_TERM_CANDIDATE
        duration = str(candidate.get("expected_duration") or "").strip().lower()
        if duration not in DURABILITY_SCORES:
            duration = "session" if memory_type == SHORT_TERM else "persistent"
        return {
            "memory_type": memory_type,
            "content": content[:2000],
            "reason": str(candidate.get("reason") or "").strip()[:500],
            "confidence": _clamp(candidate.get("confidence"), 0.5),
            "importance": _clamp(candidate.get("importance"), 0.5),
            "source": str(candidate.get("source") or "conversation").strip().lower(),
            "expected_duration": duration,
            "subject": (str(candidate.get("subject")).strip().lower() if candidate.get("subject") else None),
            "kind": str(candidate.get("kind") or "context").strip().lower(),
        }

    def submit_memory_candidate(self, candidate: Dict[str, Any], speaker: str = "admin") -> Dict[str, Any]:
        """Anything CALI/KayGee proposes lands here. Short-term writes through; long-term is graded."""
        cand = self._normalize_candidate(candidate)
        if cand is None:
            return {"decision": "reject", "target": None, "score": 0.0, "reason": "Invalid or empty candidate."}
        speaker = "admin" if speaker == "admin" else "visitor"
        cand_id = self._next_id("mc", {"content": cand["content"], "type": cand["memory_type"]})

        if cand["memory_type"] == SHORT_TERM:
            ttl = 1.0 if cand["expected_duration"] == "turn" else (6.0 if speaker == "visitor" else 24.0)
            written = self.write_working_memory(cand["kind"], cand["content"], cand["source"], ttl_hours=ttl, speaker=speaker)
            ok = bool(written.get("success"))
            result = {
                "decision": "accept" if ok else "reject",
                "target": SHORT_TERM if ok else None,
                "score": 1.0 if ok else 0.0,
                "reason": "Short-term working memory." if ok else written.get("message", "Rejected."),
                "dimensions": {},
            }
            self._record_candidate(cand_id, cand, result, speaker)
            return {**result, "candidate_id": cand_id}

        if speaker != "admin":
            result = {"decision": "reject", "target": None, "score": 0.0, "dimensions": {},
                      "reason": "Only the admin can create durable memory."}
            self._record_candidate(cand_id, cand, result, speaker)
            return {**result, "candidate_id": cand_id}

        with self._memory_lock:
            result = self.grade_memory_candidate(cand)
            self._record_candidate(cand_id, cand, result, speaker)
            result = self._apply_decision(cand_id, cand, result)
        return {**result, "candidate_id": cand_id}

    def _record_candidate(self, cand_id: str, cand: Dict[str, Any], result: Dict[str, Any], speaker: str = "admin") -> None:
        content = "[redacted: sensitive pattern]" if result.get("hard_privacy") else cand["content"]
        now = datetime.utcnow().isoformat()
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO memory_candidates
                (id, memory_type, content, reason, confidence, importance, source, expected_duration,
                 subject, speaker, decision, target, score, grade_detail, created_at, graded_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    cand_id, cand["memory_type"], content, cand["reason"], cand["confidence"],
                    cand["importance"], cand["source"], cand["expected_duration"], cand["subject"], speaker,
                    result.get("decision"), result.get("target"), result.get("score"),
                    json.dumps(result.get("dimensions", {})), now, now,
                ),
            )
            conn.commit()

    # ------------------------------------------------------------------- grader
    def _tuning(self) -> Dict[str, Any]:
        path = self.vault_path / "grader_tuning.json"
        tuning = {"accept_threshold": DEFAULT_ACCEPT_THRESHOLD, "defer_threshold": DEFAULT_DEFER_THRESHOLD,
                  "last_tuned_at": None, "history": []}
        try:
            if path.exists():
                stored = json.loads(path.read_text(encoding="utf-8"))
                lo, hi = ACCEPT_BOUNDS
                tuning["accept_threshold"] = max(lo, min(hi, float(stored.get("accept_threshold", tuning["accept_threshold"]))))
                tuning["defer_threshold"] = max(0.45, min(tuning["accept_threshold"] - 0.1,
                                                          float(stored.get("defer_threshold", tuning["defer_threshold"]))))
                tuning["last_tuned_at"] = stored.get("last_tuned_at")
                tuning["history"] = list(stored.get("history", []))[-50:]
        except (OSError, ValueError):
            pass  # a damaged tuning file falls back to defaults; self-repair rewrites it
        return tuning

    def _privacy_check(self, text: str):
        for label, pattern in _HARD_PRIVACY:
            if pattern.search(text):
                return "hard", label
        if _SOFT_PRIVACY.search(text):
            return "soft", "sensitive_topic"
        return None, None

    def _active_long_term(self) -> List[Dict[str, Any]]:
        with self._connect() as conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM long_term_index WHERE status = 'active'")
            return self._rows(cur)

    def grade_memory_candidate(self, cand: Dict[str, Any]) -> Dict[str, Any]:
        content = cand["content"]
        tuning = self._tuning()
        accept_at, defer_at = tuning["accept_threshold"], tuning["defer_threshold"]
        dims: Dict[str, Any] = {}

        privacy_level, privacy_label = self._privacy_check(content)
        dims["privacy"] = privacy_label or "clear"
        if privacy_level == "hard":
            return {"decision": "reject", "target": None, "score": 0.0, "hard_privacy": True,
                    "reason": f"Blocked by privacy gate ({privacy_label}).", "dimensions": dims}

        best_sim, best_match, contradiction_with = 0.0, None, None
        for row in self._active_long_term():
            sim = _similarity(content, row.get("content", ""))
            if sim > best_sim:
                best_sim, best_match = sim, row
            if cand["subject"] and row.get("subject") == cand["subject"] and sim < DUPLICATE_SIMILARITY:
                contradiction_with = row

        dims["novelty"] = round(1.0 - best_sim, 3)
        dims["duplication"] = round(best_sim, 3)
        dims["contradiction"] = bool(contradiction_with)

        if best_match is not None and best_sim >= DUPLICATE_SIMILARITY:
            return {"decision": "reject", "target": None, "score": round(1.0 - best_sim, 3),
                    "reason": "Duplicate of an existing long-term memory.", "dimensions": dims}

        dims["importance"] = cand["importance"]
        dims["confidence"] = cand["confidence"]
        dims["durability"] = DURABILITY_SCORES.get(cand["expected_duration"], 0.4)
        dims["source_quality"] = SOURCE_QUALITY.get(cand["source"], 0.5)
        dims["relevance"] = 1.0 if (cand["subject"] or (_tokens(content) & RELEVANCE_TERMS)) else 0.6
        score = round(sum(dims[name] * weight for name, weight in WEIGHTS.items()), 3)
        base = {"score": score, "dimensions": dims}

        if privacy_level == "soft":
            return {**base, "decision": "defer", "target": None, "reason": "Sensitive topic - held for owner review."}

        if contradiction_with is not None:
            if cand["source"] in CORRECTION_SOURCES and cand["confidence"] >= 0.8:
                return {**base, "decision": "accept", "target": LONG_TERM_TARGET,
                        "supersedes": contradiction_with["id"],
                        "reason": "Explicit correction of an existing memory on the same subject."}
            return {**base, "decision": "defer", "target": None,
                    "reason": "Contradicts an existing memory on the same subject - needs review."}

        if cand["confidence"] < float(self.kaygee_config.get("confidence_threshold", 0.75)):
            if score >= defer_at:
                return {**base, "decision": "defer", "target": None, "reason": "Confidence below threshold - held for review."}
            return {**base, "decision": "reject", "target": None, "reason": "Low confidence and low score."}

        if dims["durability"] < 0.7:
            if score >= defer_at:
                return {**base, "decision": "revise", "target": SHORT_TERM,
                        "reason": "Useful but not durable - demoted to short-term working memory."}
            return {**base, "decision": "reject", "target": None, "reason": "Not durable enough to keep."}

        if score >= accept_at:
            return {**base, "decision": "accept", "target": LONG_TERM_TARGET,
                    "reason": "Durable, confident, relevant, and not already known."}
        if score >= defer_at:
            return {**base, "decision": "defer", "target": None, "reason": "Borderline score - held for review."}
        return {**base, "decision": "reject", "target": None, "reason": "Score below keep threshold."}

    # ----------------------------------------------------------- applying result
    def _apply_decision(self, cand_id: str, cand: Dict[str, Any], result: Dict[str, Any]) -> Dict[str, Any]:
        decision = result.get("decision")
        if decision == "accept":
            self._promote_to_long_term(cand_id, cand, result)
        elif decision == "revise":
            self.write_working_memory(cand["kind"], cand["content"], cand["source"], ttl_hours=72.0)
        return result

    def _promote_to_long_term(self, cand_id: str, cand: Dict[str, Any], result: Dict[str, Any]) -> None:
        """Index locally (so dedupe works instantly), queue for AIMS, then try delivery right away."""
        now = datetime.utcnow().isoformat()
        index_id = self._next_id("ltm", {"content": cand["content"]})
        superseded = result.get("supersedes")
        superseded_atom = None
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO long_term_index
                (id, content_hash, content, subject, target, score, status, candidate_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
                """,
                (index_id, self._generate_hash({"c": cand["content"]}), cand["content"], cand["subject"],
                 LONG_TERM_TARGET, result.get("score"), cand_id, now),
            )
            if superseded:
                row = conn.execute("SELECT aims_atom_id FROM long_term_index WHERE id = ?", (superseded,)).fetchone()
                superseded_atom = row[0] if row else None
                conn.execute("UPDATE long_term_index SET status = 'superseded', superseded_by = ? WHERE id = ?",
                             (index_id, superseded))
            conn.commit()

        payload = {
            "candidate_id": cand_id,
            "statement": cand["content"],
            "entry_type": _ENTRY_TYPE_BY_KIND.get(cand["kind"], "observation"),
            "reason": cand["reason"],
            "metadata": {
                "candidate_id": cand_id, "subject": cand["subject"], "source": cand["source"],
                "grader_score": result.get("score"), "importance": cand["importance"],
                "confidence": cand["confidence"], "speaker": "admin", "origin": "cali_memory_loop",
            },
            "initial_confidence": 0.6 if cand["source"] in CORRECTION_SOURCES else 0.5,
            "supersedes_atom_id": superseded_atom,
        }
        outbox_id = self._next_id("ob", {"c": cand_id})
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO aims_outbox (id, payload, status, attempts, index_id, created_at, updated_at) VALUES (?, ?, 'pending', 0, ?, ?, ?)",
                (outbox_id, json.dumps(payload), index_id, now, now),
            )
            conn.commit()
        self._log_memory("long_term_promotion", {"candidate_id": cand_id, "outbox_id": outbox_id}, source="memory_grader")
        self._deliver_outbox_item(outbox_id)

    # ------------------------------------------------------------- AIMS delivery
    def _aims(self) -> AimsClient:
        if self.aims_client is None:
            self.aims_client = AimsClient()
        return self.aims_client

    def _deliver_outbox_item(self, outbox_id: str) -> Dict[str, Any]:
        """commit -> derive a posteriori -> optional supersede link. Resumable: progress is saved in the payload."""
        if self._aims_write_blocked:
            return {"delivered": False, "reason": "AIMS writes blocked pending integrity review."}
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM aims_outbox WHERE id = ? AND status = 'pending'", (outbox_id,)).fetchone()
        if not row:
            return {"delivered": False, "reason": "not pending"}
        payload = json.loads(row["payload"])
        index_id = row["index_id"]
        client = self._aims()
        status, error = "pending", None
        try:
            if not payload.get("entry_id"):
                entry = client.commit(payload["entry_type"],
                                      {"statement": payload["statement"], "reason": payload.get("reason", "")},
                                      payload["metadata"], writer_id="cali")
                payload["entry_id"] = entry["entry_id"]
            if not payload.get("atom_id"):
                atom = client.derive_aposteriori(payload["statement"], [payload["entry_id"]],
                                                 payload["metadata"], payload["initial_confidence"])
                payload["atom_id"] = atom["atom_id"]
            if payload.get("supersedes_atom_id") and not payload.get("link_done"):
                client.link(payload["atom_id"], payload["supersedes_atom_id"], "supersedes")
                payload["link_done"] = True
            status = "done"
        except AimsRejected as exc:
            status, error = "failed", str(exc)
        except (AimsUnavailable, KeyError) as exc:
            error = str(exc)

        now = datetime.utcnow().isoformat()
        with self._connect() as conn:
            conn.execute(
                "UPDATE aims_outbox SET payload = ?, status = ?, attempts = attempts + 1, last_error = ?, updated_at = ? WHERE id = ?",
                (json.dumps(payload), status, error, now, outbox_id),
            )
            if payload.get("atom_id") and index_id:
                conn.execute("UPDATE long_term_index SET aims_entry_id = ?, aims_atom_id = ? WHERE id = ?",
                             (payload.get("entry_id"), payload.get("atom_id"), index_id))
            conn.commit()
        return {"delivered": status == "done", "status": status, "error": error}

    def flush_aims_outbox(self, limit: int = 25) -> Dict[str, Any]:
        with self._connect() as conn:
            ids = [r[0] for r in conn.execute(
                "SELECT id FROM aims_outbox WHERE status = 'pending' ORDER BY created_at ASC LIMIT ?", (limit,))]
        delivered = failed = 0
        for outbox_id in ids:
            outcome = self._deliver_outbox_item(outbox_id)
            if outcome.get("delivered"):
                delivered += 1
            else:
                failed += 1
                if outcome.get("reason") or (outcome.get("error") and "Unavailable" in str(outcome.get("error"))):
                    break  # AIMS is down or blocked - stop hammering it
        return {"attempted": len(ids), "delivered": delivered, "still_pending": failed}

    # ---------------------------------------------------------- deferred review
    def get_deferred_candidates(self, limit: int = 25) -> List[Dict[str, Any]]:
        with self._connect() as conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM memory_candidates WHERE decision = 'defer' ORDER BY created_at DESC LIMIT ?",
                        (min(200, max(1, int(limit or 25))),))
            return self._rows(cur)

    def resolve_deferred_candidate(self, candidate_id: str, approve: bool) -> Dict[str, Any]:
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM memory_candidates WHERE id = ? AND decision = 'defer'", (candidate_id,)).fetchone()
        if not row:
            return {"success": False, "message": "No deferred candidate with that id."}
        row = dict(row)
        now = datetime.utcnow().isoformat()
        if approve:
            cand = {"memory_type": LONG_TERM_CANDIDATE, "content": row["content"], "reason": row["reason"] or "",
                    "confidence": row["confidence"], "importance": row["importance"], "source": row["source"],
                    "expected_duration": row["expected_duration"], "subject": row["subject"], "kind": "context"}
            detail = json.loads(row.get("grade_detail") or "{}")
            result: Dict[str, Any] = {"target": LONG_TERM_TARGET, "score": row["score"], "dimensions": detail}
            if detail.get("contradiction") and row.get("subject"):
                for old in self._active_long_term():
                    if old.get("subject") == row["subject"]:
                        result["supersedes"] = old["id"]
                        break
            with self._memory_lock:
                self._promote_to_long_term(candidate_id, cand, result)
            new_decision, new_target = "accept", LONG_TERM_TARGET
        else:
            new_decision, new_target = "reject", None
        with self._connect() as conn:
            conn.execute(
                "UPDATE memory_candidates SET decision = ?, target = ?, graded_at = ?, resolved_by_owner = 1 WHERE id = ?",
                (new_decision, new_target, now, candidate_id),
            )
            conn.commit()
        return {"success": True, "candidate_id": candidate_id, "decision": new_decision}

    # ------------------------------------------------------------ learning signal
    def get_grader_calibration(self) -> Dict[str, Any]:
        with self._connect() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                SELECT decision, COUNT(*) AS n, AVG(importance) AS avg_importance, AVG(score) AS avg_score
                FROM memory_candidates WHERE memory_type = ? GROUP BY decision
                """, (LONG_TERM_CANDIDATE,))
            live = {r["decision"]: {"count": r["n"], "avg_importance": r["avg_importance"], "avg_score": r["avg_score"]}
                    for r in cur.fetchall()}
            cur.execute("SELECT decision, SUM(n) AS n, SUM(sum_importance) AS si, SUM(sum_score) AS ss "
                        "FROM calibration_rollup WHERE memory_type = ? GROUP BY decision", (LONG_TERM_CANDIDATE,))
            rolled = {r["decision"]: (r["n"], r["si"], r["ss"]) for r in cur.fetchall()}
            cur.execute("SELECT COUNT(*), SUM(decision='accept') FROM memory_candidates "
                        "WHERE resolved_by_owner = 1")
            owner_n, owner_accept = cur.fetchone()

        by_decision: Dict[str, Dict[str, Any]] = {}
        for decision in set(live) | set(rolled):
            ln = live.get(decision, {}).get("count", 0)
            rn, rsi, rss = rolled.get(decision, (0, 0.0, 0.0))
            total = ln + (rn or 0)
            si = live.get(decision, {}).get("avg_importance", 0.0) * ln + (rsi or 0.0) if ln else (rsi or 0.0)
            ss = (live.get(decision, {}).get("avg_score") or 0.0) * ln + (rss or 0.0) if ln else (rss or 0.0)
            by_decision[decision] = {"count": total, "avg_importance": round(si / total, 3) if total else None,
                                     "avg_score": round(ss / total, 3) if total else None}
        total_all = sum(v["count"] for v in by_decision.values())
        accepted = by_decision.get("accept", {}).get("count", 0)
        return {
            "total_long_term_candidates": total_all,
            "accept_rate": round(accepted / total_all, 3) if total_all else None,
            "owner_resolved": owner_n or 0,
            "owner_approval_rate": round((owner_accept or 0) / owner_n, 3) if owner_n else None,
            "thresholds": {k: v for k, v in self._tuning().items() if k in ("accept_threshold", "defer_threshold")},
            "by_decision": by_decision,
        }

    def self_tune(self, min_samples: int = 10) -> Dict[str, Any]:
        """Bounded, logged threshold adjustment driven only by Bryan's own approve/reject calls."""
        tuning = self._tuning()
        since = tuning.get("last_tuned_at") or "1970-01-01T00:00:00"
        with self._connect() as conn:
            rows = conn.execute("SELECT decision FROM memory_candidates WHERE resolved_by_owner = 1 AND graded_at > ?",
                                (since,)).fetchall()
        n = len(rows)
        if n < min_samples:
            return {"changed": False, "reason": f"need {min_samples} owner decisions, have {n}"}
        rate = sum(1 for r in rows if r[0] == "accept") / n
        current = tuning["accept_threshold"]
        lo, hi = ACCEPT_BOUNDS
        new = current
        if rate >= 0.8:
            new = max(lo, round(current - 0.02, 3))
        elif rate <= 0.2:
            new = min(hi, round(current + 0.02, 3))
        now = datetime.utcnow().isoformat()
        entry = {"at": now, "samples": n, "owner_approval_rate": round(rate, 3), "from": current, "to": new}
        stored = {"accept_threshold": new, "defer_threshold": max(0.45, round(new - 0.2, 3)),
                  "last_tuned_at": now, "history": (tuning["history"] + [entry])[-50:]}
        (self.vault_path / "grader_tuning.json").write_text(json.dumps(stored, indent=2) + "\n", encoding="utf-8")
        self._log_memory("grader_tuning", entry, source="self_tune")
        return {"changed": new != current, **entry}

    # ------------------------------------------------------------ reflection
    def consolidate(self, window_days: int = 14, min_occurrences: int = 4) -> Dict[str, Any]:
        """Thinking pass: turn repeated admin behavior into pattern candidates. The grader still decides."""
        cutoff = (datetime.utcnow() - timedelta(days=window_days)).isoformat()
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT content FROM memory_candidates WHERE memory_type = 'short_term' AND speaker = 'admin' "
                "AND decision = 'accept' AND created_at > ? AND content LIKE '[%'", (cutoff,)).fetchall()
        counts: Dict[str, int] = {}
        for (content,) in rows:
            match = re.match(r"^\[(\w+)\]", content)
            if match and match.group(1) not in ("unknown", ""):
                counts[match.group(1)] = counts.get(match.group(1), 0) + 1

        outcomes = []
        for intent_type, n in sorted(counts.items(), key=lambda kv: -kv[1]):
            if n < min_occurrences:
                continue
            label = _INTENT_LABELS.get(intent_type, intent_type.replace("_", " "))
            outcome = self.submit_memory_candidate({
                "memory_type": LONG_TERM_CANDIDATE, "kind": "pattern",
                "content": f"Bryan regularly asks CALI about {label}.",
                "reason": f"Recurring behavior: {n} requests in {window_days} days.",
                "confidence": 0.85, "importance": 0.6, "source": "inferred",
                "expected_duration": "persistent", "subject": f"pattern:{intent_type}",
            }, speaker="admin")
            outcomes.append({"intent": intent_type, "occurrences": n, "decision": outcome["decision"]})
        return {"patterns_found": len(outcomes), "outcomes": outcomes}

    # ------------------------------------------------------- candidate generation
    def generate_memory_candidates(self, query: str, response_text: str, intent: Dict[str, Any],
                                   context: Optional[Dict[str, Any]] = None,
                                   speaker: str = "admin") -> List[Dict[str, Any]]:
        q = str(query or "").strip()
        ql = q.lower()
        intent_type = str((intent or {}).get("type") or "unknown")
        candidates: List[Dict[str, Any]] = [{
            "memory_type": SHORT_TERM, "kind": "current_topic" if speaker == "admin" else "visitor_goal",
            "content": f"[{intent_type}] {q[:200]}", "reason": "Current topic for the next few turns.",
            "confidence": 0.9, "importance": 0.4, "source": "conversation", "expected_duration": "session",
        }]
        path = (context or {}).get("current_path")
        if path:
            candidates.append({"memory_type": SHORT_TERM, "kind": "page_context", "content": f"Speaker is on {path}",
                               "reason": "Page context.", "confidence": 0.95, "importance": 0.3,
                               "source": "system", "expected_duration": "turn"})
        if intent_type == "unknown":
            candidates.append({"memory_type": SHORT_TERM, "kind": "unresolved_question", "content": q[:300],
                               "reason": "No deterministic handler matched.", "confidence": 0.8, "importance": 0.5,
                               "source": "conversation", "expected_duration": "session"})
        if speaker != "admin":
            return candidates  # visitors never propose durable memory

        def long_term(kind: str, reason: str, source: str, importance: float, confidence: float) -> Dict[str, Any]:
            return {"memory_type": LONG_TERM_CANDIDATE, "kind": kind, "content": q[:600], "reason": reason,
                    "confidence": confidence, "importance": importance, "source": source,
                    "expected_duration": "persistent"}

        if any(m in ql for m in _CORRECTION_MARKERS):
            candidates.append(long_term("correction", "Explicit correction from Bryan.", "user_correction", 0.85, 0.85))
        elif any(m in ql for m in _DECISION_MARKERS):
            candidates.append(long_term("decision", "Explicit project decision.", "explicit_user", 0.85, 0.9))
        elif any(m in ql for m in _PREFERENCE_MARKERS):
            candidates.append(long_term("preference", "Explicitly stated preference.", "explicit_user", 0.8, 0.9))
        elif any(m in ql for m in _REMEMBER_MARKERS):
            candidates.append(long_term("preference", "Bryan asked CALI to remember this.", "explicit_user", 0.85, 0.95))
        return candidates

    def run_memory_loop(self, query: str, response_text: str, intent: Dict[str, Any],
                        context: Optional[Dict[str, Any]] = None, speaker: str = "admin") -> Dict[str, Any]:
        """Post-answer step. Must never break the answer path."""
        summary: Dict[str, Any] = {"short_term": 0, "accepted": 0, "revised": 0, "deferred": 0, "rejected": 0}
        try:
            for cand in self.generate_memory_candidates(query, response_text, intent, context, speaker):
                outcome = self.submit_memory_candidate(cand, speaker=speaker)
                if cand["memory_type"] == SHORT_TERM:
                    if outcome["decision"] == "accept":
                        summary["short_term"] += 1
                    continue
                key = {"accept": "accepted", "revise": "revised", "defer": "deferred"}.get(outcome["decision"], "rejected")
                summary[key] += 1
        except Exception as exc:  # memory is best-effort
            summary["error"] = str(exc)
        return summary
