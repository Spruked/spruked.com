import type { Metadata } from 'next';
import { PortfolioIntro } from '@/components/portfolio/PortfolioIntro';
import { PortfolioCard } from '@/components/portfolio/PortfolioCard';
import { entriesForCategory } from '@/data/portfolio';

export const metadata: Metadata = { title: 'Research & Architecture — Spruked' };
export default function ResearchArchitecturePage() { return <><PortfolioIntro eyebrow="Portfolio / research & architecture" title="The architecture behind the work." description="Methods, governance, memory, agents, and long-horizon system ideas documented as research." /><section className="mx-auto grid max-w-7xl gap-5 px-6 pb-24 md:grid-cols-2 md:px-12 xl:grid-cols-3">{entriesForCategory('Research & Architecture').map((entry) => <PortfolioCard key={entry.slug} entry={entry} />)}</section></>; }
