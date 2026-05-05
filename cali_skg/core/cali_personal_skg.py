"""
CALI Personal SKG - KayGee cognition personal assistant core.
"""

from __future__ import annotations

import hashlib
import json
import sqlite3
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional


@dataclass
class CaliMemory:
    timestamp: str
    category: str
    content: Dict[str, Any]
    hash_id: str
    confidence: float
    source: str


class CaliPersonalSKG:
    def __init__(self, base_path: str = "/home/bryan/spruked.com/cali_skg"):
        self.base_path = Path(base_path)
        self.vault_path = self.base_path / "vault"
        self.memory_path = self.base_path / "memory"
        self.temp_path = self.base_path / "temp"

        for path in [self.vault_path, self.memory_path, self.temp_path]:
            path.mkdir(parents=True, exist_ok=True)

        self.db_path = self.memory_path / "cali_personal.db"
        self._init_database()
        self.identity = self._load_identity()
        self.kaygee_config = {
            "endpoint": "http://127.0.0.1:8011",
            "timeout": 30,
            "confidence_threshold": 0.75,
        }

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_database(self) -> None:
        with self._connect() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS contacts (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    type TEXT,
                    phone TEXT,
                    email TEXT,
                    address TEXT,
                    notes TEXT,
                    priority INTEGER DEFAULT 0,
                    created_at TEXT,
                    updated_at TEXT,
                    hash_id TEXT
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS financial_accounts (
                    id TEXT PRIMARY KEY,
                    institution TEXT,
                    account_type TEXT,
                    account_number_hash TEXT,
                    balance REAL,
                    currency TEXT DEFAULT 'USD',
                    notes TEXT,
                    alert_threshold REAL,
                    created_at TEXT,
                    updated_at TEXT
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS events (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    event_type TEXT,
                    start_time TEXT,
                    end_time TEXT,
                    location TEXT,
                    attendees TEXT,
                    priority INTEGER DEFAULT 0,
                    status TEXT DEFAULT 'pending',
                    cali_notified INTEGER DEFAULT 0,
                    created_at TEXT
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS verification_calls (
                    id TEXT PRIMARY KEY,
                    caller_number TEXT,
                    caller_name TEXT,
                    claimed_identity TEXT,
                    verification_status TEXT,
                    verification_method TEXT,
                    notes TEXT,
                    timestamp TEXT,
                    cali_assisted INTEGER DEFAULT 0
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS tasks (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    description TEXT,
                    due_date TEXT,
                    priority INTEGER DEFAULT 1,
                    status TEXT DEFAULT 'active',
                    category TEXT,
                    cali_suggested INTEGER DEFAULT 0,
                    completed_at TEXT,
                    created_at TEXT
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS unanswered (
                    id TEXT PRIMARY KEY,
                    question TEXT,
                    context TEXT,
                    timestamp TEXT,
                    priority INTEGER DEFAULT 1
                )
                """
            )
            conn.commit()

    def _load_identity(self) -> Dict[str, Any]:
        identity_file = self.vault_path / "cali_identity.json"
        if identity_file.exists():
            return json.loads(identity_file.read_text(encoding="utf-8"))

        identity = {
            "name": "Cali",
            "full_name": "Cognitively Aligned Linear Intelligence",
            "version": "1.0.0-Personal",
            "cognition_provider": "KayGee-1.0",
            "purpose": "Personal administrative assistant for Bryan Spruk",
            "domain": "spruked.com admin",
            "created": datetime.utcnow().isoformat(),
            "principles": [
                "Restricted learning - no self-modification",
                "Immutable memory - append-only records",
                "KayGee cognition routing",
                "Admin-only data isolation",
            ],
            "capabilities": [
                "contact_management",
                "financial_tracking",
                "calendar_management",
                "phone_verification",
                "task_assistance",
                "site_navigation",
                "life_planning",
            ],
        }
        identity_file.write_text(json.dumps(identity, indent=2) + "\n", encoding="utf-8")
        return identity

    def _generate_hash(self, content: Dict[str, Any]) -> str:
        return hashlib.sha256(json.dumps(content, sort_keys=True).encode("utf-8")).hexdigest()[:16]

    def _next_id(self, prefix: str, content: Dict[str, Any]) -> str:
        return f"{prefix}_{self._generate_hash({**content, 'ts': datetime.utcnow().isoformat()})}"

    def _log_memory(self, category: str, content: Dict[str, Any], confidence: float = 0.9, source: str = "system") -> None:
        entry = CaliMemory(
            timestamp=datetime.utcnow().isoformat(),
            category=category,
            content=content,
            hash_id=self._generate_hash(content),
            confidence=confidence,
            source=source,
        )
        out_file = self.memory_path / f"memory_{datetime.utcnow().strftime('%Y-%m-%d')}.jsonl"
        with out_file.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(asdict(entry)) + "\n")

    def _rows(self, cursor: sqlite3.Cursor) -> List[Dict[str, Any]]:
        return [dict(row) for row in cursor.fetchall()]

    def prune_knowledge_graph(self, retention_days: int = 90) -> None:
        cutoff = (datetime.utcnow() - timedelta(days=retention_days)).isoformat()
        with self._connect() as conn:
            cur = conn.cursor()
            cur.execute("DELETE FROM tasks WHERE status='completed' AND completed_at < ?", (cutoff,))
            cur.execute("DELETE FROM unanswered WHERE timestamp < ?", (cutoff,))
            cur.execute("DELETE FROM verification_calls WHERE timestamp < ?", (cutoff,))
            conn.commit()

    # Contacts
    def add_contact(
        self,
        name: str,
        contact_type: str = "personal",
        phone: Optional[str] = None,
        email: Optional[str] = None,
        address: Optional[str] = None,
        notes: Optional[str] = None,
        priority: int = 0,
    ) -> Dict[str, Any]:
        contact_id = self._next_id("contact", {"name": name, "type": contact_type})
        now = datetime.utcnow().isoformat()
        hash_id = self._generate_hash({"name": name, "type": contact_type, "phone": phone, "email": email})

        with self._connect() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO contacts (id, name, type, phone, email, address, notes, priority, created_at, updated_at, hash_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (contact_id, name, contact_type, phone, email, address, notes, priority, now, now, hash_id),
            )
            conn.commit()

        self._log_memory("contact", {"action": "add", "contact_id": contact_id, "name": name, "type": contact_type})
        return {"success": True, "contact_id": contact_id, "message": f"Added {name} to your {contact_type} contacts."}

    def search_contacts(self, query: Optional[str] = None, contact_type: Optional[str] = None) -> List[Dict[str, Any]]:
        with self._connect() as conn:
            cur = conn.cursor()
            if query:
                q = f"%{query}%"
                cur.execute(
                    """
                    SELECT * FROM contacts
                    WHERE name LIKE ? OR phone LIKE ? OR email LIKE ? OR notes LIKE ?
                    ORDER BY priority DESC, name ASC
                    """,
                    (q, q, q, q),
                )
            elif contact_type:
                cur.execute("SELECT * FROM contacts WHERE type = ? ORDER BY priority DESC, name ASC", (contact_type,))
            else:
                cur.execute("SELECT * FROM contacts ORDER BY priority DESC, name ASC")
            return self._rows(cur)

    def get_financial_contacts(self) -> List[Dict[str, Any]]:
        return self.search_contacts(contact_type="financial")

    # Financial
    def add_financial_account(
        self,
        institution: str,
        account_type: str,
        account_number: str,
        balance: float = 0.0,
        alert_threshold: Optional[float] = None,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        account_id = self._next_id("fin", {"institution": institution, "account_type": account_type})
        account_hash = hashlib.sha256(account_number.encode("utf-8")).hexdigest()[:32]
        now = datetime.utcnow().isoformat()

        with self._connect() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO financial_accounts
                (id, institution, account_type, account_number_hash, balance, alert_threshold, notes, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (account_id, institution, account_type, account_hash, balance, alert_threshold, notes, now, now),
            )
            conn.commit()

        self._log_memory("financial", {"action": "add_account", "account_id": account_id, "institution": institution})
        return {"success": True, "account_id": account_id, "message": f"Added {account_type} account at {institution}."}

    def get_financial_summary(self) -> Dict[str, Any]:
        with self._connect() as conn:
            cur = conn.cursor()
            cur.execute("SELECT institution, account_type, balance, alert_threshold, currency FROM financial_accounts ORDER BY balance DESC")
            rows = cur.fetchall()

        accounts: List[Dict[str, Any]] = []
        alerts: List[str] = []
        total_balance = 0.0
        currency = "USD"

        for row in rows:
            institution, account_type, balance, threshold, row_currency = row
            balance = float(balance or 0)
            total_balance += balance
            currency = row_currency or currency
            accounts.append({"institution": institution, "type": account_type, "balance": balance})
            if threshold is not None and balance < float(threshold):
                alerts.append(f"{institution} {account_type} below threshold (${balance:.2f} < ${float(threshold):.2f})")

        return {
            "total_balance": total_balance,
            "account_count": len(accounts),
            "accounts": accounts,
            "alerts": alerts,
            "currency": currency,
        }

    # Calendar
    def add_event(
        self,
        title: str,
        event_type: str = "meeting",
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        location: Optional[str] = None,
        attendees: Optional[List[str]] = None,
        priority: int = 0,
    ) -> Dict[str, Any]:
        event_id = self._next_id("evt", {"title": title, "event_type": event_type})
        now = datetime.utcnow().isoformat()

        with self._connect() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO events (id, title, event_type, start_time, end_time, location, attendees, priority, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (event_id, title, event_type, start_time, end_time, location, json.dumps(attendees or []), priority, now),
            )
            conn.commit()

        self._log_memory("calendar", {"action": "add_event", "event_id": event_id, "title": title})
        return {"success": True, "event_id": event_id, "message": f"Added '{title}' to your calendar."}

    def get_upcoming_events(self, days: int = 7) -> List[Dict[str, Any]]:
        now = datetime.utcnow().isoformat()
        future = (datetime.utcnow() + timedelta(days=days)).isoformat()
        with self._connect() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                SELECT * FROM events
                WHERE status != 'cancelled'
                  AND start_time IS NOT NULL
                  AND start_time BETWEEN ? AND ?
                ORDER BY start_time ASC
                """,
                (now, future),
            )
            events = self._rows(cur)

        for event in events:
            raw_attendees = event.get("attendees")
            if raw_attendees:
                try:
                    event["attendees"] = json.loads(raw_attendees)
                except json.JSONDecodeError:
                    event["attendees"] = []
            else:
                event["attendees"] = []

        return events

    def _generate_briefing_text(
        self,
        events: List[Dict[str, Any]],
        tasks: List[Dict[str, Any]],
        financial: Dict[str, Any],
    ) -> str:
        lines = [f"Good morning. Today is {datetime.utcnow().strftime('%A, %B %d')}." ]

        if events:
            lines.append(f"You have {len(events)} event{'s' if len(events) != 1 else ''} today.")
            for event in events[:3]:
                lines.append(f"- {event.get('title', 'Untitled')} at {event.get('start_time', 'TBD')}")
        else:
            lines.append("Your calendar is clear today.")

        urgent_tasks = [task for task in tasks if int(task.get("priority", 0)) >= 4]
        if urgent_tasks:
            lines.append(f"You have {len(urgent_tasks)} high-priority tasks.")

        alerts = financial.get("alerts", [])
        if alerts:
            lines.append("Financial alerts: " + "; ".join(alerts))

        return "\n".join(lines)

    def get_today_briefing(self) -> Dict[str, Any]:
        events = self.get_upcoming_events(days=1)
        tasks = self.get_active_tasks()
        financial = self.get_financial_summary()
        urgent_events = [event for event in events if int(event.get("priority", 0)) >= 3]
        urgent_tasks = [task for task in tasks if int(task.get("priority", 0)) >= 4]

        return {
            "date": datetime.utcnow().strftime("%Y-%m-%d"),
            "events_today": len(events),
            "urgent_events": urgent_events,
            "active_tasks": len(tasks),
            "urgent_tasks": urgent_tasks,
            "financial_alerts": financial.get("alerts", []),
            "briefing_text": self._generate_briefing_text(events, tasks, financial),
        }

    # Verification
    def _get_caller_context(self, caller_number: str) -> Dict[str, Any]:
        contacts = self.search_contacts(query=caller_number)
        if not contacts:
            return {"known": False}

        contact = contacts[0]
        return {
            "known": True,
            "contact": contact,
            "financial_associated": any(c.get("type") == "financial" for c in contacts),
        }

    def _generate_verification_advice(self, status: str, context: Dict[str, Any]) -> str:
        if status == "likely_verified" and context.get("known"):
            return f"This appears to be {context['contact']['name']} from your contacts."
        if status == "suspicious" and context.get("known"):
            return f"Warning: number matches {context['contact']['name']} but identity claim is inconsistent."
        return "Unknown caller. Consider callback verification before sharing private information."

    def log_verification_call(
        self,
        caller_number: str,
        caller_name: Optional[str] = None,
        claimed_identity: Optional[str] = None,
    ) -> Dict[str, Any]:
        call_id = self._next_id("call", {"caller_number": caller_number})
        now = datetime.utcnow().isoformat()
        verification_status = "pending"
        verification_method: Optional[str] = None

        with self._connect() as conn:
            cur = conn.cursor()
            cur.execute("SELECT name, type FROM contacts WHERE phone LIKE ?", (f"%{caller_number}%",))
            match = cur.fetchone()

            if match:
                contact_name = match[0]
                if caller_name and caller_name.strip().lower() == str(contact_name).strip().lower():
                    verification_status = "likely_verified"
                    verification_method = "known_contact"
                else:
                    verification_status = "suspicious"
                    verification_method = "identity_mismatch"

            cur.execute(
                """
                INSERT INTO verification_calls
                (id, caller_number, caller_name, claimed_identity, verification_status, verification_method, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (call_id, caller_number, caller_name, claimed_identity, verification_status, verification_method, now),
            )
            conn.commit()

        context = self._get_caller_context(caller_number)
        return {
            "call_id": call_id,
            "status": verification_status,
            "method": verification_method,
            "context": context,
            "cali_suggestion": self._generate_verification_advice(verification_status, context),
        }

    def get_verification_queue(self) -> List[Dict[str, Any]]:
        with self._connect() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                SELECT * FROM verification_calls
                WHERE verification_status IN ('pending', 'suspicious')
                ORDER BY timestamp DESC
                LIMIT 25
                """
            )
            return self._rows(cur)

    # Tasks
    def add_task(
        self,
        title: str,
        description: Optional[str] = None,
        due_date: Optional[str] = None,
        priority: int = 1,
        category: str = "personal",
        cali_suggested: bool = False,
    ) -> Dict[str, Any]:
        task_id = self._next_id("task", {"title": title, "category": category})
        now = datetime.utcnow().isoformat()

        with self._connect() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO tasks (id, title, description, due_date, priority, category, cali_suggested, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (task_id, title, description, due_date, priority, category, int(cali_suggested), now),
            )
            conn.commit()

        self._log_memory("task", {"action": "add_task", "task_id": task_id, "title": title})
        return {"success": True, "task_id": task_id, "message": f"Added task: {title}"}

    def get_active_tasks(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        with self._connect() as conn:
            cur = conn.cursor()
            if category:
                cur.execute(
                    """
                    SELECT * FROM tasks
                    WHERE status = 'active' AND category = ?
                    ORDER BY priority DESC, COALESCE(due_date, '9999-12-31T00:00:00') ASC
                    """,
                    (category,),
                )
            else:
                cur.execute(
                    """
                    SELECT * FROM tasks
                    WHERE status = 'active'
                    ORDER BY priority DESC, COALESCE(due_date, '9999-12-31T00:00:00') ASC
                    """
                )
            return self._rows(cur)

    def complete_task(self, task_id: str) -> Dict[str, Any]:
        now = datetime.utcnow().isoformat()
        with self._connect() as conn:
            cur = conn.cursor()
            cur.execute("UPDATE tasks SET status='completed', completed_at=? WHERE id=?", (now, task_id))
            conn.commit()
        self._log_memory("task", {"action": "complete_task", "task_id": task_id})
        return {"success": True, "message": "Task marked complete."}

    # Site context
    def get_site_context(self, current_path: str = "/") -> Dict[str, Any]:
        pages = {
            "/": {"title": "Home", "description": "Spruked landing"},
            "/products/truemark-mint": {"title": "TrueMark Mint", "description": "K-NFT minting workflow"},
            "/goat": {"title": "The GOAT", "description": "Audiobook platform"},
            "/admin": {"title": "Admin", "description": "Operations hub"},
        }
        current = pages.get(current_path, {"title": "Unknown", "description": ""})
        actions = ["Go to Admin", "Open TrueMark Mint", "Check ORB status"]
        if current_path == "/admin":
            actions = ["Check daily briefing", "Review verification queue", "Add contact"]
        return {
            "current_page": current,
            "current_path": current_path,
            "available_pages": pages,
            "suggested_actions": actions,
        }

    # Learning queue
    def save_unanswered(self, question: str, context: Optional[str] = None) -> Dict[str, Any]:
        record_id = self._next_id("q", {"question": question})
        with self._connect() as conn:
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO unanswered (id, question, context, timestamp) VALUES (?, ?, ?, ?)",
                (record_id, question, context, datetime.utcnow().isoformat()),
            )
            conn.commit()
        return {"saved": True, "id": record_id}

    def get_stats(self) -> Dict[str, Any]:
        counts: Dict[str, int] = {}
        with self._connect() as conn:
            cur = conn.cursor()
            for table in ["contacts", "financial_accounts", "events", "tasks", "verification_calls"]:
                cur.execute(f"SELECT COUNT(*) AS n FROM {table}")
                counts[table] = int(cur.fetchone()[0])

            cur.execute("SELECT COUNT(*) FROM tasks WHERE status='active'")
            counts["active_tasks"] = int(cur.fetchone()[0])

            cur.execute("SELECT COUNT(*) FROM unanswered")
            counts["unanswered_questions"] = int(cur.fetchone()[0])

        return {**counts, "identity": self.identity, "last_pruned": datetime.utcnow().isoformat()}

    # Query routing
    def _parse_intent(self, query: str) -> Dict[str, Any]:
        q = query.lower().strip()

        if any(token in q for token in ["verification", "who called", "incoming call", "caller"]):
            return {"type": "verification_queue"}
        if any(token in q for token in ["connect my bank", "connect bank", "link my bank", "link bank", "connect institution", "link institution"]):
            return {"type": "connect_bank", "params": {"request": query}}
        if any(token in q for token in ["remember this", "remember that", "note this", "note that", "add this", "add that"]):
            cleaned = (
                query.replace("remember this", "")
                .replace("remember that", "")
                .replace("note this", "")
                .replace("note that", "")
                .replace("add this", "")
                .replace("add that", "")
                .strip()
            ) or query.strip()
            return {"type": "add_task", "params": {"title": cleaned, "category": "personal", "priority": 3}}
        if q.startswith("add task") or q.startswith("remind me to") or " task " in f" {q} ":
            title = query.replace("add task", "").replace("remind me to", "").strip() or "New Task"
            return {"type": "add_task", "params": {"title": title, "category": "personal", "priority": 3}}
        if any(token in q for token in ["balance", "financial", "bank", "account", "money"]):
            return {"type": "financial_summary"}
        if any(token in q for token in ["today", "schedule", "calendar", "briefing"]):
            return {"type": "daily_briefing"}
        if any(token in q for token in ["contact", "phone", "email"]):
            return {"type": "contact_query", "params": {"name": query}}
        if any(token in q for token in ["go to", "navigate", "where am i", "page"]):
            return {"type": "site_nav"}
        return {"type": "unknown"}

    def _format_contact_results(self, contacts: List[Dict[str, Any]]) -> str:
        if not contacts:
            return "I could not find matching contacts."
        if len(contacts) == 1:
            contact = contacts[0]
            return f"Found {contact['name']} ({contact['type']}): {contact.get('phone') or 'No phone'} | {contact.get('email') or 'No email'}"
        return f"Found {len(contacts)} contacts: " + ", ".join(c["name"] for c in contacts[:6])

    def process_query(self, query: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        intent = self._parse_intent(query)
        intent_type = intent["type"]

        if intent_type == "contact_query":
            contacts = self.search_contacts(query=intent.get("params", {}).get("name", ""))
            return {"response": self._format_contact_results(contacts), "data": contacts, "intent": intent}

        if intent_type == "financial_summary":
            summary = self.get_financial_summary()
            response = (
                f"Your total balance across {summary['account_count']} accounts is "
                f"${summary['total_balance']:.2f}."
            )
            return {"response": response, "data": summary, "intent": intent}

        if intent_type == "daily_briefing":
            briefing = self.get_today_briefing()
            return {"response": briefing["briefing_text"], "data": briefing, "intent": intent}

        if intent_type == "add_task":
            params = intent.get("params", {})
            task = self.add_task(
                title=params.get("title", "New Task"),
                priority=int(params.get("priority", 3)),
                category=str(params.get("category", "personal")),
            )
            return {"response": task["message"], "data": task, "intent": intent}

        if intent_type == "connect_bank":
            bank_task = self.add_task(
                title=f"Bank connection requested: {intent.get('params', {}).get('request', 'Bank link')}",
                priority=5,
                category="financial",
                cali_suggested=True,
            )
            return {
                "response": (
                    "I queued your bank-link setup request. Next step is secure institution linking so I can track balances "
                    "and support checkout routing for your business accounts."
                ),
                "data": bank_task,
                "intent": intent,
            }

        if intent_type == "verification_queue":
            queue = self.get_verification_queue()
            return {"response": f"You have {len(queue)} calls requiring verification attention.", "data": queue, "intent": intent}

        if intent_type == "site_nav":
            nav = self.get_site_context((context or {}).get("current_path", "/admin"))
            return {
                "response": f"You are on {nav['current_page']['title']}. {nav['current_page']['description']}",
                "data": nav,
                "intent": intent,
            }

        self.save_unanswered(query, json.dumps(context or {}))
        return {
            "response": "I do not have a dedicated function for that yet. I saved it in the learning queue.",
            "data": None,
            "intent": {"type": "unknown"},
        }


_cali_skg: Optional[CaliPersonalSKG] = None


def get_cali_skg(base_path: str = "/home/bryan/spruked.com/cali_skg") -> CaliPersonalSKG:
    global _cali_skg
    if _cali_skg is None:
        _cali_skg = CaliPersonalSKG(base_path=base_path)
    return _cali_skg
