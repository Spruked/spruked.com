'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PageSlug } from '@/data/page-content';
import { PAGE_SLUGS, pageContentDefaults } from '@/data/page-content';
import CaliOperationsHub from '@/components/admin/CaliOperationsHub';

type AdminView = 'content' | 'session';

type OrbState = {
  site_id: string;
  orb_id: string;
  display_name: string;
  frontend_component: string;
  endpoint: string;
  handler: string;
  reasoning_profile: string;
  context_source: string;
  reasoning_mode: 'local' | 'shared' | 'hybrid';
  fallback_state: string;
  last_reasoning_timestamp: string | null;
  voice_engine: string;
  voice_profile: string;
  tts_ready: boolean;
  last_synthesis_timestamp: string | null;
  last_error: string | null;
  service_health: string;
  orb_health: string;
  reasoning_state: string;
  voice_state: string;
  classification: string;
  updated_at: string;
};
type SessionPanel = 'dashboard' | 'routine' | 'reflection' | 'deepdive' | 'diagnostics' | 'custom' | 'personalization';

type SystemScanResult = {
  name: string;
  path: string;
  root: string;
  has_package_json: boolean;
  has_git: boolean;
  has_readme: boolean;
  has_src_or_app: boolean;
  last_modified: string | null;
};

type VaultEntry = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  created_at: string;
  updated_at: string;
};

type VaultCategory = {
  key: string;
  label: string;
  description: string;
  created_at: string;
  updated_at: string;
  entries: VaultEntry[];
};

type VaultData = {
  schema_version: string;
  updated_at: string;
  categories: VaultCategory[];
};

const slugLabels: Record<PageSlug, string> = {
  'true-mark-mint': 'True Mark Mint',
  goat: 'The GOAT',
};

const sessionPanels: Array<{
  id: SessionPanel;
  label: string;
  title: string;
  description: string;
  bullets: string[];
}> = [
  {
    id: 'dashboard',
    label: 'Strategic Dashboard',
    title: 'Life Goals and Strategic Timeline',
    description: 'ProPrime strategic frame for long-horizon execution and daily alignment.',
    bullets: [
      'Track active strategic goals and upcoming milestones',
      'Keep financial systems planning visible every session',
      'Log execution momentum and bottlenecks',
    ],
  },
  {
    id: 'routine',
    label: 'Routine Planner',
    title: 'Daily and Weekly Routine Planning',
    description: 'Define repeatable routines to protect consistency and momentum.',
    bullets: [
      'Morning startup ritual and priority locking',
      'Deep-work windows and recovery blocks',
      'Weekly review checkpoints',
    ],
  },
  {
    id: 'reflection',
    label: 'Daily Briefings',
    title: 'Morning and Evening Reflection',
    description: 'Convert daily outcomes into reusable lessons and decisions.',
    bullets: [
      'Morning objective briefing',
      'End-of-day result reflection',
      'Carry-forward decisions for next session',
    ],
  },
  {
    id: 'deepdive',
    label: 'Deep Dive Days',
    title: 'Focused Research and Build Sprints',
    description: 'Reserve themed sessions for intensive R&D and architecture work.',
    bullets: [
      'Theme-based sprint planning',
      'Outcome scorecard per deep dive day',
      'Artifact and decision archive handoff',
    ],
  },
  {
    id: 'diagnostics',
    label: 'Habit Diagnostics',
    title: 'Habit and Throughput Diagnostics',
    description: 'Surface where execution quality drops and what to adjust first.',
    bullets: [
      'Execution friction mapping',
      'Habit adherence snapshots',
      'Intervention recommendations',
    ],
  },
  {
    id: 'custom',
    label: 'Custom Prompts',
    title: 'Custom Prompt Operations',
    description: 'Create reusable prompt patterns for repeated high-value tasks.',
    bullets: [
      'Template prompts by domain',
      'Rapid issue triage prompts',
      'Client and systems inquiry playbooks',
    ],
  },
  {
    id: 'personalization',
    label: 'Personalize',
    title: 'Interaction and Tone Personalization',
    description: 'Tune response behavior and interaction rhythm to your workflow.',
    bullets: [
      'Communication style presets',
      'Session pacing controls',
      'Escalation and review thresholds',
    ],
  },
];

