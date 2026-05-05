import { Section } from '@/components/ui/Section';

export const metadata = {
  title: 'About — Spruked',
  description: 'Spruked is a digital architecture studio focused on building systems that preserve knowledge, verify authenticity, and organize digital assets for the future.',
};

export default function AboutPage() {
  return (
    <div className="pb-24">
      {/* Hero / What Spruked Is */}
      <Section className="mx-auto max-w-4xl pt-24 pb-12">
        <h1 className="mb-8 text-5xl font-black leading-tight sm:text-7xl">
          About <span className="text-truth">Spruked</span>
        </h1>
        <div className="space-y-6 text-xl text-gray-300">
          <p>
            Spruked is a digital architecture studio focused on building systems that <strong className="text-light">preserve knowledge, verify authenticity, and organize digital assets for the future</strong>.
          </p>
          <p>
            At its core, Spruked develops tools that allow individuals, professionals, and organizations to <strong className="text-light">capture what they know, prove when it existed, and preserve it in a verifiable form</strong>.
          </p>
          <p>
            The modern world produces an overwhelming amount of information, but very little of it is <strong className="text-light">structured, authenticated, or preserved in a meaningful way</strong>. Spruked exists to change that.
          </p>
          <p>
            Through a growing ecosystem of technologies — including <strong className="text-light">CertSig&trade;, TrueMark&trade;, GOAT, and the Pro Prime Series AI systems</strong> — Spruked builds infrastructure that transforms knowledge into a durable digital asset.
          </p>
          <p className="border-l-4 border-truth pl-5 text-2xl font-semibold text-light mt-8 py-2">
            If knowledge has value, it deserves to be preserved properly.
          </p>
        </div>
      </Section>

      {/* The Philosophy */}
      <Section className="mx-auto max-w-4xl py-12">
        <h2 className="mb-6 text-3xl font-bold text-light">The Philosophy</h2>
        <div className="space-y-6 text-xl text-gray-300">
          <p>Spruked is built on a simple belief:</p>
          <blockquote className="border-l-4 border-gray-700 pl-6 py-2 italic text-2xl text-light my-6 bg-gray-900/20 rounded-r-lg">
            &quot;If better is possible, good is never enough.&quot;
          </blockquote>
          <p>
            Most software is built to solve immediate problems. Spruked focuses on building systems that <strong className="text-light">still make sense decades from now.</strong>
          </p>
          <p>The design philosophy emphasizes:</p>
          <ul className="list-inside list-disc space-y-2 text-gray-400 pl-4">
            <li>Clarity over complexity</li>
            <li>Verification over assumption</li>
            <li>Permanence over convenience</li>
            <li>Discipline over novelty</li>
          </ul>
          <p>This approach guides every system within the Spruked ecosystem.</p>
        </div>
      </Section>

      {/* What Spruked Builds */}
      <Section className="mx-auto max-w-4xl py-12">
        <h2 className="mb-8 text-3xl font-bold text-light">What Spruked Builds</h2>
        <p className="mb-8 text-xl text-gray-300">
          Spruked develops several interconnected systems designed to support the preservation and verification of knowledge and digital artifacts. Key components include:
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-800 bg-[#050505] p-8">
            <h3 className="mb-3 text-2xl font-bold text-truth">CertSig&trade;</h3>
            <p className="text-gray-400">
              A forensic-grade certificate system designed to produce verifiable digital records with layered authentication and metadata. CertSig allows documents, knowledge artifacts, and creative works to be issued with structured verification layers and optional blockchain anchoring.
            </p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-[#050505] p-8">
            <h3 className="mb-3 text-2xl font-bold text-truth">TrueMark&trade;</h3>
            <p className="text-gray-400">
              A minting and verification framework that allows knowledge, intellectual property, and expertise to be issued as <strong className="text-light">structured digital assets</strong>. The goal is not speculation or hype — but preservation and attribution.
            </p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-[#050505] p-8">
            <h3 className="mb-3 text-2xl font-bold text-truth">GOAT</h3>
            <p className="text-gray-400">
              The GOAT system prepares and organizes digital artifacts before they are issued or archived. It acts as the preparation layer that ensures artifacts are structured, documented, and ready for long-term preservation.
            </p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-[#050505] p-8">
            <h3 className="mb-3 text-2xl font-bold text-truth">Pro Prime Series AI</h3>
            <p className="text-gray-400">
              The Pro Prime Series explores the future of <strong className="text-light">ethical, verifiable AI cognition systems</strong>. These systems focus on transparency, traceability, and philosophical grounding rather than opaque automation. Architecture draws inspiration from classical philosophy: Locke, Hume, Kant, and Spinoza.
            </p>
          </div>
        </div>
      </Section>

      {/* Why It Exists */}
      <Section className="mx-auto max-w-4xl py-12">
        <h2 className="mb-6 text-3xl font-bold text-light">Why It Exists</h2>
        <div className="space-y-6 text-xl text-gray-300">
          <p>The internet solved distribution.</p>
          <p>
            It did <strong className="text-truth">not</strong> solve <strong className="text-light">authenticity, permanence, or ownership of knowledge</strong>.
          </p>
          <div className="py-2 text-2xl font-medium text-gray-400 border-l-2 border-gray-800 pl-6 space-y-2">
            <p>Ideas disappear.</p>
            <p>Expertise is lost.</p>
            <p>Proof of authorship fades.</p>
          </div>
          <p>
            Spruked exists to build the infrastructure that prevents that.
          </p>
        </div>
      </Section>

      {/* The Founder */}
      <Section className="mx-auto max-w-4xl py-12">
        <h2 className="mb-6 text-3xl font-bold text-light">The Founder</h2>
        <div className="space-y-6 text-xl text-gray-300">
          <p>
            My name is <strong className="text-light">Bryan Spruk</strong>. I am a builder, salesman, systems thinker, and founder of the Pro Prime Series AI ecosystem.
          </p>
          <p>
            My professional background is not traditional. I did not come through a university program, venture studio, or corporate engineering track. I came through work: automotive sales, business development, welding, machining, entrepreneurship, customer service, and years of solving problems with limited resources.
          </p>
          <p>
            That background shaped the way I build. I tend to think in systems, structures, workflows, and practical outcomes. I am not interested in technology for show. I am interested in tools that help real people preserve knowledge, operate better, protect privacy, and turn difficult work into something usable.
          </p>
          <p>
            The projects I am building, including <strong className="text-light">ORBS, GOAT, True Mark, CertSig, and related Pro Prime systems</strong>, come from that same place. They are local-first, privacy-conscious, practical systems designed to give individuals and small businesses more control over their own data, memory, work, and digital presence.
          </p>
          <p>
            There are things in my past that require directness. I have faced legal, financial, personal, and family hardships. Some of those difficulties are part of the public record. Some were the result of my own mistakes. Some were the result of circumstances I had to survive, dispute, or rebuild from. I do not hide that my path has been difficult, and I do not present myself as someone with a perfect resume.
          </p>
          <p>
            What I can say clearly is this: I have worked hard to rebuild my life with honesty, sobriety, discipline, and purpose. I quit drinking years ago. I have continued working, building, learning, and developing these systems while carrying responsibilities and obstacles that would stop many people.
          </p>
          <p>
            I understand that partners, investors, and serious collaborators may need to ask hard questions. I respect that. I would rather answer those questions directly than pretend my background is simpler than it is.
          </p>
          <p>
            At the same time, I ask that my work be judged by the same standard I apply to it: <strong className="text-light">evidence, clarity, usefulness, integrity, and execution</strong>.
          </p>
          <p>
            I am not presenting myself as a polished corporate founder. I am presenting myself as a real builder with real scars, real experience, and a serious commitment to creating useful systems.
          </p>
          <div className="border-l-4 border-truth pl-5 py-2">
            <p className="mb-2">My goal is not to appear perfect.</p>
            <p className="text-3xl font-semibold text-truth">My goal is to build something worth trusting.</p>
          </div>
        </div>

        <div className="mt-10 rounded-xl border border-gray-800 bg-[#050505] p-8">
          <h3 className="mb-5 text-2xl font-bold text-light">About the Founder (Short Version)</h3>
          <div className="space-y-5 text-lg text-gray-300">
            <p>
              My name is Bryan Spruk. I am the founder and lead builder behind the Pro Prime Series AI ecosystem, including ORBS, GOAT, True Mark, CertSig, and related local-first tools.
            </p>
            <p>
              My background is not traditional. I came from automotive sales, business development, welding, machining, entrepreneurship, and years of practical problem-solving. I did not enter this work through a university or corporate engineering path. I learned by building, testing, failing, rebuilding, and continuing forward.
            </p>
            <p>
              There are parts of my past that require directness. I have faced legal, financial, personal, and family hardships. Some were caused by mistakes. Some were caused by circumstances I had to survive and rebuild from. I do not claim a perfect resume.
            </p>
            <p>
              What I do claim is honesty about who I am today. I quit drinking years ago. I have continued working, learning, building, and developing systems focused on privacy, preservation, local control, and practical use.
            </p>
            <p>
              I understand that serious partners or investors may ask hard questions, and I am prepared to answer them directly. I am not a polished corporate founder. I am a real builder with real experience, hard lessons, and a strong commitment to creating useful tools.
            </p>
            <p className="text-xl font-semibold text-truth">My goal is not to appear perfect. My goal is to build something worth trusting.</p>
          </div>
        </div>
      </Section>

      {/* The Road Ahead */}
      <Section className="mx-auto max-w-4xl py-12">
        <h2 className="mb-6 text-3xl font-bold text-light">The Road Ahead</h2>
        <div className="space-y-6 text-xl text-gray-300">
          <p>Spruked is still early in its journey.</p>
          <p>The ecosystem will continue expanding to include new tools for:</p>
          <ul className="list-inside list-disc space-y-2 text-gray-400 pl-4">
            <li>Knowledge preservation</li>
            <li>Digital asset verification</li>
            <li>Personal and enterprise knowledge vaults</li>
            <li>Ethical AI systems</li>
            <li>Long-term digital legacy infrastructure</li>
          </ul>
          <div className="pt-8 text-center sm:text-left">
            <p className="mb-4 text-2xl font-bold text-light">
              Each system is designed with the same principle:
            </p>
            <p className="text-4xl sm:text-5xl font-black text-truth tracking-tight">
              Build it right, or don&rsquo;t build it at all.
            </p>
          </div>
        </div>
      </Section>

      {/* Divider & CTA */}
      <Section className="mx-auto max-w-4xl pt-16 pb-12 text-center">
        <div className="mx-auto w-16 h-1 bg-gray-800 mb-12 rounded-full"></div>
        <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-widest text-light mb-6">
          Spruked
        </h2>
        <p className="text-3xl sm:text-4xl font-bold text-gray-400 leading-tight">
          Mint your mind.<br className="hidden sm:block"/>{' '}
          <span className="text-truth">It&rsquo;s worth more than you think.</span>
        </p>
      </Section>
    </div>
  );
}
