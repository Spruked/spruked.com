'use client';

import { useEffect, useState } from 'react';

type HubTab = 'overview' | 'contacts' | 'financial' | 'calendar' | 'verification' | 'tasks';

type CaliOperationsHubProps = { adminToken: string };

type AnyRecord = Record<string, any>;

async function callCali<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.detail || data?.error || data?.message || `Request failed: ${response.status}`);
  }
  return data as T;
}

function iso(value: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export default function CaliOperationsHub({ adminToken }: CaliOperationsHubProps) {
  const [tab, setTab] = useState<HubTab>('overview');
  const [status, setStatus] = useState<string>('');
  const [stats, setStats] = useState<AnyRecord | null>(null);
  const [briefing, setBriefing] = useState<AnyRecord | null>(null);

  const [contacts, setContacts] = useState<AnyRecord[]>([]);
  const [financial, setFinancial] = useState<AnyRecord | null>(null);
  const [events, setEvents] = useState<AnyRecord[]>([]);
  const [calls, setCalls] = useState<AnyRecord[]>([]);
  const [tasks, setTasks] = useState<AnyRecord[]>([]);
  const [assistantQuery, setAssistantQuery] = useState('');
  const [assistantReply, setAssistantReply] = useState('');

  const [name, setName] = useState('');
  const [contactType, setContactType] = useState('personal');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [institution, setInstitution] = useState('');
  const [accountType, setAccountType] = useState('checking');
  const [accountNumber, setAccountNumber] = useState('');
  const [balance, setBalance] = useState('0');

  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState('meeting');
  const [eventStart, setEventStart] = useState('');

  const [callerNumber, setCallerNumber] = useState('');
  const [callerName, setCallerName] = useState('');

  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState('1');

  const loadOverview = async () => {
    if (!adminToken.trim()) return;
    try {
      const [s, b] = await Promise.all([
        callCali<{ stats: AnyRecord }>('/api/cali/status', adminToken),
        callCali<AnyRecord>('/api/cali/calendar/today', adminToken),
      ]);
      setStats(s.stats);
      setBriefing(b);
      setStatus('Cali hub loaded.');
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  const loadAll = async () => {
    if (!adminToken.trim()) return;
    try {
      const [c, f, e, v, t] = await Promise.all([
        callCali<{ contacts: AnyRecord[] }>('/api/cali/contacts', adminToken),
        callCali<AnyRecord>('/api/cali/financial/summary', adminToken),
        callCali<{ events: AnyRecord[] }>('/api/cali/calendar/upcoming?days=30', adminToken),
        callCali<{ calls: AnyRecord[] }>('/api/cali/verification/queue', adminToken),
        callCali<{ tasks: AnyRecord[] }>('/api/cali/tasks', adminToken),
      ]);
      setContacts(c.contacts || []);
      setFinancial(f);
      setEvents(e.events || []);
      setCalls(v.calls || []);
      setTasks(t.tasks || []);
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  useEffect(() => {
    void Promise.all([loadOverview(), loadAll()]);
    // loadOverview/loadAll intentionally re-evaluate with current token only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken]);

  if (!adminToken.trim()) {
    return (
      <section className="rounded-2xl border border-gray-900 bg-black/70 p-6">
        <h2 className="text-2xl font-semibold text-light">Cali Operations Hub</h2>
        <p className="mt-2 text-sm text-gray-400">Enter Admin Token above to unlock Cali personal assistant workflows.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-900 bg-black/70 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-light">Cali Operations Hub</h2>
          <p className="text-sm text-gray-400">KayGee cognition personal assistant controls.</p>
        </div>
        <button
          type="button"
          onClick={() => void Promise.all([loadOverview(), loadAll()])}
          className="rounded-full border border-gray-700 px-4 py-2 text-xs uppercase tracking-widest text-gray-300 hover:border-light hover:text-light"
        >
          Refresh
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(['overview', 'contacts', 'financial', 'calendar', 'verification', 'tasks'] as HubTab[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`rounded-full px-4 py-2 text-xs uppercase tracking-widest ${
              tab === value ? 'bg-emerald-500/20 text-emerald-300' : 'border border-gray-700 text-gray-400 hover:text-light'
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      {status ? <p className="mt-3 text-sm text-gray-400">{status}</p> : null}

      <form
        className="mt-4 rounded-lg border border-gray-900 bg-[#050505] p-4"
        onSubmit={(event) => {
          event.preventDefault();
          const prompt = assistantQuery.trim();
          if (!prompt) return;
          setStatus('Cali is thinking...');
          void fetch('/api/orb', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-cali-context': 'admin',
            },
            body: JSON.stringify({
              action: 'query',
              prompt,
              context: { source: 'admin', currentPath: '/admin' },
            }),
          })
            .then(async (response) => {
              const data = await response.json();
              if (!response.ok) {
                throw new Error(data?.message || 'Cali query failed.');
              }
              setAssistantReply(String(data?.response || 'Cali is online.'));
              setAssistantQuery('');
              setStatus('Cali responded.');
            })
            .catch((error) => setStatus((error as Error).message));
        }}
      >
        <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Ask Cali (ORB Admin Mode)</p>
        <div className="mt-2 flex flex-col gap-2 md:flex-row">
          <input
            id="cali-assistant-query"
            name="caliAssistantQuery"
            value={assistantQuery}
            onChange={(event) => setAssistantQuery(event.target.value)}
            placeholder="Cali, help me prioritize today."
            className="flex-1 rounded border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-light"
          />
          <button
            type="submit"
            className="rounded-full bg-emerald-500 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-black"
          >
            Ask
          </button>
        </div>
        {assistantReply ? <p className="mt-3 text-sm text-gray-200">{assistantReply}</p> : null}
      </form>

      {tab === 'overview' ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card label="Contacts" value={stats?.contacts || 0} />
          <Card label="Financial Accounts" value={stats?.financial_accounts || 0} />
          <Card label="Events" value={stats?.events || 0} />
          <Card label="Active Tasks" value={stats?.active_tasks || 0} />
          <Card label="Verification Calls" value={stats?.verification_calls || 0} />
          <Card label="Learning Queue" value={stats?.unanswered_questions || 0} />
          {briefing?.briefing_text ? (
            <article className="sm:col-span-2 lg:col-span-3 rounded-lg border border-emerald-900/50 bg-emerald-500/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Daily Briefing</p>
              <p className="mt-2 whitespace-pre-line text-sm text-gray-200">{briefing.briefing_text}</p>
            </article>
          ) : null}
        </div>
      ) : null}

      {tab === 'contacts' ? (
        <div className="mt-4 space-y-3">
          <form
            className="grid gap-3 rounded-lg border border-gray-900 bg-[#050505] p-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              void callCali('/api/cali/contacts', adminToken, {
                method: 'POST',
                body: JSON.stringify({ name, contact_type: contactType, phone: phone || null, email: email || null }),
              })
                .then(() => {
                  setName('');
                  setPhone('');
                  setEmail('');
                  return loadAll();
                })
                .catch((error) => setStatus((error as Error).message));
            }}
          >
            <input id="cali-name" name="caliName" required value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" className="rounded border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-light" />
            <select id="cali-contact-type" name="caliContactType" value={contactType} onChange={(event) => setContactType(event.target.value)} className="rounded border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-light"><option value="personal">Personal</option><option value="financial">Financial</option><option value="business">Business</option><option value="family">Family</option></select>
            <input id="cali-phone" name="caliPhone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Phone" className="rounded border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-light" />
            <input id="cali-email" name="caliEmail" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="rounded border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-light" />
            <button type="submit" className="md:col-span-2 rounded-full bg-emerald-500 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-black">Add Contact</button>
          </form>

          <div className="space-y-2">{contacts.map((contact) => <Item key={contact.id} title={contact.name} subtitle={`${contact.type} • ${contact.phone || contact.email || 'No contact info'}`} />)}</div>
        </div>
      ) : null}

      {tab === 'financial' ? (
        <div className="mt-4 space-y-3">
          <form
            className="grid gap-3 rounded-lg border border-gray-900 bg-[#050505] p-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              void callCali('/api/cali/financial/accounts', adminToken, {
                method: 'POST',
                body: JSON.stringify({ institution, account_type: accountType, account_number: accountNumber, balance: Number(balance || '0') }),
              })
                .then(() => {
                  setInstitution('');
                  setAccountNumber('');
                  setBalance('0');
                  return loadAll();
                })
                .catch((error) => setStatus((error as Error).message));
            }}
          >
            <input id="cali-institution" name="caliInstitution" required value={institution} onChange={(event) => setInstitution(event.target.value)} placeholder="Institution" className="rounded border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-light" />
            <select id="cali-account-type" name="caliAccountType" value={accountType} onChange={(event) => setAccountType(event.target.value)} className="rounded border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-light"><option value="checking">Checking</option><option value="savings">Savings</option><option value="investment">Investment</option><option value="credit">Credit</option><option value="loan">Loan</option></select>
            <input id="cali-account-number" name="caliAccountNumber" required value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} placeholder="Account Number" className="rounded border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-light" />
            <input id="cali-balance" name="caliBalance" type="number" step="0.01" value={balance} onChange={(event) => setBalance(event.target.value)} placeholder="Balance" className="rounded border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-light" />
            <button type="submit" className="md:col-span-2 rounded-full bg-emerald-500 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-black">Add Account</button>
          </form>

          <article className="rounded-lg border border-gray-900 bg-[#050505] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Total Balance</p>
            <p className="mt-2 text-3xl font-semibold text-light">{financial?.currency || 'USD'} {Number(financial?.total_balance || 0).toFixed(2)}</p>
          </article>
        </div>
      ) : null}

      {tab === 'calendar' ? (
        <div className="mt-4 space-y-3">
          <form
            className="grid gap-3 rounded-lg border border-gray-900 bg-[#050505] p-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              void callCali('/api/cali/calendar/events', adminToken, {
                method: 'POST',
                body: JSON.stringify({ title: eventTitle, event_type: eventType, start_time: iso(eventStart) }),
              })
                .then(() => {
                  setEventTitle('');
                  setEventStart('');
                  return loadAll();
                })
                .catch((error) => setStatus((error as Error).message));
            }}
          >
            <input id="cali-event-title" name="caliEventTitle" required value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} placeholder="Event title" className="rounded border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-light" />
            <select id="cali-event-type" name="caliEventType" value={eventType} onChange={(event) => setEventType(event.target.value)} className="rounded border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-light"><option value="meeting">Meeting</option><option value="deadline">Deadline</option><option value="reminder">Reminder</option><option value="personal">Personal</option></select>
            <input id="cali-event-start" name="caliEventStart" type="datetime-local" value={eventStart} onChange={(event) => setEventStart(event.target.value)} className="rounded border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-light" />
            <button type="submit" className="rounded-full bg-emerald-500 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-black">Add Event</button>
          </form>

          <div className="space-y-2">{events.map((event) => <Item key={event.id} title={event.title} subtitle={`${event.event_type} • ${event.start_time || 'TBD'}`} />)}</div>
        </div>
      ) : null}

      {tab === 'verification' ? (
        <div className="mt-4 space-y-3">
          <form
            className="grid gap-3 rounded-lg border border-gray-900 bg-[#050505] p-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              void callCali('/api/cali/verification/call', adminToken, {
                method: 'POST',
                body: JSON.stringify({ caller_number: callerNumber, caller_name: callerName || null }),
              })
                .then(() => {
                  setCallerNumber('');
                  setCallerName('');
                  return loadAll();
                })
                .catch((error) => setStatus((error as Error).message));
            }}
          >
            <input id="cali-caller-number" name="caliCallerNumber" required value={callerNumber} onChange={(event) => setCallerNumber(event.target.value)} placeholder="Caller number" className="rounded border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-light" />
            <input id="cali-caller-name" name="caliCallerName" value={callerName} onChange={(event) => setCallerName(event.target.value)} placeholder="Caller name" className="rounded border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-light" />
            <button type="submit" className="md:col-span-2 rounded-full bg-emerald-500 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-black">Log Call</button>
          </form>

          <div className="space-y-2">{calls.map((call) => <Item key={call.id} title={call.caller_name || 'Unknown caller'} subtitle={`${call.caller_number} • ${call.verification_status}`} />)}</div>
        </div>
      ) : null}

      {tab === 'tasks' ? (
        <div className="mt-4 space-y-3">
          <form
            className="grid gap-3 rounded-lg border border-gray-900 bg-[#050505] p-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              void callCali('/api/cali/tasks', adminToken, {
                method: 'POST',
                body: JSON.stringify({ title: taskTitle, priority: Number(taskPriority || '1') }),
              })
                .then(() => {
                  setTaskTitle('');
                  setTaskPriority('1');
                  return loadAll();
                })
                .catch((error) => setStatus((error as Error).message));
            }}
          >
            <input id="cali-task-title" name="caliTaskTitle" required value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Task title" className="rounded border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-light" />
            <input id="cali-task-priority" name="caliTaskPriority" type="number" min={1} max={5} value={taskPriority} onChange={(event) => setTaskPriority(event.target.value)} className="rounded border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-light" />
            <button type="submit" className="md:col-span-2 rounded-full bg-emerald-500 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-black">Add Task</button>
          </form>

          <div className="space-y-2">
            {tasks.map((task) => (
              <article key={task.id} className="rounded-lg border border-gray-900 bg-[#050505] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-light">{task.title}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{task.category} • priority {task.priority}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void callCali(`/api/cali/tasks/${encodeURIComponent(task.id)}/complete`, adminToken, { method: 'POST' })
                        .then(() => loadAll())
                        .catch((error) => setStatus((error as Error).message));
                    }}
                    className="rounded-full border border-emerald-800 px-3 py-1 text-xs uppercase tracking-widest text-emerald-300 hover:border-emerald-500"
                  >
                    Done
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-lg border border-gray-900 bg-[#050505] p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-light">{value}</p>
    </article>
  );
}

function Item({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <article className="rounded-lg border border-gray-900 bg-[#050505] p-3">
      <p className="text-sm font-semibold text-light">{title}</p>
      <p className="mt-1 text-xs text-gray-400">{subtitle}</p>
    </article>
  );
}