export default function AdminPage() {
  const [view, setView] = useState<AdminView>('session');
  const [sessionPanel, setSessionPanel] = useState<SessionPanel>('dashboard');
  const [slug, setSlug] = useState<PageSlug>('true-mark-mint');
  const [editorValue, setEditorValue] = useState(() => JSON.stringify(pageContentDefaults['true-mark-mint'], null, 2));
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [scanResults, setScanResults] = useState<SystemScanResult[]>([]);
  const [orbLoading, setOrbLoading] = useState(false);
  const [orbStatus, setOrbStatus] = useState<string | null>(null);
  const [orbStates, setOrbStates] = useState<OrbState[]>([]);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [vaultStatus, setVaultStatus] = useState<string | null>(null);
  const [vaultData, setVaultData] = useState<VaultData | null>(null);
  const [selectedVaultCategory, setSelectedVaultCategory] = useState('');
  const [newCategoryLabel, setNewCategoryLabel] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [newEntryTitle, setNewEntryTitle] = useState('');
  const [newEntryBody, setNewEntryBody] = useState('');
  const [newEntryTags, setNewEntryTags] = useState('');
  const [strategicGoals, setStrategicGoals] = useState<string[]>([
    'Build Spruked + TrueMark + Orb ecosystem to stable production',
    'Operationalize ProPrime financial systems into admin workflows',
    'Maintain continuity layer and high-trust support operations',
  ]);
  const [newGoal, setNewGoal] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setStatus('Fetching content...');
      try {
        const response = await fetch(`/api/page-content?slug=${slug}`, { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load content');
        }
        setEditorValue(JSON.stringify(data.content, null, 2));
        setStatus('Content loaded.');
      } catch (error) {
        setStatus((error as Error).message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  const activePanel = useMemo(
    () => sessionPanels.find((panel) => panel.id === sessionPanel) ?? sessionPanels[0],
    [sessionPanel],
  );

  const activeVaultCategory = useMemo(() => {
    const categories = vaultData?.categories || [];
    if (categories.length === 0) {
      return null;
    }
    return categories.find((category) => category.key === selectedVaultCategory) || categories[0];
  }, [selectedVaultCategory, vaultData]);

  const applyVaultData = (next: VaultData) => {
    setVaultData(next);
    if (!next.categories.length) {
      setSelectedVaultCategory('');
      return;
    }
    setSelectedVaultCategory((current) => {
      if (current && next.categories.some((category) => category.key === current)) {
        return current;
      }
      return next.categories[0].key;
    });
  };

  const handleSave = async () => {
    setLoading(true);
    setStatus('Saving...');
    try {
      const parsed = JSON.parse(editorValue);
      const response = await fetch(`/api/page-content?slug=${slug}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(parsed),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save content');
      }
      setStatus('Saved successfully.');
    } catch (error) {
      setStatus((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setEditorValue(JSON.stringify(pageContentDefaults[slug], null, 2));
    setStatus('Reset to defaults (not saved).');
  };

  const handleAddGoal = () => {
    const normalized = newGoal.trim();
    if (!normalized) {
      return;
    }
    setStrategicGoals((current) => [normalized, ...current]);
    setNewGoal('');
  };

  const handleScanSystems = async () => {
    setScanLoading(true);
    setScanStatus('Scanning for ProPrime and financial systems...');
    try {
      if (!token.trim()) {
        throw new Error('Enter Admin Token before scanning.');
      }

      const response = await fetch('/api/admin/system-scan', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'System scan failed.');
      }

      const systems = Array.isArray(data.systems) ? (data.systems as SystemScanResult[]) : [];
      setScanResults(systems);
      setScanStatus(`Scan complete. Found ${systems.length} candidate systems.`);
    } catch (error) {
      setScanStatus((error as Error).message);
    } finally {
      setScanLoading(false);
    }
  };


  const handleRefreshOrbState = async () => {
    setOrbLoading(true);
    setOrbStatus('Loading substrate ORB state...');
    try {
      if (!token.trim()) {
        throw new Error('Enter Admin Token before loading ORB state.');
      }

      const response = await fetch('/api/admin/orb-state', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'ORB state load failed.');
      }

      const orbs = Array.isArray(data.orbs) ? (data.orbs as OrbState[]) : [];
      setOrbStates(orbs);
      setOrbStatus(`Loaded ${orbs.length} substrate ORB state records.`);
    } catch (error) {
      setOrbStatus((error as Error).message);
    } finally {
      setOrbLoading(false);
    }
  };

  const handleRefreshVault = async () => {
    setVaultLoading(true);
    setVaultStatus('Loading admin vault...');
    try {
      if (!token.trim()) {
        throw new Error('Enter Admin Token before loading vault.');
      }

      const response = await fetch('/api/admin/vault', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Vault load failed.');
      }

      applyVaultData(data as VaultData);
      setVaultStatus(`Vault loaded. ${Array.isArray(data.categories) ? data.categories.length : 0} categories.`);
    } catch (error) {
      setVaultStatus((error as Error).message);
    } finally {
      setVaultLoading(false);
    }
  };

  const handleCreateVaultCategory = async () => {
    setVaultLoading(true);
    setVaultStatus('Creating category...');
    try {
      if (!token.trim()) {
        throw new Error('Enter Admin Token before creating a category.');
      }
      if (!newCategoryLabel.trim()) {
        throw new Error('Category label is required.');
      }

      const response = await fetch('/api/admin/vault', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'upsert-category',
          label: newCategoryLabel,
          description: newCategoryDescription,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create category.');
      }

      applyVaultData(data.data as VaultData);
      setNewCategoryLabel('');
      setNewCategoryDescription('');
      setVaultStatus('Category saved.');
    } catch (error) {
      setVaultStatus((error as Error).message);
    } finally {
      setVaultLoading(false);
    }
  };

  const handleAddVaultEntry = async () => {
    setVaultLoading(true);
    setVaultStatus('Saving vault entry...');
    try {
      if (!token.trim()) {
        throw new Error('Enter Admin Token before saving a vault entry.');
      }
      if (!activeVaultCategory) {
        throw new Error('Create or select a category first.');
      }
      if (!newEntryTitle.trim()) {
        throw new Error('Entry title is required.');
      }

      const tags = newEntryTags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

      const response = await fetch('/api/admin/vault', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'add-entry',
          category_key: activeVaultCategory.key,
          title: newEntryTitle,
          body: newEntryBody,
          tags,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save vault entry.');
      }

      applyVaultData(data.data as VaultData);
      setNewEntryTitle('');
      setNewEntryBody('');
      setNewEntryTags('');
      setVaultStatus('Entry added.');
    } catch (error) {
      setVaultStatus((error as Error).message);
    } finally {
      setVaultLoading(false);
    }
  };

  const handleDeleteVaultEntry = async (categoryKey: string, entryId: string) => {
    setVaultLoading(true);
    setVaultStatus('Deleting vault entry...');
    try {
      if (!token.trim()) {
        throw new Error('Enter Admin Token before deleting a vault entry.');
      }

      const response = await fetch('/api/admin/vault', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'delete-entry',
          category_key: categoryKey,
          entry_id: entryId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete vault entry.');
      }

      applyVaultData(data.data as VaultData);
      setVaultStatus('Entry removed.');
    } catch (error) {
      setVaultStatus((error as Error).message);
    } finally {
      setVaultLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-16">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Internal</p>
        <h1 className="text-4xl font-black tracking-tight">Spruked Admin</h1>
        <p className="text-gray-400">Content controls + ProPrime session dashboard operations.</p>
      </header>

      <section className="rounded-2xl border border-gray-900 bg-black/70 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-2">
            <p className="text-sm uppercase tracking-[0.3em] text-gray-400">Admin View</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setView('content')}
                className={`rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-widest transition ${
                  view === 'content' ? 'bg-truth text-dark' : 'border border-gray-700 text-gray-400 hover:border-light hover:text-light'
                }`}
              >
                Content Admin
              </button>
              <button
                type="button"
                onClick={() => setView('session')}
                className={`rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-widest transition ${
                  view === 'session' ? 'bg-truth text-dark' : 'border border-gray-700 text-gray-400 hover:border-light hover:text-light'
                }`}
              >
                Operations
              </button>
            </div>
          </div>

          <label className="flex w-full max-w-xl flex-col text-sm uppercase tracking-[0.3em] text-gray-400">
            Admin Token
            <input
              id="admin-access-token"
              name="adminAccessToken"
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Paste ADMIN_ACCESS_TOKEN"
              className="mt-2 rounded border border-gray-800 bg-gray-900 px-3 py-2 font-mono text-sm text-light"
            />
          </label>
        </div>
      </section>

      {view === 'content' ? (
        <>
          <section className="rounded-2xl border border-gray-900 bg-black/70 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <label className="flex flex-col text-sm uppercase tracking-[0.3em] text-gray-400">
                Page
                <select
                  id="admin-page-slug"
                  name="pageSlug"
                  value={slug}
                  onChange={(event) => setSlug(event.target.value as PageSlug)}
                  className="mt-2 rounded border border-gray-800 bg-gray-900 px-3 py-2 font-sans text-base text-light"
                >
                  {PAGE_SLUGS.map((value) => (
                    <option key={value} value={value}>
                      {slugLabels[value]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="rounded-full bg-truth px-8 py-3 text-sm font-semibold uppercase tracking-widest text-dark transition disabled:opacity-50"
              >
                {loading ? 'Working...' : 'Save Content'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-full border border-gray-700 px-8 py-3 text-sm font-semibold uppercase tracking-widest text-gray-400 hover:border-light hover:text-light"
              >
                Reset to Defaults
              </button>
            </div>
            {status && <p className="mt-4 text-sm text-gray-400">{status}</p>}
          </section>

          <section className="flex-1">
            <textarea
              id="admin-json-editor"
              name="pageContentJson"
              value={editorValue}
              onChange={(event) => setEditorValue(event.target.value)}
              spellCheck={false}
              className="h-[600px] w-full rounded-2xl border border-gray-900 bg-[#050505] p-6 font-mono text-sm leading-relaxed text-gray-100"
            />
            <p className="mt-2 text-xs text-gray-500">
              JSON schema matches the structure defined in <span className="font-mono">data/page-content.ts</span>.
            </p>
          </section>
        </>
      ) : (
        <>
          <CaliOperationsHub adminToken={token} />

          <section className="rounded-2xl border border-gray-900 bg-black/70 p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Knowledge Preservation</p>
                <h3 className="text-2xl font-semibold">Admin Vault (Categorical)</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Persist operational knowledge by category for repeatable admin workflows.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRefreshVault}
                disabled={vaultLoading}
                className="rounded-full bg-truth px-7 py-3 text-sm font-semibold uppercase tracking-widest text-dark transition disabled:opacity-50"
              >
                {vaultLoading ? 'Working...' : 'Refresh Vault'}
              </button>
            </div>

            {vaultStatus && <p className="mt-4 text-sm text-gray-300">{vaultStatus}</p>}

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <article className="rounded-xl border border-gray-900 bg-[#050505] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Create Category</p>
                <div className="mt-3 grid gap-2">
                  <input
                    id="vault-category-label"
                    name="vaultCategoryLabel"
                    value={newCategoryLabel}
                    onChange={(event) => setNewCategoryLabel(event.target.value)}
                    placeholder="Category label (ex: Financial Controls)"
                    className="rounded border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-light"
                  />
                  <input
                    id="vault-category-description"
                    name="vaultCategoryDescription"
                    value={newCategoryDescription}
                    onChange={(event) => setNewCategoryDescription(event.target.value)}
                    placeholder="Category description"
                    className="rounded border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-light"
                  />
                  <button
                    type="button"
                    onClick={handleCreateVaultCategory}
                    className="rounded-full bg-truth px-5 py-2 text-xs font-semibold uppercase tracking-widest text-dark"
                  >
                    Save Category
                  </button>
                </div>

                <p className="mt-4 text-xs uppercase tracking-[0.2em] text-gray-500">Categories</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(vaultData?.categories || []).map((category) => (
                    <button
                      key={category.key}
                      type="button"
                      onClick={() => setSelectedVaultCategory(category.key)}
                      className={`rounded-full px-3 py-1 text-xs uppercase tracking-widest ${
                        activeVaultCategory?.key === category.key
                          ? 'bg-truth text-dark'
                          : 'border border-gray-700 text-gray-400 hover:border-light hover:text-light'
                      }`}
                    >
                      {category.label} ({category.entries.length})
                    </button>
                  ))}
                  {(vaultData?.categories || []).length === 0 && (
                    <p className="text-sm text-gray-500">No categories yet. Create one to begin.</p>
                  )}
                </div>
              </article>

              <article className="rounded-xl border border-gray-900 bg-[#050505] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Add Entry</p>
                <div className="mt-3 grid gap-2">
                  <input
                    id="vault-entry-title"
                    name="vaultEntryTitle"
                    value={newEntryTitle}
                    onChange={(event) => setNewEntryTitle(event.target.value)}
                    placeholder="Entry title"
                    className="rounded border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-light"
                  />
                  <textarea
                    id="vault-entry-body"
                    name="vaultEntryBody"
                    value={newEntryBody}
                    onChange={(event) => setNewEntryBody(event.target.value)}
                    placeholder="Entry body"
                    className="min-h-[120px] rounded border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-light"
                  />
                  <input
                    id="vault-entry-tags"
                    name="vaultEntryTags"
                    value={newEntryTags}
                    onChange={(event) => setNewEntryTags(event.target.value)}
                    placeholder="Tags (comma separated)"
                    className="rounded border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-light"
                  />
                  <button
                    type="button"
                    onClick={handleAddVaultEntry}
                    className="rounded-full bg-truth px-5 py-2 text-xs font-semibold uppercase tracking-widest text-dark"
                  >
                    Save Entry
                  </button>
                </div>
              </article>
            </div>

            <div className="mt-4 grid gap-3">
              {activeVaultCategory ? (
                activeVaultCategory.entries.length > 0 ? (
                  activeVaultCategory.entries.map((entry) => (
                    <article key={entry.id} className="rounded-xl border border-gray-900 bg-[#050505] p-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{activeVaultCategory.label}</p>
                          <h4 className="mt-1 text-lg font-semibold">{entry.title}</h4>
                          <p className="mt-2 whitespace-pre-line text-sm text-gray-300">{entry.body || 'No body content.'}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {entry.tags.map((tag) => (
                              <span key={tag} className="rounded-full border border-gray-800 px-2 py-1 text-xs text-gray-400">
                                {tag}
                              </span>
                            ))}
                          </div>
                          <p className="mt-2 text-xs text-gray-500">Updated: {new Date(entry.updated_at).toLocaleString()}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteVaultEntry(activeVaultCategory.key, entry.id)}
                          className="rounded-full border border-red-800 px-3 py-1 text-xs uppercase tracking-widest text-red-300 hover:bg-red-900/20"
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No entries in this category yet.</p>
                )
              ) : (
                <p className="text-sm text-gray-500">Select a category to view entries.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-900 bg-black/70 p-6">
            <div className="flex flex-wrap gap-2">
              {sessionPanels.map((panel) => (
                <button
                  key={panel.id}
                  type="button"
                  onClick={() => setSessionPanel(panel.id)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-widest transition ${
                    sessionPanel === panel.id
                      ? 'bg-truth text-dark'
                      : 'border border-gray-700 text-gray-400 hover:border-light hover:text-light'
                  }`}
                >
                  {panel.label}
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-gray-900 bg-[#050505] p-6">
              <h2 className="text-2xl font-semibold">{activePanel.title}</h2>
              <p className="mt-2 text-sm text-gray-400">{activePanel.description}</p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-base text-gray-200">
                {activePanel.bullets.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>

            {sessionPanel === 'dashboard' && (
              <div className="mt-6 rounded-2xl border border-gray-900 bg-[#050505] p-6">
                <h3 className="text-xl font-semibold">Strategic Goal Board</h3>
                <div className="mt-4 flex flex-col gap-3 md:flex-row">
                  <input
                    id="session-goal-input"
                    name="sessionGoalInput"
                    value={newGoal}
                    onChange={(event) => setNewGoal(event.target.value)}
                    placeholder="Add a strategic goal"
                    className="flex-1 rounded border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-light"
                  />
                  <button
                    type="button"
                    onClick={handleAddGoal}
                    className="rounded-full bg-truth px-6 py-2 text-xs font-semibold uppercase tracking-widest text-dark"
                  >
                    Add Goal
                  </button>
                </div>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-gray-200">
                  {strategicGoals.map((goal) => (
                    <li key={goal}>{goal}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-gray-900 bg-black/70 p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Substrate ORB State</p>
                <h3 className="text-2xl font-semibold">ORB Reasoning and Voice Introspection</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Per-site ORB state from the substrate ORB state feed, split into service health, ORB health, reasoning state, and voice state.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRefreshOrbState}
                disabled={orbLoading}
                className="rounded-full bg-truth px-7 py-3 text-sm font-semibold uppercase tracking-widest text-dark transition disabled:opacity-50"
              >
                {orbLoading ? 'Loading...' : 'Refresh ORBs'}
              </button>
            </div>

            {orbStatus && <p className="mt-4 text-sm text-gray-300">{orbStatus}</p>}

            <div className="mt-4 grid gap-4">
              {orbStates.length === 0 ? (
                <p className="text-sm text-gray-500">No ORB state loaded. Refresh after the substrate collector or an ORB request has run.</p>
              ) : (
                orbStates.map((orb) => (
                  <article key={`${orb.site_id}:${orb.orb_id}`} className="rounded-xl border border-gray-900 bg-[#050505] p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm uppercase tracking-[0.2em] text-gray-500">{orb.site_id}</p>
                        <h4 className="mt-1 text-xl font-semibold">{orb.display_name || orb.orb_id}</h4>
                        <p className="mt-1 break-all font-mono text-xs text-gray-400">{orb.endpoint} | {orb.handler}</p>
                      </div>
                      <span className="rounded-full border border-gray-800 px-3 py-1 text-xs uppercase tracking-widest text-gray-300">
                        {orb.classification}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-4">
                      <div className="rounded border border-gray-900 bg-black/50 p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Service Health</p>
                        <p className="mt-2 text-sm text-gray-200">{orb.service_health}</p>
                      </div>
                      <div className="rounded border border-gray-900 bg-black/50 p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-gray-500">ORB Health</p>
                        <p className="mt-2 text-sm text-gray-200">{orb.orb_health}</p>
                      </div>
                      <div className="rounded border border-gray-900 bg-black/50 p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Reasoning State</p>
                        <p className="mt-2 text-sm text-gray-200">{orb.reasoning_state}</p>
                        <p className="mt-1 text-xs text-gray-500">mode: {orb.reasoning_mode}</p>
                      </div>
                      <div className="rounded border border-gray-900 bg-black/50 p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Voice State</p>
                        <p className="mt-2 text-sm text-gray-200">{orb.voice_state}</p>
                        <p className="mt-1 text-xs text-gray-500">tts: {orb.tts_ready ? 'ready' : 'not ready'}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 text-xs text-gray-400 md:grid-cols-2">
                      <p><span className="text-gray-500">reasoning profile:</span> {orb.reasoning_profile}</p>
                      <p><span className="text-gray-500">context source:</span> {orb.context_source}</p>
                      <p><span className="text-gray-500">fallback:</span> {orb.fallback_state}</p>
                      <p><span className="text-gray-500">voice:</span> {orb.voice_engine} / {orb.voice_profile}</p>
                      <p><span className="text-gray-500">last reasoning:</span> {orb.last_reasoning_timestamp ? new Date(orb.last_reasoning_timestamp).toLocaleString() : 'none'}</p>
                      <p><span className="text-gray-500">last synthesis:</span> {orb.last_synthesis_timestamp ? new Date(orb.last_synthesis_timestamp).toLocaleString() : 'none'}</p>
                      {orb.last_error && <p className="md:col-span-2"><span className="text-gray-500">last error:</span> {orb.last_error}</p>}
                      <p className="break-all md:col-span-2"><span className="text-gray-500">frontend:</span> {orb.frontend_component}</p>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-900 bg-black/70 p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500">System Discovery</p>
                <h3 className="text-2xl font-semibold">ProPrime Financial Systems Scan</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Scan local workspace paths for ProPrime, Prometheus Prime, and financial systems repositories.
                </p>
              </div>
              <button
                type="button"
                onClick={handleScanSystems}
                disabled={scanLoading}
                className="rounded-full bg-truth px-7 py-3 text-sm font-semibold uppercase tracking-widest text-dark transition disabled:opacity-50"
              >
                {scanLoading ? 'Scanning...' : 'Scan Systems'}
              </button>
            </div>

            {scanStatus && <p className="mt-4 text-sm text-gray-300">{scanStatus}</p>}

            <div className="mt-4 grid gap-3">
              {scanResults.length === 0 ? (
                <p className="text-sm text-gray-500">No scan results yet. Run a scan to load detected systems.</p>
              ) : (
                scanResults.map((system) => (
                  <article key={system.path} className="rounded-xl border border-gray-900 bg-[#050505] p-4">
                    <p className="text-sm uppercase tracking-[0.2em] text-gray-500">{system.name}</p>
                    <p className="mt-1 break-all font-mono text-xs text-gray-300">{system.path}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-400">
                      <span className="rounded-full border border-gray-800 px-2 py-1">package.json: {system.has_package_json ? 'yes' : 'no'}</span>
                      <span className="rounded-full border border-gray-800 px-2 py-1">git: {system.has_git ? 'yes' : 'no'}</span>
                      <span className="rounded-full border border-gray-800 px-2 py-1">readme: {system.has_readme ? 'yes' : 'no'}</span>
                      <span className="rounded-full border border-gray-800 px-2 py-1">app/src: {system.has_src_or_app ? 'yes' : 'no'}</span>
                    </div>
                    {system.last_modified && (
                      <p className="mt-2 text-xs text-gray-500">Updated: {new Date(system.last_modified).toLocaleString()}</p>
                    )}
                  </article>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
