'use client';

import { useEffect, useState } from 'react';
import type { PageSlug } from '@/data/page-content';
import { PAGE_SLUGS, pageContentDefaults } from '@/data/page-content';

const slugLabels: Record<PageSlug, string> = {
  'true-mark-mint': 'True Mark Mint',
  goat: 'The GOAT',
};

export default function AdminPage() {
  const [slug, setSlug] = useState<PageSlug>('true-mark-mint');
  const [editorValue, setEditorValue] = useState(() => JSON.stringify(pageContentDefaults['true-mark-mint'], null, 2));
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [token, setToken] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setStatus('Fetching content…');
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

  const handleSave = async () => {
    setLoading(true);
    setStatus('Saving…');
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

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-16">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Internal</p>
        <h1 className="text-4xl font-black tracking-tight">Content Admin</h1>
        <p className="text-gray-400">Edit landing-page JSON payloads. Changes persist to Supabase.</p>
      </header>

      <section className="rounded-2xl border border-gray-900 bg-black/70 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <label className="flex flex-col text-sm uppercase tracking-[0.3em] text-gray-400">
            Page
            <select
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
          <label className="flex flex-col text-sm uppercase tracking-[0.3em] text-gray-400">
            Admin Token
            <input
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Paste ADMIN_ACCESS_TOKEN"
              className="mt-2 rounded border border-gray-800 bg-gray-900 px-3 py-2 font-mono text-sm text-light"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="rounded-full bg-truth px-8 py-3 text-sm font-semibold uppercase tracking-widest text-dark transition disabled:opacity-50"
          >
            {loading ? 'Working…' : 'Save Content'}
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
          value={editorValue}
          onChange={(event) => setEditorValue(event.target.value)}
          spellCheck={false}
          className="h-[600px] w-full rounded-2xl border border-gray-900 bg-[#050505] p-6 font-mono text-sm leading-relaxed text-gray-100"
        />
        <p className="mt-2 text-xs text-gray-500">
          JSON schema matches the structure defined in <span className="font-mono">data/page-content.ts</span>.
        </p>
      </section>
    </div>
  );
}
