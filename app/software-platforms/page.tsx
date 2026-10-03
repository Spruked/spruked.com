import type { Metadata } from 'next';
import { PortfolioIntro } from '@/components/portfolio/PortfolioIntro';
import { PortfolioCard } from '@/components/portfolio/PortfolioCard';
import { entriesForCategory } from '@/data/portfolio';

export const metadata: Metadata = { title: 'Software & Platforms — Spruked' };
export default function SoftwarePage() { return <><PortfolioIntro eyebrow="Portfolio / software & platforms" title="Products with a place in the system." description="The platforms and product surfaces Bryan has built, shaped, or carried forward." /><section className="mx-auto grid max-w-7xl gap-5 px-6 pb-24 md:grid-cols-2 md:px-12 xl:grid-cols-3">{entriesForCategory('Software & Platforms').map((entry) => <PortfolioCard key={entry.slug} entry={entry} />)}</section></>; }
