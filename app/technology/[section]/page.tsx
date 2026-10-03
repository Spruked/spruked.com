import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Section } from '@/components/ui/Section';

const pages = {
  orb: {
    eyebrow: 'Interface layer',
    title: 'ORB',
    intro: 'A voice-first interface for working with the Spruked ecosystem in plain language.',
    sections: [
      ['Presence', 'The ORB makes system state and knowledge feel accessible instead of hiding them behind a collection of disconnected dashboards.'],
      ['Conversation', 'Speech, text, retrieval, and local reasoning meet in one interaction surface so the user can ask questions naturally.'],
      ['Boundaries', 'The ORB can explore and explain broadly while consequential machine actions remain subject to explicit authority.'],
    ],
  },
  aims: {
    eyebrow: 'Memory layer',
    title: 'A.I.M.S.',
    intro: 'A structured memory system for turning conversations, decisions, and source material into durable context.',
    sections: [
      ['Context', 'A.I.M.S. keeps the relationships around knowledge visible: where an idea came from, what it changed, and what depends on it.'],
      ['Provenance', 'Memory is more useful when it can be traced to a source, distinguished from inference, and corrected without losing its history.'],
      ['Learning', 'Short-term working context can be permissive. Durable memory is proposed, evaluated, and promoted with a clear record of why it matters.'],
    ],
  },
  governance: {
    eyebrow: 'Authority layer',
    title: 'Governance architecture',
    intro: 'A practical boundary between intelligence and permission.',
    sections: [
      ['Think freely', 'The system may inquire, reason, research, recognize uncertainty, and form hypotheses within its available context.'],
      ['Act deliberately', 'Changing files, credentials, services, repositories, or external state requires a separate authority decision.'],
      ['Keep provenance', 'Requests, approvals, tool calls, and outcomes should remain inspectable so the system can be trusted after the fact—not merely in the moment.'],
    ],
  },
} as const;

type Section = keyof typeof pages;

export function generateStaticParams() {
  return Object.keys(pages).map((section) => ({ section }));
}

export function generateMetadata({ params }: { params: { section: string } }): Metadata {
  const page = pages[params.section as Section];
  return {
    title: page ? `${page.title} — Spruked` : 'Technology — Spruked',
    description: page?.intro || 'Explore the technology architecture behind Spruked systems.',
    alternates: { canonical: `/technology/${params.section}` },
  };
}

export default async function TechnologyDetailPage({ params }: { params: { section: string } }) {
  const page = pages[params.section as Section];
  if (!page) notFound();

  return (
    <div className="pb-24">
      <Section className="mx-auto max-w-4xl pt-24 pb-12">
        <Link href="/technology" className="text-sm uppercase tracking-[0.25em] text-gray-500 hover:text-light">← Technology</Link>
        <p className="mt-12 mb-4 text-sm uppercase tracking-[0.35em] text-truth">{page.eyebrow}</p>
        <h1 className="mb-6 text-5xl font-black leading-tight sm:text-7xl">{page.title}</h1>
        <p className="max-w-3xl text-xl leading-relaxed text-gray-300">{page.intro}</p>
      </Section>

      <Section className="mx-auto max-w-4xl py-8">
        <div className="space-y-6">
          {page.sections.map(([heading, body]) => (
            <article key={heading} className="rounded-2xl border border-gray-800 bg-[#050505] p-8">
              <h2 className="mb-3 text-2xl font-bold text-light">{heading}</h2>
              <p className="text-lg leading-relaxed text-gray-400">{body}</p>
            </article>
          ))}
        </div>
      </Section>
    </div>
  );
}
