import Link from 'next/link';
import { getPageContent } from '@/lib/page-content';
import { PrimaryLogo } from '@/components/brand/PrimaryLogo';

export const metadata = {
  title: 'The GOAT — Spruked',
  description: 'Legacy preservation engine that captures, verifies, and premieres your story with truth-first storytelling.',
};

export default async function GoatPage() {
  const content = await getPageContent('goat');
  const { hero, pillars, timeline, promises, closingCta } = content;

  return (
    <div className="bg-gradient-to-b from-black via-[#050505] to-black text-light">
      <section className="relative overflow-hidden px-6 py-24 md:px-12" id="demo">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-truth/15 via-transparent to-transparent" />
          <div className="absolute left-12 top-12 h-40 w-40 rounded-full border border-gray-900/40" />
        </div>
        <div className="mx-auto flex max-w-5xl flex-col gap-6 text-center">
          <PrimaryLogo size={120} className="mx-auto" />
          <span className="text-xs font-semibold uppercase tracking-[0.5em] text-truth">{hero.eyebrow}</span>
          <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-6xl">
            {hero.headline}
            <span className="block text-3xl font-semibold text-truth sm:text-4xl">{hero.highlight}</span>
          </h1>
          <p className="mx-auto max-w-3xl text-lg text-gray-300">{hero.description}</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href={hero.primaryCta.href as any}>
            <p>
               The phrase &quot;truth with teeth&quot; represents the Spruked philosophy.
            </p>
              className="rounded-full bg-light px-8 py-3 text-sm font-semibold uppercase tracking-[0.4em] text-dark hover:bg-truth hover:text-light"
              {'>'}
              {hero.primaryCta.label}
            </Link>
            {hero.secondaryCta && (
              <Link
               href={hero.secondaryCta.href as any}
                className="rounded-full border border-gray-700 px-8 py-3 text-sm font-semibold uppercase tracking-[0.4em] text-gray-200"
              >
                {hero.secondaryCta.label}
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:px-12">
        <div className="mx-auto max-w-6xl space-y-8">
          <header className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.5em] text-truth">Pillars</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">How the GOAT engine works</h2>
          </header>
          <div className="grid gap-6 md:grid-cols-3">
            {pillars.map((pillar) => (
              <article key={pillar.title} className="flex h-full flex-col gap-4 rounded-3xl border border-gray-900 bg-black/70 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gray-500">{pillar.meta}</p>
                <h3 className="text-2xl font-semibold tracking-tight">{pillar.title}</h3>
                <p className="text-gray-400">{pillar.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-b border-gray-900/60 bg-[#050505] px-6 py-20 md:px-12">
        <div className="mx-auto max-w-6xl space-y-8">
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.5em] text-truth">Timeline</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">From intake to premiere</h2>
          </header>
          <div className="grid gap-6 md:grid-cols-4">
            {timeline.map((event) => (
              <div key={event.title} className="rounded-3xl border border-gray-900 bg-black/60 p-6">
                <h3 className="text-xl font-semibold">{event.title}</h3>
                <p className="mt-3 text-sm text-gray-400">{event.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:px-12">
        <div className="mx-auto max-w-5xl space-y-10">
          <header className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.5em] text-truth">Promises</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight">What never compromises</h2>
          </header>
          <div className="grid gap-6 md:grid-cols-3">
            {promises.map((promise) => (
              <article key={promise.title} className="rounded-3xl border border-gray-900 bg-black/70 p-6">
                <h3 className="text-xl font-semibold">{promise.title}</h3>
                <p className="mt-3 text-gray-400">{promise.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24 md:px-12" id="book">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 rounded-3xl border border-gray-900 bg-[#0b0b0b] p-12 text-center">
          <h3 className="text-3xl font-black tracking-tight">{closingCta.title}</h3>
          <p className="text-gray-400">{closingCta.body}</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
             href={closingCta.primaryCta.href as any}
              className="rounded-full bg-truth px-8 py-3 text-sm font-semibold uppercase tracking-[0.4em] text-light"
            >
              {closingCta.primaryCta.label}
            </Link>
            <Link
             href={closingCta.secondaryCta.href as any}            
              className="rounded-full border border-gray-700 px-8 py-3 text-sm font-semibold uppercase tracking-[0.4em] text-gray-300"
            >
              {closingCta.secondaryCta.label}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
