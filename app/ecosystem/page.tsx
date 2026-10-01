import Link from 'next/link';
import { Section } from '@/components/ui/Section';

const items = [
  ['orb-weaver', 'Orb Weaver', 'The interface and orchestration layer for conversational system access.'],
  ['web-weaver', 'Web Weaver', 'The connective layer for public-facing knowledge and digital experiences.'],
  ['code-weaver', 'Code Weaver', 'The implementation layer that turns architecture into working software.'],
  ['truemark', 'TrueMark', 'A registry model for preserving meaningful digital objects and their provenance.'],
  ['truemark-mint', 'TrueMark Mint', 'The curated minting surface for verified knowledge artifacts.'],
  ['certsig', 'CertSig', 'A certificate and evidence system for documenting what an artifact is and when it existed.'],
  ['alpha-certsig', 'Alpha CertSig', 'The licensed infrastructure path for organizations and sovereign creators.'],
  ['global-registry', 'Pro Prime Global Registry', 'A long-term index for finding and relating verified objects.'],
  ['pops', 'POPS', 'A practical operating layer for organizing people, objects, projects, and systems.'],
] as const;

export const metadata = { title: 'Ecosystem — Spruked', description: 'The connected systems that make up the Spruked ecosystem.' };

export default function EcosystemPage() {
  return (
    <div className="pb-24">
      <Section className="mx-auto max-w-5xl pt-24 pb-12">
        <p className="mb-4 text-sm uppercase tracking-[0.35em] text-truth">The connected system</p>
        <h1 className="mb-6 text-5xl font-black leading-tight sm:text-7xl">The <span className="text-truth">Ecosystem</span></h1>
        <p className="max-w-3xl text-xl leading-relaxed text-gray-300">Spruked is not a collection of isolated products. It is a set of layers that help people create, verify, preserve, and work with valuable knowledge.</p>
      </Section>
      <Section className="mx-auto max-w-5xl py-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(([slug, title, description]) => (
            <Link key={slug} href={`/ecosystem/${slug}`} className="group rounded-2xl border border-gray-800 bg-[#050505] p-6 hover:border-truth/60">
              <h2 className="mb-3 text-2xl font-bold text-light group-hover:text-truth">{title}</h2>
              <p className="text-gray-400">{description}</p>
            </Link>
          ))}
        </div>
      </Section>
    </div>
  );
}
