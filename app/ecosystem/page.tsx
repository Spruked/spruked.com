import Link from 'next/link';
import { Section } from '@/components/ui/Section';

const systems = [
  {
    name: 'Pro Prime Series AI',
    eyebrow: 'Persistent intelligence built around people',
    href: '/pro-prime-series-ai',
    text: 'Pro Prime Series AI explores persistent intelligent systems designed to develop continuity with the people and environments they serve. Rather than treating every interaction as an isolated prompt, Pro Prime systems combine conversational intelligence, persistent memory, voice, specialized capabilities, and explicit governance.',
    note: 'Intelligence can evolve. Identity can remain.',
  },
  {
    name: 'Orb Weaver',
    eyebrow: 'Intelligence for the website itself',
    href: '/ecosystem/orb-weaver',
    text: "Orb Weaver transforms an existing website into an intelligent, voice-enabled environment. The Website ORB learns the site it serves, communicates naturally with visitors, understands where information and interface elements are located, and can visually guide people through the experience.",
    note: "The website doesn't just answer. It guides.",
  },
  {
    name: 'A.I.M.S.',
    eyebrow: 'Agnostic immutable memory system',
    href: '/technology/aims',
    text: "A.I.M.S. is SPRUKED's architecture for durable, auditable machine memory. It is designed to preserve important information together with the history and provenance necessary to understand where that information came from and how it developed over time.",
    note: 'Remember what matters. Preserve how it became known.',
  },
  {
    name: 'TrueMark',
    eyebrow: 'Persistent provenance',
    href: '/products/truemark-mint',
    text: 'TrueMark explores persistent identity and provenance for digital and physical objects, providing a foundation for establishing what an object is, where it came from, and how its history can be traced.',
    note: 'Know what it is. Know where it came from.',
  },
  {
    name: 'Alpha CertSig',
    eyebrow: 'Verification backed by evidence',
    href: '/products/alpha-certsig',
    text: 'Alpha CertSig extends the provenance architecture into certification and verifiable records. It is designed around the principle that important claims should be supported by evidence rather than accepted solely because a system says they are true.',
    note: 'Trust should be verifiable.',
  },
];

export const metadata = {
  title: 'The SPRUKED Ecosystem — Spruked',
  description:
    'Different systems. One architectural philosophy. Explore the intelligent, memory, provenance, and verification systems within SPRUKED.',
};

