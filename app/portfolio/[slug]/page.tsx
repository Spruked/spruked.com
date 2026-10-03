import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Section } from '@/components/ui/Section';
import { getPortfolioItem, portfolioItems } from '@/data/portfolio';

export function generateStaticParams() {
  return portfolioItems.map((item) => ({ slug: item.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const item = getPortfolioItem(params.slug);
  if (!item) return {};

  return {
    title: `${item.title} — Spruked Portfolio`,
    description: item.summary ?? `${item.title}, part of Bryan Spruk's portfolio of systems, software, writing, research, and architecture.`,
  };
}

export default function PortfolioEntryPage({ params }: { params: { slug: string } }) {
  const item = getPortfolioItem(params.slug);
  if (!item) notFound();

  const statusLabel = item.status === 'Unclassified' ? 'Status pending classification' : item.status;

  return (
    <div className="pb-24">
      <Section className="mx-auto max-w-5xl pt-24 pb-12">
        <Link href="/portfolio" className="mb-8 inline-block text-sm font-semibold uppercase tracking-widest text-gray-500 hover:text-truth">
          ← Portfolio
        </Link>
        <p className="mb-4 text-sm uppercase tracking-[0.35em] text-truth">{item.category}</p>
        <h1 className="mb-6 text-5xl font-black leading-tight sm:text-7xl">{item.title}</h1>
        <div className="inline-flex rounded-full border border-gray-800 bg-[#050505] px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
          {statusLabel}
        </div>
      </Section>

      <Section className="mx-auto max-w-5xl py-8">
        <div className="grid gap-6 md:grid-cols-2">
          {[
            ['What it is', 'Portfolio narrative pending source review.'],
            ['Why I built it', 'Founder rationale pending source review.'],
            ['The problem or purpose', 'Problem statement pending source review.'],
            ['My contribution', 'Authorship and contribution details pending source review.'],
            ['How it works', 'High-level architecture pending source review.'],
            ['Key architecture or innovations', 'Technical and conceptual details pending source review.'],
            ['Milestones', 'Creation date and major milestones pending source review.'],
            ['Evidence', 'Screenshots, demonstrations, documents, and other evidence will be attached here.'],
          ].map(([title, body]) => (
            <article key={title} className="rounded-2xl border border-gray-800 bg-[#050505] p-7">
              <h2 className="mb-4 text-xl font-bold text-light">{title}</h2>
              <p className="leading-relaxed text-gray-500">{body}</p>
            </article>
          ))}
        </div>
      </Section>

      {(item.externalUrl || item.repositoryUrl) && (
        <Section className="mx-auto max-w-5xl py-8">
          <div className="flex flex-wrap gap-4 border-t border-gray-800 pt-8">
            {item.externalUrl ? (
              <a href={item.externalUrl} className="rounded-full border border-truth/40 px-5 py-2 text-sm font-semibold text-truth hover:bg-truth/5">
                Visit project website
              </a>
            ) : null}
            {item.repositoryUrl ? (
              <a href={item.repositoryUrl} className="rounded-full border border-gray-700 px-5 py-2 text-sm font-semibold text-gray-300 hover:border-gray-500 hover:text-light">
                View repository
              </a>
            ) : null}
          </div>
        </Section>
      )}
    </div>
  );
}
