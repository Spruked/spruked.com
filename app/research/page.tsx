import { Section } from '@/components/ui/Section';

export const metadata = { title: 'Research — Spruked', description: 'Research directions and experimental systems at Spruked.' };

export default function ResearchPage() {
  return (
    <div className="pb-24">
      <Section className="mx-auto max-w-5xl pt-24 pb-12">
        <p className="mb-4 text-sm uppercase tracking-[0.35em] text-truth">Working questions</p>
        <h1 className="mb-6 text-5xl font-black leading-tight sm:text-7xl">Research & <span className="text-truth">experiments</span></h1>
        <p className="max-w-3xl text-xl leading-relaxed text-gray-300">Spruked research is practical. We explore how local-first systems can preserve context, verify claims, and help people make better decisions without surrendering control of their information.</p>
      </Section>
      <Section id="experimental-systems" className="mx-auto max-w-5xl py-8">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            ['Local cognition', 'How can an assistant reason usefully while keeping sensitive context close to home?'],
            ['Knowledge provenance', 'How can a record distinguish source material, interpretation, correction, and confidence?'],
            ['Human authority', 'How should a system separate curiosity and learning from consequential execution?'],
          ].map(([title, body]) => <article key={title} className="rounded-2xl border border-gray-800 bg-[#050505] p-7"><h2 className="mb-4 text-2xl font-bold text-light">{title}</h2><p className="text-gray-400">{body}</p></article>)}
        </div>
      </Section>
    </div>
  );
}
