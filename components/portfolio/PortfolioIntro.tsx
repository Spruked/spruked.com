import Link from 'next/link';
import { Section } from '@/components/ui/Section';

export function PortfolioIntro({ eyebrow = 'SPRUKED / portfolio', title = 'Portfolio', description: _description }: { eyebrow?: string; title?: string; description?: string }) {
  return <Section className="mx-auto max-w-7xl pb-12 pt-24"><p className="spruked-eyebrow mb-5">{eyebrow}</p><div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end"><div><h1 className="max-w-4xl text-5xl font-black leading-[0.92] tracking-[-0.04em] text-white sm:text-7xl">{title}</h1></div><div><p className="text-xl leading-relaxed text-gray-500">[SECTION INTRODUCTION — FINAL COPY PENDING]</p><Link href="/about" className="mt-7 inline-flex text-xs font-bold uppercase tracking-[0.2em] text-gray-300 hover:text-truth">About Bryan ↗</Link></div></div><div className="spruked-rule mt-14" /></Section>;
}
