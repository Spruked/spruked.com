import Link from 'next/link';
import { WordmarkLogo } from '@/components/brand/WordmarkLogo';
import { PrimaryLogo } from '@/components/brand/PrimaryLogo';
import { getPageContent } from '@/lib/page-content';

export const metadata = {
  title: 'True Mark Mint — Spruked',
  description: 'Cryptographic asset verification with ChaCha20-Poly1305 encryption and a ten-layer certificate.',
};

export default async function TrueMarkMintPage() {
  const content = await getPageContent('true-mark-mint');
  const { hero, encryptionHighlights, certificateLayers, process, stats } = content;

  return (
    <div className="bg-black text-light">
      <section className="relative overflow-hidden px-6 py-24 md:px-12" id="mint">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-truth/10 via-transparent to-transparent" />
          <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gray-900/30" />
        </div>
        <div className="mx-auto flex max-w-6xl flex-col gap-10">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <span className="text-xs font-semibold uppercase tracking-[0.5em] text-truth">{hero.eyebrow}</span>
            <WordmarkLogo size="sm" />
          </div>
          <div className="space-y-6">
            <h1 className="text-4xl font-black leading-tight tracking-tight text-light sm:text-6xl md:text-7xl">
              {hero.headline}
              <span className="block text-3xl font-semibold text-truth sm:text-4xl">{hero.highlight}</span>
            </h1>
            <p className="max-w-3xl text-lg text-gray-400 sm:text-xl">{hero.description}</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link
              href={hero.primaryCta.href}
              className="inline-flex items-center gap-2 rounded-full bg-light px-8 py-3 text-sm font-semibold uppercase tracking-[0.4em] text-dark hover:bg-truth hover:text-light"
            >
              {hero.primaryCta.label}
            </Link>
            {hero.secondaryCta && (
              <Link
                href={hero.secondaryCta.href}
                className="inline-flex items-center gap-2 rounded-full border border-gray-700 px-8 py-3 text-sm font-semibold uppercase tracking-[0.4em] text-gray-300 hover:border-light hover:text-light"
              >
                {hero.secondaryCta.label}
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="border-t border-b border-gray-900/60 bg-[#070707] px-6 py-20 md:px-12" id="encryption">
        <div className="mx-auto max-w-6xl space-y-8">
          <header className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.5em] text-truth">Military-grade encryption</p>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Encryption before storage</h2>
            <p className="max-w-3xl text-gray-400">
              Plaintext never touches permanent storage. Client-side ChaCha20-Poly1305 encryption ensures your asset is protected before it reaches Arweave or IPFS.
            </p>
          </header>
          <div className="grid gap-px overflow-hidden rounded-3xl border border-gray-900 bg-gray-900/30 md:grid-cols-2">
            {encryptionHighlights.map((card) => (
              <article key={card.badge} className="flex h-full flex-col gap-4 bg-black p-8">
                <span className="font-mono text-xs text-gray-500">{card.badge}</span>
                <h3 className="text-2xl font-semibold tracking-tight">{card.title}</h3>
                <p className="text-gray-400">{card.body}</p>
                <p className="font-mono text-xs uppercase tracking-[0.4em] text-gray-600">{card.meta}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-24 md:px-12" id="certificate">
        <div className="mx-auto max-w-6xl space-y-12">
          <header className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.5em] text-truth">Authenticity verification</p>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Ten-layer certificate</h2>
            <p className="max-w-3xl text-gray-400">Each mint receives a comprehensive certificate with redundant, tamper-evident layers.</p>
          </header>
          <div className="rounded-3xl border border-gray-900 bg-black/40">
            {certificateLayers.map((layer, index) => (
              <div key={layer.title} className="grid gap-0 border-b border-gray-900 last:border-none md:grid-cols-[120px_1fr]">
                <div className="flex items-center justify-center border-b border-gray-900 bg-[#0f0f0f] text-4xl font-semibold text-gray-700 md:border-b-0">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold tracking-tight">{layer.title}</h3>
                  <p className="mt-2 text-gray-400">{layer.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-b border-gray-900/60 bg-[#050505] px-6 py-20 md:px-12" id="process">
        <div className="mx-auto max-w-6xl space-y-12">
          <header className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.5em] text-truth">Minting workflow</p>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Four stages to permanence</h2>
            <p className="text-gray-400">From upload to permanent, verified asset. Encrypted. Certified. Stored.</p>
          </header>
          <div className="grid gap-8 md:grid-cols-4">
            {process.map((step, index) => (
              <div key={step.title} className="space-y-4">
                <span className="font-mono text-4xl text-truth">{String(index + 1).padStart(2, '0')}</span>
                <h3 className="text-xl font-semibold uppercase tracking-[0.3em]">{step.title}</h3>
                <p className="text-gray-400">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16 md:px-12">
        <div className="mx-auto grid max-w-5xl gap-8 rounded-3xl border border-gray-900 bg-black/60 p-10 text-center md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="space-y-2">
              <p className="font-mono text-3xl font-semibold">{stat.value}</p>
              <p className="text-xs uppercase tracking-[0.4em] text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 pb-24 md:px-12">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 rounded-3xl border border-gray-900 bg-gradient-to-br from-[#111] via-black to-black p-12 text-center">
          <PrimaryLogo size={120} />
          <h3 className="text-3xl font-black tracking-tight">Encrypted. Certified. Unimpeachable.</h3>
          <p className="text-gray-400">Deploy True Mark Mint when the asset must survive every audit. Cryptography replaces hope.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href={hero.primaryCta.href}
              className="rounded-full bg-truth px-8 py-3 text-sm font-semibold uppercase tracking-[0.4em] text-light"
            >
              {hero.primaryCta.label}
            </Link>
            {hero.secondaryCta && (
              <Link
                href={hero.secondaryCta.href}
                className="rounded-full border border-gray-700 px-8 py-3 text-sm font-semibold uppercase tracking-[0.4em] text-gray-300"
              >
                {hero.secondaryCta.label}
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
