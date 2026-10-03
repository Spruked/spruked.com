import type { Metadata } from 'next';
import { PortfolioIntro } from '@/components/portfolio/PortfolioIntro';
import { PortfolioCard } from '@/components/portfolio/PortfolioCard';
import { entriesForCategory } from '@/data/portfolio';

export const metadata: Metadata = { title: 'Archive — Spruked' };
export default function ArchivePage() { return <><PortfolioIntro eyebrow="Portfolio / archive" title="Earlier work still has a place." description="Retired systems, prototypes, and superseded directions—kept visible with honest lifecycle labels." /><section className="mx-auto grid max-w-7xl gap-5 px-6 pb-24 md:px-12 xl:grid-cols-3">{entriesForCategory('Archive / Earlier Work').map((entry) => <PortfolioCard key={entry.slug} entry={entry} />)}</section></>; }
