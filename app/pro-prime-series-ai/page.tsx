import { Section } from '@/components/ui/Section';

export const metadata = { title: 'Pro Prime Series AI — Spruked', description: 'The Pro Prime Series AI approach to local-first, verifiable cognition.' };

export default function ProPrimeSeriesAIPage() {
  return (
    <div className="pb-24">
      <Section className="mx-auto max-w-4xl pt-24 pb-12">
        <p className="mb-4 text-sm uppercase tracking-[0.35em] text-truth">Company</p>
        <h1 className="mb-6 text-5xl font-black leading-tight sm:text-7xl">Pro Prime <span className="text-truth">Series AI</span></h1>
        <p className="max-w-3xl text-xl leading-relaxed text-gray-300">A family of local-first cognition systems designed around transparency, memory, provenance, and explicit authority.</p>
      </Section>
      <Section className="mx-auto max-w-4xl py-8">
        <div className="space-y-6 text-lg leading-relaxed text-gray-400">
          <p>Pro Prime Series AI treats intelligence as part of a larger system. A useful assistant needs more than a model: it needs context, memory, tools, boundaries, and a clear account of what happened.</p>
          <p>The goal is not automation for its own sake. The goal is dependable assistance that helps people preserve what matters and act with better information.</p>
          <div className="border-l-4 border-truth pl-6 text-2xl font-semibold text-light">Reason broadly. Remember carefully. Act with authority.</div>
        </div>
      </Section>
    </div>
  );
}
