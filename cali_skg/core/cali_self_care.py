"""
CALI self-care - she tends her own state.

  run_self_maintenance()  prune and compact local clutter, reflect, tune, ask AIMS to run its own cycle
  run_self_repair()       verify and repair what can safely be repaired; escalate the rest
  propose_improvement()   the only way CALI "changes" her own code: a written proposal for Bryan

Hard lines (from CALI's identity principles and AIMS's design):
  * The AIMS Vault is never deleted from or edited here. AIMS evaluates and retires its own atoms.
  * Daily memory_*.jsonl records are archived (gzip, verified), never deleted.
  * If the AIMS ledger reports corruption, CALI stops writing to it and tells Bryan. She does not "fix" it.
  * CALI never edits source code. Improvements become proposals that wait for approval.
"""

from __future__ import annotations

import gzip
import hashlib
import json
import shutil
import threading
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from .cali_memory_loop import AimsRejected, AimsUnavailable


class CaliSelfCareMixin:
    _maintenance_thread: Optional[threading.Thread] = None
    _maintenance_stop: Optional[threading.Event] = None

    # ------------------------------------------------------------ proposals
    def propose_improvement(self, title: str, rationale: str, evidence: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        digest = hashlib.sha256(title.encode("utf-8")).hexdigest()[:12]
        ledger = self.vault_path / "improvement_proposals.jsonl"
        if ledger.exists() and digest in ledger.read_text(encoding="utf-8"):
            return {"created": False, "reason": "already proposed", "proposal_id": digest}
        record = {"proposal_id": digest, "title": title, "rationale": rationale, "evidence": evidence or {},
                  "status": "awaiting_owner_review", "proposed_at": datetime.utcnow().isoformat()}
        with ledger.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(record) + "\n")
        self._add_task_once(f"CALI proposal: {title}", "cali_improvement", 3, rationale)
        return {"created": True, "proposal_id": digest}

    def list_improvement_proposals(self) -> List[Dict[str, Any]]:
        ledger = self.vault_path / "improvement_proposals.jsonl"
        if not ledger.exists():
            return []
        out = []
        for line in ledger.read_text(encoding="utf-8").splitlines():
            try:
                out.append(json.loads(line))
            except ValueError:
                continue
        return out

    def _add_task_once(self, title: str, category: str, priority: int, description: str = "") -> None:
        with self._connect() as conn:
            exists = conn.execute("SELECT 1 FROM tasks WHERE title = ? AND status = 'active' LIMIT 1", (title,)).fetchone()
        if not exists:
            self.add_task(title=title, description=description[:500], priority=priority, category=category, cali_suggested=True)

    # ---------------------------------------------------------- maintenance
    def run_self_maintenance(self, retention_days: int = 90, candidate_retention_days: int = 30,
                             deferred_expire_days: int = 60, archive_after_days: int = 30,
                             temp_retention_days: int = 7) -> Dict[str, Any]:
        report: Dict[str, Any] = {"started_at": datetime.utcnow().isoformat(), "steps": {}}

        def step(name: str, fn):
            try:
                report["steps"][name] = fn()
            except Exception as exc:
                report["steps"][name] = {"error": f"{type(exc).__name__}: {exc}"}

        step("knowledge_graph", lambda: (self.prune_knowledge_graph(retention_days=retention_days), "pruned")[1])
        step("working_memory", lambda: {"expired_removed": self.prune_working_memory()})
        step("candidates", lambda: self._compact_candidates(candidate_retention_days, deferred_expire_days))
        step("tool_log", lambda: {"removed": self.tools.prune_log(retention_days) if self.tools else 0})
        step("outbox", self._compact_outbox)
        step("memory_archive", lambda: self._archive_old_memory_files(archive_after_days))
        step("temp_dir", lambda: self._clean_temp(temp_retention_days))
        step("reflection", self.consolidate)
        step("self_tune", self.self_tune)
        step("aims_cycle", self._run_aims_cycle)
        step("database", self._optimize_database)

        report["finished_at"] = datetime.utcnow().isoformat()
        self._set_state("last_maintenance_at", report["finished_at"])
        self._log_memory("maintenance", {"steps": {k: (v if isinstance(v, (int, str)) else "ok" if "error" not in v else "error")
                                                   for k, v in report["steps"].items()}}, source="self_care")
        return report

    def _compact_candidates(self, retention_days: int, deferred_expire_days: int) -> Dict[str, Any]:
        cutoff = (datetime.utcnow() - timedelta(days=retention_days)).isoformat()
        expire_cutoff = (datetime.utcnow() - timedelta(days=deferred_expire_days)).isoformat()
        owner_cutoff = (datetime.utcnow() - timedelta(days=365)).isoformat()
        clause = ("created_at < ? AND resolved_by_owner = 0 AND "
                  "(memory_type = 'short_term' OR decision IN ('reject', 'revise', 'expire'))")
        with self._connect() as conn:
            expired = conn.execute(
                "UPDATE memory_candidates SET decision = 'expire', target = NULL WHERE decision = 'defer' AND created_at < ?",
                (expire_cutoff,)).rowcount
            conn.execute(
                f"""
                INSERT INTO calibration_rollup (day, memory_type, decision, n, sum_importance, sum_score)
                SELECT substr(created_at, 1, 10), memory_type, decision, COUNT(*), SUM(importance), SUM(COALESCE(score, 0))
                FROM memory_candidates WHERE {clause} GROUP BY 1, 2, 3
                ON CONFLICT(day, memory_type, decision) DO UPDATE SET
                    n = calibration_rollup.n + excluded.n,
                    sum_importance = calibration_rollup.sum_importance + excluded.sum_importance,
                    sum_score = calibration_rollup.sum_score + excluded.sum_score
                """, (cutoff,))
            removed = conn.execute(f"DELETE FROM memory_candidates WHERE {clause}", (cutoff,)).rowcount
            old_owner = conn.execute("DELETE FROM memory_candidates WHERE resolved_by_owner = 1 AND created_at < ?",
                                     (owner_cutoff,)).rowcount
            conn.commit()
        return {"deferred_expired": expired, "rolled_up_and_removed": removed, "old_owner_rows_removed": old_owner}

    def _compact_outbox(self) -> Dict[str, Any]:
        cutoff = (datetime.utcnow() - timedelta(days=14)).isoformat()
        with self._connect() as conn:
            removed = conn.execute("DELETE FROM aims_outbox WHERE status = 'done' AND updated_at < ?", (cutoff,)).rowcount
            conn.commit()
        return {"delivered_rows_removed": removed}

    def _archive_old_memory_files(self, older_than_days: int) -> Dict[str, Any]:
        archive_dir = self.memory_path / "archive"
        archive_dir.mkdir(parents=True, exist_ok=True)
        cutoff = datetime.utcnow().date() - timedelta(days=older_than_days)
        archived = 0
        for path in sorted(self.memory_path.glob("memory_*.jsonl")):
            try:
                day = datetime.strptime(path.stem.replace("memory_", ""), "%Y-%m-%d").date()
            except ValueError:
                continue
            if day >= cutoff:
                continue
            target = archive_dir / f"{path.name}.gz"
            original = path.read_bytes()
            with gzip.open(target, "wb") as handle:
                handle.write(original)
            with gzip.open(target, "rb") as handle:  # verify before removing the original
                if handle.read() != original:
                    target.unlink(missing_ok=True)
                    continue
            path.unlink()
            archived += 1
        return {"archived": archived}

    def _clean_temp(self, retention_days: int) -> Dict[str, Any]:
        cutoff = time.time() - retention_days * 86400
        removed = 0
        for path in self.temp_path.iterdir():
            try:
                if path.is_file() and path.stat().st_mtime < cutoff:
                    path.unlink()
                    removed += 1
            except OSError:
                continue
        return {"removed": removed}

    def _run_aims_cycle(self, min_interval_hours: float = 6.0) -> Dict[str, Any]:
        if self._aims_write_blocked:
            return {"skipped": "AIMS writes blocked pending integrity review"}
        last = self._get_state("aims_maintenance_at")
        if last and datetime.utcnow() - datetime.fromisoformat(last) < timedelta(hours=min_interval_hours):
            return {"skipped": "ran recently"}
        try:
            result = self._aims().maintenance()
        except (AimsUnavailable, AimsRejected) as exc:
            return {"skipped": f"AIMS not available: {str(exc)[:120]}"}
        self._set_state("aims_maintenance_at", datetime.utcnow().isoformat())
        return {"stm_evicted": result.get("stm_evicted"), "vault_stats": result.get("vault_stats")}

    def _optimize_database(self) -> Dict[str, Any]:
        with self._connect() as conn:
            conn.execute("PRAGMA optimize")
            pages = conn.execute("PRAGMA page_count").fetchone()[0]
            free = conn.execute("PRAGMA freelist_count").fetchone()[0]
            vacuumed = False
            if pages and free / pages > 0.2:
                conn.commit()
                conn.execute("VACUUM")
                vacuumed = True
        return {"vacuumed": vacuumed, "free_pages": free}

    # --------------------------------------------------------------- repair
    def run_self_repair(self) -> Dict[str, Any]:
        report: Dict[str, Any] = {"started_at": datetime.utcnow().isoformat(), "steps": {}, "issues": [], "repaired": []}

        def step(name: str, fn):
            try:
                report["steps"][name] = fn(report)
            except Exception as exc:
                report["steps"][name] = {"error": f"{type(exc).__name__}: {exc}"}
                report["issues"].append(f"{name} check crashed: {type(exc).__name__}")

        step("database", self._repair_database)
        step("identity", self._repair_identity)
        step("tuning_file", self._repair_tuning_file)
        step("long_term_index", self._repair_index)
        step("aims", self._repair_aims)
        step("tools", self._check_tools)
        step("grader", self._check_grader_health)

        report["finished_at"] = datetime.utcnow().isoformat()
        self._set_state("last_repair_at", report["finished_at"])
        self._log_memory("self_repair", {"issues": report["issues"], "repaired": report["repaired"]}, source="self_care")
        return report

    def _repair_database(self, report: Dict[str, Any]) -> Dict[str, Any]:
        with self._connect() as conn:
            verdict = conn.execute("PRAGMA integrity_check").fetchone()[0]
        if verdict != "ok":
            backup_dir = self.memory_path / "backup"
            backup_dir.mkdir(parents=True, exist_ok=True)
            backup = backup_dir / f"cali_personal.{datetime.utcnow().strftime('%Y%m%dT%H%M%S')}.db"
            shutil.copy2(self.db_path, backup)
            report["issues"].append("SQLite integrity check failed - backup written, manual review needed")
            self._add_task_once("CALI: SQLite integrity check failed", "cali_repair", 5,
                                f"PRAGMA integrity_check returned: {verdict[:200]}. Backup: {backup.name}")
        self._init_database()  # CREATE IF NOT EXISTS + column migrations restore any missing structure
        self._init_memory_loop_tables()
        if self.tools:
            self.tools._init_table()
        return {"integrity": verdict}

    def _repair_identity(self, report: Dict[str, Any]) -> Dict[str, Any]:
        path = self.vault_path / "cali_identity.json"
        problem = None
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(data, dict) or not data.get("name") or not data.get("principles"):
                problem = "identity file missing required fields"
        except FileNotFoundError:
            problem = "identity file missing"
        except (OSError, ValueError):
            problem = "identity file unreadable"
        if not problem:
            return {"status": "ok"}
        if path.exists():
            path.rename(path.with_name(f"cali_identity.corrupt-{datetime.utcnow().strftime('%Y%m%dT%H%M%S')}.json"))
        self.identity = self._load_identity()  # regenerates the default identity file
        report["repaired"].append(f"identity: {problem} - regenerated from defaults")
        return {"status": "regenerated", "problem": problem}

    def _repair_tuning_file(self, report: Dict[str, Any]) -> Dict[str, Any]:
        path = self.vault_path / "grader_tuning.json"
        if not path.exists():
            return {"status": "absent (defaults in use)"}
        try:
            json.loads(path.read_text(encoding="utf-8"))
            return {"status": "ok"}
        except (OSError, ValueError):
            path.rename(path.with_name(f"grader_tuning.corrupt-{datetime.utcnow().strftime('%Y%m%dT%H%M%S')}.json"))
            report["repaired"].append("grader_tuning.json was unreadable - moved aside, defaults in use")
            return {"status": "reset"}

    def _repair_index(self, report: Dict[str, Any]) -> Dict[str, Any]:
        """Rebuild local index rows for accepted long-term candidates that lost theirs (derived state)."""
        with self._connect() as conn:
            missing = conn.execute(
                """
                SELECT c.* FROM memory_candidates c
                WHERE c.memory_type = 'long_term_candidate' AND c.decision = 'accept' AND c.target = 'a_posteriori'
                  AND NOT EXISTS (SELECT 1 FROM long_term_index i WHERE i.candidate_id = c.id)
                """).fetchall()
            for row in missing:
                conn.execute(
                    "INSERT INTO long_term_index (id, content_hash, content, subject, target, score, status, candidate_id, created_at) "
                    "VALUES (?, ?, ?, ?, 'a_posteriori', ?, 'active', ?, ?)",
                    (self._next_id("ltm", {"c": row["content"]}), self._generate_hash({"c": row["content"]}),
                     row["content"], row["subject"], row["score"], row["id"], datetime.utcnow().isoformat()))
            conn.commit()
        if missing:
            report["repaired"].append(f"long_term_index: rebuilt {len(missing)} row(s) from accepted candidates")
        return {"rebuilt": len(missing)}

    def _repair_aims(self, report: Dict[str, Any]) -> Dict[str, Any]:
        client = self._aims()
        try:
            health = client.health()
        except (AimsUnavailable, AimsRejected) as exc:
            with self._connect() as conn:
                pending = conn.execute("SELECT COUNT(*) FROM aims_outbox WHERE status = 'pending'").fetchone()[0]
            if pending:
                report["issues"].append(f"AIMS unreachable - {pending} promotion(s) queued in outbox")
            return {"reachable": False, "pending_in_outbox": pending, "error": str(exc)[:120]}

        integrity = client.integrity()
        if integrity.get("vault_status") != "verified":
            self._aims_write_blocked = True
            report["issues"].append("AIMS reports ledger corruption - CALI writes to AIMS are paused")
            self._add_task_once("CALI: AIMS vault integrity failure - writes paused", "cali_repair", 5,
                                f"AIMS /api/v1/vault/integrity: {json.dumps(integrity)[:400]}")
            self._log_memory("aims_integrity_failure", {"integrity": integrity}, confidence=1.0, source="self_care")
            return {"reachable": True, "integrity": "corrupted", "writes_paused": True}

        if self._aims_write_blocked:
            report["repaired"].append("AIMS integrity verified - writes resumed")
        self._aims_write_blocked = False
        flushed = self.flush_aims_outbox()
        with self._connect() as conn:
            failed = conn.execute("SELECT COUNT(*) FROM aims_outbox WHERE status = 'failed'").fetchone()[0]
        if failed:
            report["issues"].append(f"{failed} promotion(s) were rejected by AIMS and need review")
            self._add_task_once("CALI: AIMS rejected queued memories", "cali_repair", 4,
                                f"{failed} outbox item(s) have status 'failed' - see aims_outbox.last_error.")
        return {"reachable": True, "entries": health.get("entries"), "integrity": "verified", "outbox": flushed}

    def _check_tools(self, report: Dict[str, Any]) -> Dict[str, Any]:
        if not self.tools:
            return {"status": "no registry"}
        self.tools.reload_manifests()
        health = self.tools.health()
        for bad in health["manifest_errors"]:
            report["issues"].append(f"tool manifest invalid: {bad}")
        for name in health["mcp_commands_missing"]:
            report["issues"].append(f"MCP server '{name}' command not found on PATH")
        for bad in health["degraded_tools"]:
            report["issues"].append(f"tool degraded: {bad['tool']} ({bad['ok_rate']:.0%} ok over {bad['calls']} calls)")
            self.propose_improvement(
                f"Investigate unreliable tool {bad['tool']}",
                f"{bad['tool']} succeeded {bad['ok_rate']:.0%} of {bad['calls']} calls in the last 30 days.",
                {"tool": bad["tool"], **bad})
        return health

    def _check_grader_health(self, report: Dict[str, Any]) -> Dict[str, Any]:
        calibration = self.get_grader_calibration()
        rate, owner_n = calibration.get("owner_approval_rate"), calibration.get("owner_resolved", 0)
        if owner_n >= 20 and rate is not None and (rate < 0.1 or rate > 0.9):
            self.propose_improvement(
                "Revisit memory grader weights",
                f"Over {owner_n} deferred decisions you approved {rate:.0%}. Threshold tuning is bounded, "
                "so the weights themselves may need a human-reviewed change.",
                {"owner_resolved": owner_n, "owner_approval_rate": rate})
            report["issues"].append("grader approval rate is extreme - improvement proposal filed")
        return {"owner_resolved": owner_n, "owner_approval_rate": rate}

    # ------------------------------------------------------------ scheduler
    def schedule_maintenance(self, interval_hours: float = 6.0, first_delay_seconds: float = 600.0) -> bool:
        if self._maintenance_thread and self._maintenance_thread.is_alive():
            return False
        stop = threading.Event()
        self._maintenance_stop = stop

        def loop() -> None:
            if stop.wait(first_delay_seconds):
                return
            while not stop.is_set():
                try:
                    self.run_self_repair()
                    self.run_self_maintenance()
                except Exception as exc:  # the scheduler must never die
                    try:
                        self._log_memory("maintenance_error", {"error": str(exc)[:300]}, source="self_care")
                    except Exception:
                        pass
                if stop.wait(interval_hours * 3600):
                    return

        self._maintenance_thread = threading.Thread(target=loop, name="cali-self-care", daemon=True)
        self._maintenance_thread.start()
        return True

    def stop_maintenance(self) -> None:
        if self._maintenance_stop:
            self._maintenance_stop.set()

    def cognition_status(self) -> Dict[str, Any]:
        with self._connect() as conn:
            outbox = {r[0]: r[1] for r in conn.execute("SELECT status, COUNT(*) FROM aims_outbox GROUP BY status")}
            candidates = {r[0] or "none": r[1] for r in conn.execute(
                "SELECT decision, COUNT(*) FROM memory_candidates GROUP BY decision")}
            working = conn.execute("SELECT COUNT(*) FROM working_memory WHERE expires_at > ?",
                                   (datetime.utcnow().isoformat(),)).fetchone()[0]
        return {
            "working_memory_items": working,
            "candidates_by_decision": candidates,
            "aims_outbox": outbox,
            "aims_writes_blocked": self._aims_write_blocked,
            "grader": self.get_grader_calibration(),
            "tools": self.tools.health() if self.tools else None,
            "last_maintenance_at": self._get_state("last_maintenance_at"),
            "last_repair_at": self._get_state("last_repair_at"),
            "scheduler_running": bool(self._maintenance_thread and self._maintenance_thread.is_alive()),
            "open_improvement_proposals": len(self.list_improvement_proposals()),
        }
