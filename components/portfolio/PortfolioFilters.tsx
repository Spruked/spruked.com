'use client';

import { useMemo, useState } from 'react';
import { portfolioCategories, portfolioEntries, type PortfolioStatus } from '@/data/portfolio';
import { PortfolioCard } from './PortfolioCard';

const statuses: PortfolioStatus[] = ['Active', 'Production', 'Beta', 'Prototype', 'Research', 'Archived', 'Superseded', 'Unclassified'];

export function PortfolioFilters() {
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('All');
  const filtered = useMemo(() => portfolioEntries.filter((entry) => (category === 'All' || entry.category === category) && (status === 'All' || entry.status === status)), [category, status]);

  return (
    <div>
      <div className="mb-10 grid gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 md:grid-cols-[1fr_220px]">
        <label className="flex flex-col gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm font-normal normal-case tracking-normal text-white">
            <option>All</option>
            {portfolioCategories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm font-normal normal-case tracking-normal text-white">
            <option>All</option>
            {statuses.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      </div>
      <p className="mb-6 text-sm text-gray-500">Showing {filtered.length} of {portfolioEntries.length} entries.</p>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filtered.map((entry) => <PortfolioCard key={entry.slug} entry={entry} />)}</div>
    </div>
  );
}
