import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import LandingSplash from '@/components/ui/LandingSplash';
import { PortfolioCard } from '@/components/portfolio/PortfolioCard';
import { featuredPortfolio, portfolioCategories } from '@/data/portfolio';

export const metadata: Metadata = { title: 'spruked — Truth with teeth.', description: '[SPRUKED SITE DESCRIPTION — FINAL COPY PENDING]', alternates: { canonical: '/' } };

export default function Home() {
  const categoryRoutes = ['/ai-intelligent-systems', '/software-platforms', '/books-writing', '/research-architecture', '/brand', '/archive'];
  return <>
    <LandingSplash />
    <section className="relative isolate overflow-hidden border-b border-white/10 px-6 py-16 sm:py-24 md:px-12 md:py-28 lg:min-h-[calc(100vh-72px)] lg:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_45%,rgba(255,45,45,0.14),transparent_28rem),radial-gradient(circle_at_85%_10%,rgba(255,255,255,0.06),transparent_24rem)]" />
      <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(360px,0.9fr)_1.1fr] lg:items-center lg:gap-16">
        <div className="flex justify-center lg:justify-start"><Image src="/logos/spruked-symbol-white.svg" alt="SPRUKED U mark" width={600} height={600} priority className="h-auto w-[min(78vw,520px)] drop-shadow-[0_0_52px_rgba(255,45,45,0.14)]" /></div>
        <div><p className="spruked-eyebrow mb-6">SPRUKED / primary identity</p><h1 className="text-7xl font-black uppercase leading-[0.78] tracking-[-0.07em] text-white sm:text-9xl">SPRUKED</h1><p className="mt-8 max-w-2xl text-xl leading-relaxed text-gray-500 sm:text-2xl">[SPRUKED PRIMARY IDENTITY STATEMENT — FINAL COPY PENDING]</p><p className="mt-6 max-w-xl text-sm leading-relaxed text-gray-600">[SHORT ORIENTATION TO THE BODY OF WORK — FINAL COPY PENDING]</p><div className="mt-9 flex flex-wrap gap-3"><Link href="/portfolio" className="rounded-full bg-truth px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white hover:bg-white hover:text-black">View the body of work</Link><Link href="/about" className="rounded-full border border-white/15 px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] text-gray-300 hover:border-truth hover:text-white">About</Link></div></div>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-6 py-24 md:px-12"><div className="mb-10"><p className="spruked-eyebrow mb-4">Body of work</p><h2 className="text-4xl font-black tracking-tight text-white sm:text-6xl">[BODY OF WORK INTRODUCTION — FINAL COPY PENDING]</h2></div><p className="mb-10 max-w-3xl text-lg leading-relaxed text-gray-500">[SYSTEMS / SOFTWARE / RESEARCH / WRITING / ARCHITECTURE ORIENTATION — FINAL COPY PENDING]</p><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{featuredPortfolio.map((entry) => <PortfolioCard key={entry.slug} entry={entry} />)}</div></section>

    <section className="border-y border-white/10 bg-white/[0.02] px-6 py-24 md:px-12"><div className="mx-auto max-w-7xl"><p className="spruked-eyebrow mb-5">Major areas</p><h2 className="max-w-3xl text-4xl font-black tracking-tight text-white sm:text-6xl">[MAJOR AREAS INTRODUCTION — FINAL COPY PENDING]</h2><div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{portfolioCategories.map((category, index) => <Link key={category} href={categoryRoutes[index]} className="group rounded-2xl border border-white/10 bg-black/30 p-6 hover:border-truth/50"><span className="text-xs font-mono text-truth">0{index + 1}</span><h3 className="mt-12 text-xl font-bold text-white group-hover:text-truth">{category}</h3><p className="mt-4 text-sm text-gray-600">[ONE-LINE AREA DESCRIPTION PENDING]</p><span className="mt-5 block text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Open area ↗</span></Link>)}</div></div></section>

    <section className="mx-auto max-w-7xl px-6 py-24 md:px-12"><div className="grid gap-10 rounded-3xl border border-white/10 bg-white/[0.02] p-8 md:grid-cols-[0.7fr_1.3fr] md:p-12"><div><p className="spruked-eyebrow mb-5">Bryan Spruk</p><h2 className="text-4xl font-black tracking-tight text-white sm:text-5xl">Builder. Founder. Systems Architect. Author.</h2></div><div className="min-h-[220px] rounded-2xl border border-dashed border-white/15 p-6 text-sm leading-relaxed text-gray-600">[BRYAN SPRUK FOUNDER / BUILDER INTRODUCTION — FINAL COPY PENDING]<br /><br />[ADDITIONAL BIOGRAPHY PARAGRAPH PENDING]<br /><br />[ADDITIONAL BIOGRAPHY PARAGRAPH PENDING]</div></div></section>

    <section className="border-y border-white/10 bg-black/20 px-6 py-24 md:px-12"><div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2"><Link href="/books-writing" className="rounded-2xl border border-white/10 p-8 hover:border-truth/50"><p className="spruked-eyebrow mb-5">Writing / books</p><h2 className="text-3xl font-black text-white">[WRITING ENTRY STATEMENT — FINAL COPY PENDING]</h2><span className="mt-10 block text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Open writing ↗</span></Link><Link href="/research-architecture" className="rounded-2xl border border-white/10 p-8 hover:border-truth/50"><p className="spruked-eyebrow mb-5">Research / architecture</p><h2 className="text-3xl font-black text-white">[RESEARCH ENTRY STATEMENT — FINAL COPY PENDING]</h2><span className="mt-10 block text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Open research ↗</span></Link></div></section>

    <section className="mx-auto max-w-7xl px-6 py-24 md:px-12"><div className="grid gap-8 rounded-3xl border border-truth/25 bg-truth/[0.04] p-8 md:grid-cols-[1fr_auto] md:items-end md:p-12"><div><p className="spruked-eyebrow mb-5">Contact</p><h2 className="max-w-3xl text-4xl font-black tracking-tight text-white sm:text-5xl">[CLOSING STATEMENT — FINAL COPY PENDING]</h2><p className="mt-5 max-w-2xl text-gray-600">[CONTACT ORIENTATION — FINAL COPY PENDING]</p></div><Link href="/contact" className="rounded-full border border-white/20 px-6 py-3 text-center text-xs font-bold uppercase tracking-[0.2em] text-gray-200 hover:border-truth hover:text-white">Contact</Link></div></section>
  </>;
}
