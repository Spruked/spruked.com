import { Section } from '@/components/ui/Section';

export const metadata = {
  title: 'Who We Are — Spruked',
  description:
    'SPRUKED Systems develops intelligent systems designed to operate in the real world with memory, governance, voice, verification, and clear boundaries.',
};

const systems = [
  {
    name: 'Orb Weaver',
    text: 'Orb Weaver transforms an existing website into an intelligent, voice-enabled environment. Instead of forcing visitors into a traditional chatbot, the Website ORB can communicate naturally, understand the website it serves, recognize where information and interface elements are located, and visually guide visitors through the experience.',
    note: "The website doesn't just answer. It guides.",
  },
  {
    name: 'Pro Prime Series AI',
    text: 'Pro Prime Series explores persistent AI systems designed around people rather than individual prompts. The platform is being developed around specialized intelligence, persistent memory, voice interaction, governed capabilities, and long-term continuity.',
    note: 'Intelligence should remain useful without becoming unaccountable.',
  },
  {
    name: 'A.I.M.S.',
    text: "The Agnostic Immutable Memory System is SPRUKED's approach to durable, auditable machine memory. A.I.M.S. is designed so important information, decisions, and events can retain provenance rather than disappearing into an opaque conversational history.",
    note: 'What was known, where it came from, and what happened next.',
  },
  {
    name: 'TrueMark & Alpha CertSig',
    text: 'Digital information is increasingly easy to create, modify, copy, and regenerate. TrueMark and Alpha CertSig explore the other side of intelligent systems: provenance, authenticity, certification, and verifiable digital objects.',
    note: 'Evidence capable of supporting the claim.',
  },
];

export default function AboutPage() {
  return (
    <div className="pb-24">
      <Section className="mx-auto max-w-7xl pb-16 pt-24 md:pt-32">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="spruked-eyebrow mb-6">SPRUKED / who we are</p>
            <h1 className="max-w-5xl text-6xl font-black leading-[0.88] tracking-[-0.06em] text-white sm:text-8xl lg:text-9xl">
              Built to make intelligence useful.
            </h1>
          </div>
          <div className="border-l border-truth/60 pl-6 lg:mb-2">
            <p className="max-w-xl text-xl leading-relaxed text-gray-300 sm:text-2xl">
              SPRUKED Systems develops intelligent systems designed to operate in the real world—not just inside a chat window.
            </p>
          </div>
        </div>
        <div className="spruked-rule mt-16" />
        <p className="mt-8 max-w-4xl text-lg leading-relaxed text-gray-400 sm:text-xl">
          Our work combines artificial intelligence, deterministic governance, persistent memory, voice, verification, and specialized tools to create systems that can understand an environment, assist people naturally, and operate within clearly defined boundaries.
        </p>
      </Section>

      <Section className="mx-auto max-w-7xl py-16">
        <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <p className="spruked-eyebrow mb-4">01 / governing principle</p>
            <h2 className="max-w-md text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">
              Intelligence with boundaries
            </h2>
          </div>
          <div className="max-w-3xl space-y-6 text-lg leading-relaxed text-gray-300 sm:text-xl">
            <p>Powerful AI should not require surrendering control.</p>
            <p>
              SPRUKED systems separate intelligence from authority. AI can reason, communicate, research, and recommend, while governing systems determine what actions are permitted and verification establishes what actually occurred.
            </p>
            <p>
              This approach allows increasingly capable AI models to be adopted without handing those models unrestricted control.
            </p>
            <p className="border-l-4 border-truth py-2 pl-5 text-2xl font-semibold leading-tight text-white sm:text-3xl">
              Intelligence reasons. Governance controls. Verification proves.
            </p>
          </div>
        </div>
      </Section>

      <Section className="mx-auto max-w-7xl py-16">
        <div className="mb-10 max-w-3xl">
          <p className="spruked-eyebrow mb-4">02 / systems in development</p>
          <h2 className="text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">The work</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {systems.map((system, index) => (
            <article key={system.name} className="spruked-surface spruked-surface-hover rounded-2xl p-7 sm:p-9">
              <div className="mb-12 flex items-start justify-between gap-4">
                <span className="text-sm font-bold tracking-[0.2em] text-truth">0{index + 3}</span>
                <span className="text-xs uppercase tracking-[0.2em] text-gray-600">System / {String(index + 1).padStart(2, '0')}</span>
              </div>
              <h3 className="mb-5 text-3xl font-bold tracking-tight text-white">{system.name}</h3>
              <p className="text-base leading-relaxed text-gray-400 sm:text-lg">{system.text}</p>
              <p className="mt-7 border-t border-white/10 pt-5 text-lg font-semibold leading-snug text-gray-200">{system.note}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section className="mx-auto max-w-7xl py-16">
        <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <p className="spruked-eyebrow mb-4">06 / architecture</p>
            <h2 className="max-w-md text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">
              Local first. Model agnostic.
            </h2>
          </div>
          <div className="max-w-3xl space-y-6 text-lg leading-relaxed text-gray-300 sm:text-xl">
            <p>SPRUKED systems are not designed around dependence on one AI company or one language model.</p>
            <p>
              Where appropriate, local models provide private, predictable baseline intelligence. Optional adapters can provide access to more powerful external models when additional reasoning capability is required.
            </p>
            <p>
              As models improve, the intelligence can change without replacing the governing architecture around it.
            </p>
            <p className="border-l-4 border-truth py-2 pl-5 text-2xl font-semibold leading-tight text-white sm:text-3xl">
              The model is a component. It is not the system.
            </p>
          </div>
        </div>
      </Section>

      <Section className="mx-auto max-w-7xl pb-8 pt-16">
        <div className="spruked-surface rounded-2xl p-8 sm:p-12 lg:p-16">
          <p className="spruked-eyebrow mb-5">07 / what comes next</p>
          <h2 className="max-w-4xl text-4xl font-black leading-[0.95] tracking-[-0.05em] text-white sm:text-6xl">
            Built for what comes next.
          </h2>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <p className="max-w-3xl text-lg leading-relaxed text-gray-300 sm:text-xl">
              Artificial intelligence is moving from answering questions toward performing meaningful work. That transition requires more than larger models. It requires memory, tools, identity, permissions, governance, verification, recovery, and clearly defined responsibility.
            </p>
            <p className="max-w-md text-2xl font-bold leading-tight text-truth sm:text-3xl lg:text-right">
              Not AI without limits.<br />
              <span className="text-white">Intelligence with structure.</span>
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
}
