import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPortfolioEntry, portfolioEntries } from '@/data/portfolio';
import { ProjectPage } from '@/components/portfolio/ProjectPage';

const research = portfolioEntries.filter((entry) => entry.category === 'Research & Architecture');
export function generateStaticParams() { return [...research.map((entry) => entry.slug), 'unusual-development-methodology'].map((slug) => ({ slug })); }
export function generateMetadata({ params }: { params: { slug: string } }): Metadata { const entry = getPortfolioEntry(params.slug); return { title: entry ? `${entry.name} — Spruked` : 'Research & Architecture — Spruked', description: entry?.summary }; }
export default function ResearchProjectPage({ params }: { params: { slug: string } }) { const entry = getPortfolioEntry(params.slug); if (!entry || entry.category !== 'Research & Architecture') notFound(); return <ProjectPage entry={entry} />; }
