import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPortfolioEntry, portfolioEntries } from '@/data/portfolio';
import { ProjectPage } from '@/components/portfolio/ProjectPage';

const books = portfolioEntries.filter((entry) => entry.category === 'Books & Writing');
export function generateStaticParams() { return books.map((entry) => ({ slug: entry.slug })); }
export function generateMetadata({ params }: { params: { slug: string } }): Metadata { const entry = getPortfolioEntry(params.slug); return { title: entry ? `${entry.name} — Spruked` : 'Books & Writing — Spruked', description: entry?.summary }; }
export default function BookPage({ params }: { params: { slug: string } }) { const entry = getPortfolioEntry(params.slug); if (!entry || entry.category !== 'Books & Writing') notFound(); return <ProjectPage entry={entry} />; }
