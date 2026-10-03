import type { Metadata } from 'next';
import { PortfolioIntro } from '@/components/portfolio/PortfolioIntro';
import { PortfolioCard } from '@/components/portfolio/PortfolioCard';
import { entriesForCategory } from '@/data/portfolio';

export const metadata: Metadata = { title: 'AI & Intelligent Systems — Spruked' };
export default function AIPage() { return <><PortfolioIntro eyebrow="Portfolio / AI & intelligent systems" title="Systems that remember, reason, and stay directed." description="The intelligence work: CALI, ORBs, memory, governance, and the research structures around them." /><section className="mx-auto grid max-w-7xl gap-5 px-6 pb-24 md:grid-cols-2 md:px-12 xl:grid-cols-3">{entriesForCategory('AI & Intelligent Systems').map((entry) => <PortfolioCard key={entry.slug} entry={entry} />)}</section></>; }
