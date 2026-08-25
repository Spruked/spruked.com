import Link from 'next/link';
import { Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';

export const metadata = {
  title: 'Orb Weaver - Website Truth Scan | Spruked',
  description:
    'Orb Weaver gives a clear website diagnosis with prioritized fixes and a direct next-step path.',
};

export default function OrbWeaverProductPage() {
  return (
    <>
      <Section className="mx-auto max-w-6xl pt-16 pb-8">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-truth">Website Truth Scan</p>
        <h1 className="mb-4 text-5xl font-black leading-tight sm:text-7xl">
          Orb <span className="text-truth">Weaver</span>
        </h1>
        <p className="max-w-4xl text-xl text-gray-300">
          See what customers, search engines, and AI assistants actually see. Orb Weaver identifies what is
          wrong with your site, what matters first, and what to do next.
        </p>
      </Section>

      <Section className="mx-auto max-w-6xl pb-10">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-2xl border border-truth/40 bg-truth/5 p-7 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-truth">Launch Special</p>
            <h2 className="mt-2 text-4xl font-black text-light">$49.88</h2>
            <p className="mt-2 text-gray-400">One-time full scan. No subscription.</p>
            <ul className="mt-6 space-y-2 text-gray-300">
              <li>Up to 250 pages</li>
              <li>Full website audit and route-by-route findings</li>
              <li>AI and ORB-readiness analysis</li>
              <li>Downloadable reports</li>
              <li>One verification re-scan</li>
            </ul>
            <div className="mt-6 rounded-xl border border-truth/30 bg-black/30 p-4 text-sm text-gray-300">
              Your $49.88 scan purchase can be applied toward a Website ORB purchased within 30 days.
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild>
                <a href="https://orbweaver.spruked.com/" target="_blank" rel="noreferrer">
                  Run My Free Preflight
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="https://orbweaver.spruked.com/" target="_blank" rel="noreferrer">
                  Open Orb Weaver Site
                </a>
              </Button>
            </div>
          </article>

          <article className="rounded-2xl border border-gray-800 bg-[#050505] p-7 sm:p-8">
            <h3 className="text-2xl font-bold text-light">How It Works</h3>
            <ol className="mt-5 space-y-3 text-gray-300">
              <li>1. Enter your website URL and run a free preflight.</li>
              <li>2. Review readiness score and top critical findings.</li>
              <li>3. Continue on Orb Weaver for full diagnostics and exports.</li>
            </ol>
            <p className="mt-6 text-sm text-gray-500">
              Scanner execution, checkout, and report generation are hosted on Orb Weaver.
            </p>
            <div className="mt-6">
              <Link href="/products" className="text-sm font-semibold uppercase tracking-widest text-truth hover:underline">
                Back to Products
              </Link>
            </div>
          </article>
        </div>
      </Section>
    </>
  );
}