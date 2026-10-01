import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Section } from '@/components/ui/Section';

const pages = {
  'orb-weaver': ['Orb Weaver', 'Interface and orchestration', 'Orb Weaver connects people to the systems around them through a clear, conversational surface.'],
  'web-weaver': ['Web Weaver', 'Public experience layer', 'Web Weaver turns structured knowledge and system capabilities into useful, understandable web experiences.'],
  'code-weaver': ['Code Weaver', 'Implementation layer', 'Code Weaver carries architecture into production through disciplined, inspectable software.'],
  truemark: ['TrueMark', 'Verified digital objects', 'TrueMark gives meaningful digital objects a durable identity, context, and provenance.'],
  'truemark-mint': ['TrueMark Mint', 'Curated registry', 'TrueMark Mint is the curated surface for issuing and preserving knowledge objects.'],
  certsig: ['CertSig', 'Evidence and certification', 'CertSig documents the identity, history, and verification layers of an artifact.'],
  'alpha-certsig': ['Alpha CertSig', 'Licensed infrastructure', 'Alpha CertSig provides the minting and certificate infrastructure for organizations and sovereign creators.'],
  'global-registry': ['Pro Prime Global Registry', 'Long-term index', 'The Global Registry relates verified objects so they can remain findable and meaningful over time.'],
  pops: ['POPS', 'Operating layer', 'POPS organizes the practical relationships between people, objects, projects, and systems.'],
} as const;

export function generateStaticParams() { return Object.keys(pages).map((section) => ({ section })); }

export default function EcosystemDetailPage({ params }: { params: { section: string } }) {
  const page = pages[params.section as keyof typeof pages];
  if (!page) notFound();
  return (
    <div className="pb-24">
      <Section className="mx-auto max-w-4xl pt-24 pb-12">
        <Link href="/ecosystem" className="text-sm uppercase tracking-[0.25em] text-gray-500 hover:text-light">← Ecosystem</Link>
        <p className="mt-12 mb-4 text-sm uppercase tracking-[0.35em] text-truth">{page[1]}</p>
        <h1 className="mb-6 text-5xl font-black leading-tight sm:text-7xl">{page[0]}</h1>
        <p className="max-w-3xl text-xl leading-relaxed text-gray-300">{page[2]}</p>
      </Section>
      <Section className="mx-auto max-w-4xl py-8">
        <div className="rounded-2xl border border-gray-800 bg-[#050505] p-8 text-lg leading-relaxed text-gray-400">
          This layer is part of the broader Spruked architecture. Its purpose is to make knowledge more usable, more verifiable, and easier to preserve without hiding the relationships that give it meaning.
        </div>
      </Section>
    </div>
  );
}
