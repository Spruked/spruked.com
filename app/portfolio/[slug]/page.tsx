import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPortfolioEntry, portfolioRoutes } from '@/data/portfolio';
import { ProjectPage } from '@/components/portfolio/ProjectPage';

export function generateStaticParams() { return portfolioRoutes().map((slug) => ({ slug })); }

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const entry = getPortfolioEntry(params.slug);
  return { title: entry ? `${entry.name} — Spruked` : 'Portfolio — Spruked', description: entry?.summary };
}

export default function PortfolioProjectPage({ params }: { params: { slug: string } }) {
  const entry = getPortfolioEntry(params.slug);
  if (!entry) notFound();
  return <ProjectPage entry={entry} />;
}
