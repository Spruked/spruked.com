import Link from 'next/link';
import { Section } from '@/components/ui/Section';

const systems = [
  {
    href: '/technology/orb',
    name: 'ORB',
    label: 'Interface layer',
    description: 'A voice-first companion that gives people a direct, understandable way to work with the Spruked systems.',
  },
  {
    href: '/technology/aims',
    name: 'A.I.M.S.',
    label: 'Memory layer',
    description: 'A structured memory and knowledge system for preserving context, relationships, decisions, and provenance.',
  },
  {
    href: '/technology/governance',
    name: 'Governance',
    label: 'Authority layer',
    description: 'The boundary between what a system may understand and what it is authorized to do.',
  },
];

export const metadata = {
  title: 'Technology — Spruked',
  description: 'The interface, memory, and governance architecture behind Spruked systems.',
};

export default function TechnologyPage() {
  return (
    <div className="pb-24">
      <Section className="mx-auto max-w-5xl pt-24 pb-12">
        <p className="mb-4 text-sm uppercase tracking-[0.35em] text-truth">Spruked architecture</p>
        <h1 className="mb-6 text-5xl font-black leading-tight sm:text-7xl">
          Technology built for <span className="text-truth">trust</span>
        </h1>
        <p className="max-w-3xl text-xl leading-relaxed text-gray-300">
          Spruked separates the parts of a system that think, remember, and act. That separation makes the technology easier to inspect, safer to operate, and more useful over time.
        </p>
      </Section>

      <Section className="mx-auto max-w-5xl py-12">
        <div className="grid gap-6 md:grid-cols-3">
          {systems.map((system) => (
            <Link key={system.href} href={system.href} className="group rounded-2xl border border-gray-800 bg-[#050505] p-7 transition hover:border-truth/60">
              <p className="mb-4 text-xs uppercase tracking-[0.3em] text-gray-500">{system.label}</p>
              <h2 className="mb-4 text-3xl font-bold text-light group-hover:text-truth">{system.name}</h2>
              <p className="text-gray-400">{system.description}</p>
              <span className="mt-8 inline-block text-sm uppercase tracking-widest text-truth">Explore →</span>
            </Link>
          ))}
        </div>
      </Section>

      <Section className="mx-auto max-w-5xl py-12">
        <div className="border-l-4 border-truth pl-6 text-2xl font-semibold text-light">
          Cognition may be broad. Authority remains explicit.
        </div>
        <p className="mt-8 max-w-3xl text-lg leading-relaxed text-gray-400">
          This architecture lets an ORB inquire, reason, associate, and learn without granting it unrestricted permission to alter systems or affect the outside world. Consequential actions remain visible, bounded, and governed.
        </p>
      </Section>
    </div>
  );
}
