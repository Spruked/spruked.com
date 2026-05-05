import { Section } from '@/components/ui/Section';
import Link from 'next/link';

export const metadata = {
  title: 'Products — Spruked',
  description: 'Spruked Products and Offerings.',
};

export default function ProductsPage() {
  return (
    <>
      {/* Visual Header linking ORB and the Spruked System layers */}
      <Section className="mx-auto max-w-5xl pt-16 pb-8">
        <h1 className="mb-4 text-5xl font-black leading-tight sm:text-7xl">
          The <span className="text-truth">Architecture</span>
        </h1>
        <p className="text-xl text-gray-400">
          The Spruked ecosystem is built across two distinct layers:
          the <strong className="text-white">AI Interface Layer</strong> and the <strong className="text-white">Knowledge Infrastructure.</strong>
        </p>
      </Section>

      <Section className="mx-auto max-w-5xl py-8">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6">AI Interface Layer</h2>
        <div className="grid gap-8 sm:grid-cols-1">
          <div className="rounded-xl border border-truth/30 bg-truth/5 p-8 relative shadow-[0_0_20px_rgba(255,255,255,0.05)]">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
              <h2 className="text-3xl font-bold text-truth">ORB Interface</h2>
              <span className="bg-truth/20 text-truth text-xs font-bold uppercase tracking-widest px-3 py-1 rounded hidden sm:inline-block">Demonstration Live</span>
            </div>
            <p className="mb-6 text-xl text-gray-300 max-w-3xl">The human interface layer for the Spruked ecosystem and the Pro Prime AI architecture. A persistent interactive companion designed for research, organization, and system alignment.</p>
            <div className="flex gap-4">
              <Link href="/products/orb" className="text-white hover:text-truth transition-colors uppercase tracking-wide text-sm font-semibold border-b border-transparent hover:border-truth pb-1">
                Explore ORB System
              </Link>
            </div>
          </div>
        </div>
      </Section>

      <Section className="mx-auto max-w-5xl pt-8 pb-24">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6 border-t border-gray-900 pt-8">Knowledge Infrastructure</h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-gray-800 bg-[#050505] p-8">
            <h2 className="mb-4 text-3xl font-bold">Alpha CertSig</h2>
            <p className="mb-6 text-gray-400">Licensed digital object infrastructure. A self-hosted mint engine for institutions and sovereign creators.</p>
            <div className="flex flex-wrap gap-4">
              <Link href="/products/alpha-certsig" className="text-truth hover:underline uppercase tracking-wide text-sm font-semibold">
                Explore Alpha CertSig
              </Link>
              <Link href="/cart?add=alpha-certsig-license" className="text-gray-300 hover:text-light uppercase tracking-wide text-sm font-semibold">
                Add to Cart
              </Link>
            </div>
          </div>
          <div className="rounded-xl border border-gray-800 bg-[#050505] p-8">
            <h2 className="mb-4 text-3xl font-bold">TrueMark Mint</h2>
            <p className="mb-6 text-gray-400">The curated digital object vault. Cryptographically verified registry of meaningful intellectual artifacts.</p>
            <div className="flex flex-wrap gap-4">
              <Link href="/products/truemark-mint" className="text-truth hover:underline uppercase tracking-wide text-sm font-semibold">
                Explore TrueMark Mint
              </Link>
              <Link href="/cart?add=truemark-mint-object" className="text-gray-300 hover:text-light uppercase tracking-wide text-sm font-semibold">
                Add to Cart
              </Link>
            </div>
          </div>
          <div className="rounded-xl border border-gray-800 bg-[#050505] p-8">
            <h2 className="mb-4 text-3xl font-bold">The GOAT</h2>
            <p className="mb-6 text-gray-400">Legacy preservation engine that captures, verifies, and premieres your story with truth-first storytelling.</p>
            <div className="flex flex-wrap gap-4">
              <Link href="/goat" className="text-truth hover:underline uppercase tracking-wide text-sm font-semibold">
                Explore The GOAT
              </Link>
              <Link href="/cart?add=goat-legacy-session" className="text-gray-300 hover:text-light uppercase tracking-wide text-sm font-semibold">
                Add to Cart
              </Link>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
