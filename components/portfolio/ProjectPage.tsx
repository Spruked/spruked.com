import Link from 'next/link';
import { getPortfolioEntry, portfolioEntries, type PortfolioEntry } from '@/data/portfolio';
import { PortfolioCard, StatusPill } from './PortfolioCard';

const slots = [
  ['What it is', '[PROJECT DESCRIPTION PENDING AUTHOR REVIEW]'],
  ['Origin / problem', '[ORIGIN AND PROBLEM STATEMENT PENDING AUTHOR REVIEW]'],
  ['Bryan’s contribution', '[CONTRIBUTION SUMMARY PENDING AUTHOR REVIEW]'],
  ['Concept / architecture', '[ARCHITECTURE DESCRIPTION PENDING AUTHOR REVIEW]'],
];

export function ProjectPage({ entry }: { entry: PortfolioEntry }) {
  const related = (entry.related || []).map(getPortfolioEntry).filter(Boolean) as PortfolioEntry[];
  return <main className="mx-auto max-w-7xl px-6 pb-24 pt-20 md:px-12">
    <Link href="/portfolio" className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 hover:text-white">← Portfolio</Link>
    <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_340px]">
      <div><p className="spruked-eyebrow mb-5">{entry.category}</p><h1 className="max-w-4xl text-5xl font-black leading-[0.92] tracking-[-0.04em] text-white sm:text-7xl">{entry.name}</h1><p className="mt-8 max-w-3xl text-xl leading-relaxed text-gray-500">[SHORT INTRODUCTION PENDING AUTHOR REVIEW]</p></div>
      <aside className="spruked-surface h-fit rounded-2xl p-6"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Status</p><div className="mt-3"><StatusPill status={entry.status} /></div><p className="mt-8 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Category</p><p className="mt-3 text-gray-300">{entry.category}</p></aside>
    </div>
    <div className="mt-20 grid gap-16 lg:grid-cols-[1fr_320px]">
      <div className="space-y-16">
        {slots.map(([title, body]) => <ProjectSection key={title} title={title} body={body} />)}
        <ProjectSection title="Current state / milestones" body="[CURRENT STATUS AND MILESTONES PENDING AUTHOR REVIEW]" />
        <section><p className="spruked-eyebrow mb-5">Media / documents</p><div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-sm uppercase tracking-[0.16em] text-gray-600">[MEDIA PENDING]</div></section>
      </div>
      <aside className="space-y-10"><div><p className="spruked-eyebrow mb-5">Related work</p><div className="space-y-4">{related.map((item) => <PortfolioCard key={item.slug} entry={item} />)}</div></div>{entry.links?.length ? <div><p className="spruked-eyebrow mb-5">Links</p><div className="flex flex-col gap-3">{entry.links.map((link) => <Link key={link.href} href={link.href} className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-sm text-gray-300 hover:border-truth/50 hover:text-white">{link.label} ↗</Link>)}</div></div> : null}</aside>
    </div>
  </main>;
}

function ProjectSection({ title, body }: { title: string; body: string }) {
  return <section><p className="spruked-eyebrow mb-5">{title}</p><p className="max-w-3xl text-xl leading-relaxed text-gray-500">{body}</p></section>;
}

export function portfolioSlugs() { return portfolioEntries.map((entry) => ({ slug: entry.slug })); }
