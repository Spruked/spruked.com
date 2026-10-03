import Link from 'next/link';
import { getPortfolioEntry, portfolioEntries, type PortfolioEntry } from '@/data/portfolio';
import { PortfolioCard, StatusPill } from './PortfolioCard';

export function ProjectPage({ entry }: { entry: PortfolioEntry }) {
  const related = (entry.related || []).map(getPortfolioEntry).filter(Boolean) as PortfolioEntry[];
  const sections = [
    ['What it is', entry.summary],
    ['Origin / problem', `${entry.why} ${entry.problem}`],
    ['Bryan’s contribution', entry.contribution],
    ['Concept / architecture', entry.how],
  ];

  return <main className="mx-auto max-w-7xl px-6 pb-24 pt-20 md:px-12">
    <Link href="/portfolio" className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 hover:text-white">← Portfolio</Link>
    <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_340px]">
      <div><p className="spruked-eyebrow mb-5">{entry.category}</p><h1 className="max-w-4xl text-5xl font-black leading-[0.92] tracking-[-0.04em] text-white sm:text-7xl">{entry.name}</h1><p className="mt-8 max-w-3xl text-xl leading-relaxed text-gray-500">{entry.summary}</p></div>
      <aside className="spruked-surface h-fit rounded-2xl p-6"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Status</p><div className="mt-3"><StatusPill status={entry.status} /></div><p className="mt-8 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Category</p><p className="mt-3 text-gray-300">{entry.category}</p></aside>
    </div>
    <div className="mt-20 grid gap-16 lg:grid-cols-[1fr_320px]">
      <div className="space-y-16">
        {sections.map(([title, body]) => <ProjectSection key={title} title={title} body={body} />)}
        <ProjectSection title="Current state / milestones" body={entry.milestones.join(' ')} />
        <section><p className="spruked-eyebrow mb-5">Key ideas / innovations</p><div className="flex flex-wrap gap-3">{entry.innovations.map((innovation) => <span key={innovation} className="rounded-full border border-white/10 bg-white/[0.025] px-4 py-2 text-sm text-gray-400">{innovation}</span>)}</div>{entry.sourceNote ? <p className="mt-6 max-w-3xl text-sm leading-relaxed text-gray-600">{entry.sourceNote}</p> : null}</section>
      </div>
      <aside className="space-y-10"><div><p className="spruked-eyebrow mb-5">Related work</p><div className="space-y-4">{related.map((item) => <PortfolioCard key={item.slug} entry={item} />)}</div></div>{entry.links?.length ? <div><p className="spruked-eyebrow mb-5">Links</p><div className="flex flex-col gap-3">{entry.links.map((link) => <Link key={link.href} href={link.href} className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-sm text-gray-300 hover:border-truth/50 hover:text-white">{link.label} ↗</Link>)}</div></div> : null}</aside>
    </div>
  </main>;
}

function ProjectSection({ title, body }: { title: string; body: string }) {
  return <section><p className="spruked-eyebrow mb-5">{title}</p><p className="max-w-3xl text-xl leading-relaxed text-gray-500">{body}</p></section>;
}

export function portfolioSlugs() { return portfolioEntries.map((entry) => ({ slug: entry.slug })); }
