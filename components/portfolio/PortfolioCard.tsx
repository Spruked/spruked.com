import Link from 'next/link';
import { portfolioPath, type PortfolioEntry } from '@/data/portfolio';

export function StatusPill({ status }: { status: PortfolioEntry['status'] }) {
  return <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">{status}</span>;
}

export function PortfolioCard({ entry }: { entry: PortfolioEntry }) {
  return (
    <article className="spruked-surface spruked-surface-hover group flex h-full flex-col rounded-2xl p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <p className="spruked-eyebrow">{entry.category}</p>
        <StatusPill status={entry.status} />
      </div>
      <h3 className="text-2xl font-bold tracking-tight text-white group-hover:text-truth">{entry.name}</h3>
      <p className="mt-4 flex-1 text-sm leading-relaxed text-gray-500">{entry.summary}</p>
      <Link href={portfolioPath(entry)} className="mt-7 inline-flex w-fit items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-gray-300 transition hover:text-truth">
        View work <span aria-hidden="true">↗</span>
      </Link>
    </article>
  );
}
