import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Contact — Spruked', description: 'Contact Bryan Spruk about the work, systems, writing, and research in the Spruked portfolio.' };

export default function ContactPage() {
  return <main className="mx-auto max-w-5xl px-6 pb-24 pt-24 md:px-12"><p className="spruked-eyebrow mb-5">Contact / Bryan Spruk</p><h1 className="max-w-4xl text-6xl font-black leading-[0.9] tracking-[-0.05em] text-white sm:text-8xl">Let’s talk about the work.</h1><p className="mt-10 max-w-2xl text-2xl leading-relaxed text-gray-300">For collaborations, systems work, writing, research, or a useful correction, send a note.</p><div className="mt-10 flex flex-wrap gap-3"><a href="mailto:bryan@spruked.com" className="rounded-full bg-truth px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white hover:bg-white hover:text-black">bryan@spruked.com</a><Link href="/portfolio" className="rounded-full border border-white/15 px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] text-gray-300 hover:border-truth hover:text-white">Browse the portfolio</Link></div></main>;
}