export default function EcosystemPage() {
  return (
    <div className="pb-24">
      <Section className="mx-auto max-w-7xl pb-16 pt-24 md:pt-32">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="spruked-eyebrow mb-6">SPRUKED / ecosystem</p>
            <h1 className="max-w-5xl text-6xl font-black leading-[0.88] tracking-[-0.06em] text-white sm:text-8xl lg:text-9xl">
              Different systems.<br />
              <span className="text-truth">One philosophy.</span>
            </h1>
          </div>
          <div className="border-l border-truth/60 pl-6 lg:mb-2">
            <p className="max-w-xl text-xl leading-relaxed text-gray-300 sm:text-2xl">
              SPRUKED develops specialized technologies for intelligence, memory, verification, provenance, and human-directed automation.
            </p>
          </div>
        </div>
        <div className="spruked-rule mt-16" />
        <p className="mt-8 max-w-4xl text-lg leading-relaxed text-gray-400 sm:text-xl">
          Each system has a specific responsibility. They are not intended to collapse into one enormous AI application. They can operate independently while sharing a common architectural philosophy: intelligence should be useful, authority should remain explicit, important information should be traceable, and consequential actions should be verifiable.
        </p>
      </Section>

      <Section className="mx-auto max-w-7xl py-16">
        <div className="mb-10 max-w-3xl">
          <p className="spruked-eyebrow mb-4">01 / the systems</p>
          <h2 className="text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">Distinct responsibilities. Shared architecture.</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {systems.map((system, index) => (
            <article key={system.name} className="spruked-surface spruked-surface-hover flex flex-col rounded-2xl p-7 sm:p-9">
              <div className="mb-10 flex items-start justify-between gap-4">
                <span className="text-sm font-bold tracking-[0.2em] text-truth">0{index + 2}</span>
                <span className="text-xs uppercase tracking-[0.2em] text-gray-600">System / {String(index + 1).padStart(2, '0')}</span>
              </div>
              <p className="spruked-eyebrow mb-4">{system.eyebrow}</p>
              <h3 className="mb-5 text-3xl font-bold tracking-tight text-white">{system.name}</h3>
              <p className="text-base leading-relaxed text-gray-400 sm:text-lg">{system.text}</p>
              <div className="mt-auto pt-8">
                <p className="border-t border-white/10 pt-5 text-lg font-semibold leading-snug text-gray-200">{system.note}</p>
                <Link href={system.href} className="mt-6 inline-flex text-xs font-bold uppercase tracking-[0.2em] text-gray-500 transition hover:text-truth">
                  Explore system
                </Link>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section className="mx-auto max-w-7xl py-16">
        <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <p className="spruked-eyebrow mb-4">07 / architectural philosophy</p>
            <h2 className="max-w-md text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">
              Built independently. Designed to connect.
            </h2>
          </div>
          <div className="max-w-3xl">
            <p className="mb-8 text-lg leading-relaxed text-gray-300 sm:text-xl">
              The systems within SPRUKED solve different problems. Their responsibilities remain distinct, but the principles beneath them are shared.
            </p>
            <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {[
                'Intelligence should be bounded.',
                'Memory should be traceable.',
                'Authority should be explicit.',
                'Actions should be attributable.',
                'Claims should be verifiable.',
                'People should remain in control.',
              ].map((principle, index) => (
                <p key={principle} className="border-t border-white/10 pt-4 text-lg font-semibold text-gray-200">
                  <span className="mr-3 text-sm font-bold tracking-[0.16em] text-truth">0{index + 1}</span>
                  {principle}
                </p>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section className="mx-auto max-w-7xl py-16">
        <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <p className="spruked-eyebrow mb-4">08 / model independence</p>
            <h2 className="max-w-md text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">
              Intelligence is a component—not the authority.
            </h2>
          </div>
          <div className="max-w-3xl space-y-6 text-lg leading-relaxed text-gray-300 sm:text-xl">
            <p>SPRUKED systems are designed to work across different AI models rather than depending permanently on a single provider.</p>
            <p>Local models can provide private and predictable baseline intelligence. More powerful external models can be connected when additional reasoning capability is useful.</p>
            <p>Changing the model does not have to change the governing system around it.</p>
            <div className="border-l-4 border-truth py-2 pl-5 text-2xl font-semibold leading-tight text-white sm:text-3xl">
              <p>The model can reason.</p>
              <p className="mt-3 text-gray-400">The surrounding architecture determines what it knows, what it may do, how actions are executed, and how results are verified.</p>
            </div>
            <p className="pt-2 text-2xl font-semibold text-truth sm:text-3xl">Better intelligence should increase capability—not silently increase authority.</p>
          </div>
        </div>
      </Section>

      <Section className="mx-auto max-w-7xl pb-8 pt-16">
        <div className="spruked-surface rounded-2xl p-8 sm:p-12 lg:p-16">
          <p className="spruked-eyebrow mb-5">09 / the direction</p>
          <h2 className="max-w-4xl text-4xl font-black leading-[0.95] tracking-[-0.05em] text-white sm:text-6xl">
            One ecosystem. Built for what comes next.
          </h2>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <p className="max-w-3xl text-lg leading-relaxed text-gray-300 sm:text-xl">
              Artificial intelligence is rapidly moving beyond answering questions. It is beginning to remember, research, operate tools, navigate environments, coordinate work, and perform meaningful tasks. That transition requires more than increasingly powerful models. It requires architecture around the intelligence.
            </p>
            <p className="max-w-md text-2xl font-bold leading-tight text-truth sm:text-3xl lg:text-right">
              Intelligence with structure.<br />
              <span className="text-white">Memory with provenance.</span><br />
              <span className="text-white">Actions with accountability.</span>
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
}
