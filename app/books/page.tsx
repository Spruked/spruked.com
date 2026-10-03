import type { Metadata } from 'next';
import { PortfolioIntro } from '@/components/portfolio/PortfolioIntro';
import { PortfolioCard } from '@/components/portfolio/PortfolioCard';
import { entriesForCategory } from '@/data/portfolio';

export const metadata: Metadata = { title: 'Books & Writing — Spruked' };
export default function BooksPage() { return <><PortfolioIntro eyebrow="Portfolio / books & writing" title="Books, essays, and the record behind the systems." /><section className="mx-auto grid max-w-7xl gap-5 px-6 pb-24 md:grid-cols-2 md:px-12 xl:grid-cols-3">{entriesForCategory('Books & Writing').map((entry) => <PortfolioCard key={entry.slug} entry={entry} />)}</section></>; }
