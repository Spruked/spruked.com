import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Section } from '@/components/ui/Section';

const gumroadUrl = 'https://sprukster8.gumroad.com/l/yjdutg';
const gumroadSubscribeUrl = 'https://sprukster8.gumroad.com/subscribe';

const promptStyles = [
  ['The Project Map', 'Start complex AI threads with the goal, working pieces, guardrails, and definition of done.'],
  ['The Job Card', 'Give the AI one focused task, the known facts, forbidden moves, deliverable, and proof requirement.'],
  ['The Role-and-Rules Engine', 'Set expertise, tone, response format, boundaries, and the first concrete task upfront.'],
  ['The Decision Lens', 'Compare options with priorities, trade-offs, risk, and the one fact that would change the answer.'],
  ['The Output Contract', 'Define the exact shape of reports, summaries, drafts, tables, checklists, and reusable documents.'],
];

export const metadata: Metadata = {
  title: 'Prompt Like a Pro PDF - Spruked',
  description: 'Download Prompt Like a Pro, a practical guide to clearer AI prompts and better results.',
};

export default function PromptLikeAProPage() {
  return (
    <div className="pb-24">
      <Section className="mx-auto grid max-w-6xl gap-10 pt-16 pb-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="overflow-hidden rounded-xl border border-gray-800 bg-[#050505] p-3 shadow-[0_24px_70px_rgba(0,0,0,0.42)]">
          <Image
            src="/assets/promptlikeapro.png"
            alt="Prompt Like a Pro PDF cover"
            width={1024}
            height={1024}
            priority
            className="h-auto w-full rounded-lg"
          />
        </div>

        <div>
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.35em] text-truth">Downloadable PDF</p>
          <h1 className="text-5xl font-black leading-tight sm:text-7xl">
            Prompt Like a <span className="text-truth">Pro</span>
          </h1>
          <p className="mt-6 max-w-2xl text-2xl font-semibold text-light">
            Reliable AI workflows, reusable templates, examples, and workbook assets.
          </p>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">
            This Spruked Edition guide helps creators, builders, teams, students, consultants, and everyday users
            get repeatable work from AI without memorizing technical prompt engineering. It teaches prompt style as
            a practical working agreement: give the AI context, a job, rules, an expected output, and a way to verify
            success.
          </p>

          <div className="mt-8 rounded-xl border border-truth/40 bg-truth/10 p-5">
            <p className="text-sm uppercase tracking-[0.25em] text-gray-400">Official Gumroad links</p>
            <Link
              href={gumroadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block break-words text-xl font-black text-light underline decoration-truth underline-offset-4 hover:text-truth"
            >
              {gumroadUrl}
            </Link>
            <Link
              href={gumroadSubscribeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block break-words text-lg font-bold text-gray-200 underline decoration-truth/70 underline-offset-4 hover:text-truth"
            >
              {gumroadSubscribeUrl}
            </Link>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button asChild size="lg" className="justify-center tracking-[0.22em]">
              <Link href="/cart?add=prompt-like-a-pro-pdf">Add to Cart - $6.88</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="justify-center tracking-[0.22em]">
              <Link href={gumroadUrl} target="_blank" rel="noopener noreferrer">
                Buy on Gumroad - $6.88
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="justify-center tracking-[0.22em]">
              <Link href={gumroadSubscribeUrl} target="_blank" rel="noopener noreferrer">
                Subscribe on Gumroad
              </Link>
            </Button>
          </div>
        </div>
      </Section>

      <Section className="mx-auto max-w-5xl py-12">
        <div className="border-t border-gray-900 pt-12">
          <h2 className="mb-8 text-3xl font-bold text-light">What the PDF Covers</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {promptStyles.map(([title, description]) => (
              <div key={title} className="rounded-xl border border-gray-800 bg-[#050505] p-6">
                <h3 className="mb-3 text-xl font-bold text-white">{title}</h3>
                <p className="leading-7 text-gray-400">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section className="mx-auto max-w-5xl py-12">
        <div className="border-t border-gray-900 pt-12">
          <h2 className="mb-8 text-3xl font-bold text-light">Included Tools</h2>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-gray-800 bg-[#050505] p-6">
              <h3 className="mb-3 text-xl font-bold text-white">Premium Prompt Checklist</h3>
              <p className="leading-7 text-gray-400">
                A quick quality check for goal, context, audience, constraints, format, proof, and reuse before you
                trust an AI output.
              </p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-[#050505] p-6">
              <h3 className="mb-3 text-xl font-bold text-white">Before-and-After Examples</h3>
              <p className="leading-7 text-gray-400">
                Real prompt rewrites for client updates, meeting summaries, product ideas, social content, and
                decision-making.
              </p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-[#050505] p-6">
              <h3 className="mb-3 text-xl font-bold text-white">Copy-Paste Prompt Bundle</h3>
              <p className="leading-7 text-gray-400">
                Condensed starter prompts for each style, built so readers can paste, customize, and keep moving.
              </p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-[#050505] p-6">
              <h3 className="mb-3 text-xl font-bold text-white">Workbook and Prompt Cards</h3>
              <p className="leading-7 text-gray-400">
                Companion exercises for building a personal prompt library plus card-deck concepts for fast reference.
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Section className="mx-auto max-w-5xl py-12">
        <div className="rounded-xl border border-gray-800 bg-black/50 p-8 sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-gray-500">Instant PDF access</p>
              <h2 className="mt-3 text-3xl font-black text-light">Download your copy for $6.88.</h2>
              <p className="mt-3 max-w-2xl text-gray-400">
                Use the Spruked cart for an order request, or complete the purchase directly through Gumroad for the
                downloadable guide.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Button asChild className="justify-center tracking-[0.22em]">
                <Link href="/cart?add=prompt-like-a-pro-pdf">Add to Cart</Link>
              </Button>
              <Button asChild variant="outline" className="justify-center tracking-[0.22em]">
                <Link href={gumroadUrl} target="_blank" rel="noopener noreferrer">
                  Buy on Gumroad
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-center tracking-[0.22em]">
                <Link href={gumroadSubscribeUrl} target="_blank" rel="noopener noreferrer">
                  Subscribe
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
