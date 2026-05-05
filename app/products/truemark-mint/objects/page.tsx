import { Section } from '@/components/ui/Section';
import Link from 'next/link';

export const metadata = {
  title: 'What Are TrueMark Objects? — Spruked',
  description: 'TrueMark Objects are structured digital artifacts that represent verified knowledge, intellectual work, or meaningful historical records.',
};

export default function TrueMarkObjectsPage() {
  return (
    <div className="pb-24">
      {/* Top Visual Contrast Block */}
      <div className="bg-[#050505] border-b border-gray-900 py-6">
        <div className="mx-auto max-w-4xl px-4 flex justify-between items-center gap-6">
          <Link href="/products/truemark-mint" className="text-gray-400 hover:text-truth transition-colors uppercase tracking-widest text-sm font-semibold flex items-center gap-2">
            <span>←</span> Back to TrueMark Mint
          </Link>
        </div>
      </div>

      {/* Hero */}
      <Section className="mx-auto max-w-4xl pt-24 pb-12">
        <div className="mb-0">
          <h1 className="mt-4 text-5xl font-black leading-tight sm:text-7xl">
            What Are <span className="text-truth">TrueMark Objects?</span>
          </h1>
        </div>
        <div className="mt-10 space-y-6 text-2xl text-gray-300">
          <p className="font-bold text-light">
            TrueMark Objects are structured digital artifacts that represent verified knowledge, intellectual work, or meaningful historical records.
          </p>
          <p className="text-xl">
            Instead of being simple files or speculative tokens, a TrueMark Object combines several elements into a <strong className="text-white">durable digital record.</strong>
          </p>
          
          <div className="bg-[#050505] border border-gray-800 p-8 rounded-xl mt-8">
            <ul className="space-y-4 text-lg">
              <li className="flex items-start gap-3">
                <span className="text-truth font-bold">•</span>
                <span><strong className="text-white">The original artifact</strong> (document, knowledge, media, etc.)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-truth font-bold">•</span>
                <span><strong className="text-white">A forensic certificate</strong> verifying its origin</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-truth font-bold">•</span>
                <span><strong className="text-white">A structured identifier</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-truth font-bold">•</span>
                <span><strong className="text-white">Authorship attribution</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-truth font-bold">•</span>
                <span><strong className="text-white">Timestamp verification</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-truth font-bold">•</span>
                <span><strong className="text-white">Preservation metadata</strong></span>
              </li>
            </ul>
          </div>
          
          <p className="text-xl text-truth font-medium pt-4">
            Together these elements transform ordinary information into a <strong className="text-white font-bold">verified digital object with a permanent record of origin.</strong>
          </p>
        </div>
      </Section>

      {/* Why TrueMark Objects Exist */}
      <Section className="mx-auto max-w-4xl py-12">
        <div className="border-t border-gray-900 pt-12">
          <h2 className="mb-8 text-3xl font-bold text-light">Why TrueMark Objects Exist</h2>
          
          <div className="space-y-6 text-xl text-gray-300">
            <p>Most knowledge today lives in fragile places:</p>
            
            <ul className="font-mono text-sm text-gray-400 space-y-2 py-4">
              <li>&gt; PDFs that disappear</li>
              <li>&gt; Cloud folders that get lost</li>
              <li>&gt; Platforms that shut down</li>
              <li>&gt; Research that loses attribution</li>
              <li>&gt; Family knowledge that dies with a generation</li>
            </ul>
            
            <p className="mt-6 text-2xl font-bold text-white">TrueMark Objects were created to solve this problem.</p>
            
            <p className="text-truth font-medium py-4">
              They turn important knowledge into <strong className="text-white">durable digital assets that can be preserved, verified, and transferred over time.</strong>
            </p>
          </div>
        </div>
      </Section>

      {/* Types of TrueMark Objects */}
      <Section className="mx-auto max-w-4xl py-12">
        <div className="border-t border-gray-900 pt-12">
          <h2 className="mb-8 text-3xl font-bold text-light">Types of TrueMark Objects</h2>
          <p className="mb-10 text-xl text-gray-300">TrueMark uses several object types depending on the nature of the knowledge being preserved.</p>

          <div className="space-y-6">
            
            <div className="border border-gray-800 bg-[#050505] p-8 rounded-xl flex flex-col md:flex-row gap-6 md:items-center">
              <div className="shrink-0 md:w-32">
                <span className="bg-gray-800 text-white font-mono font-bold px-3 py-1 rounded text-lg">K-NFT</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Knowledge Object</h3>
                <p className="text-lg text-gray-400">A single artifact such as a book, document, research paper, or instructional guide.</p>
              </div>
            </div>

            <div className="border border-gray-800 bg-[#050505] p-8 rounded-xl flex flex-col md:flex-row gap-6 md:items-center">
              <div className="shrink-0 md:w-32">
                <span className="bg-gray-800 text-white font-mono font-bold px-3 py-1 rounded text-lg">KL-NFT</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Knowledge License Collection</h3>
                <p className="text-lg text-gray-400">A structured set of knowledge designed for licensing, such as courses, masterclasses, or training programs.</p>
              </div>
            </div>

            <div className="border border-gray-800 bg-[#050505] p-8 rounded-xl flex flex-col md:flex-row gap-6 md:items-center">
              <div className="shrink-0 md:w-32">
                <span className="bg-gray-800 text-white font-mono font-bold px-3 py-1 rounded text-lg">H-NFT</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Heirloom Object</h3>
                <p className="text-lg text-gray-400">Family knowledge intended to be passed down across generations, such as recipes, traditions, or historical records.</p>
              </div>
            </div>

            <div className="border border-gray-800 bg-[#050505] p-8 rounded-xl flex flex-col md:flex-row gap-6 md:items-center">
              <div className="shrink-0 md:w-32">
                <span className="bg-gray-800 text-white font-mono font-bold px-3 py-1 rounded text-lg">L-NFT</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Legacy Object</h3>
                <p className="text-lg text-gray-400">Major intellectual contributions or lifetime works preserved for long-term historical value.</p>
              </div>
            </div>

            <div className="border border-truth/30 bg-truth/5 p-8 rounded-xl flex flex-col md:flex-row gap-6 md:items-center relative shadow-[0_0_20px_rgba(255,255,255,0.05)]">
              <div className="shrink-0 md:w-32">
                <span className="bg-truth/20 text-truth font-mono font-bold px-3 py-1 rounded text-lg">E-NFT</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-truth mb-2">Enterprise Object</h3>
                <p className="text-lg text-gray-300">Organizational artifacts such as research records, technical documentation, or certified institutional data.</p>
              </div>
            </div>

          </div>
        </div>
      </Section>

      {/* What Makes Them Valuable */}
      <Section className="mx-auto max-w-4xl py-12">
        <div className="border-t border-gray-900 pt-12">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="mb-6 text-3xl font-bold text-light">What Makes Them Valuable</h2>
              <p className="text-xl text-gray-300 mb-6">TrueMark Objects can support multiple forms of use and transfer.</p>
              <p className="text-lg text-gray-400 mb-4 font-medium uppercase tracking-wide">Depending on the creator&apos;s intent, an object may be:</p>
              <ul className="space-y-4 text-xl">
                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-truth rounded-full"></span> <strong className="text-white">Sold</strong></li>
                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-truth rounded-full"></span> <strong className="text-white">Licensed</strong></li>
                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-truth rounded-full"></span> <strong className="text-white">Transferred</strong></li>
                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-truth rounded-full"></span> <strong className="text-white">Collected</strong></li>
                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-truth rounded-full"></span> <strong className="text-white">Inherited</strong></li>
              </ul>
            </div>
            <div className="bg-[#050505] p-8 rounded-xl border border-gray-800 flex flex-col justify-center">
              <p className="text-2xl font-medium text-gray-300 leading-snug">
                The value comes from the <strong className="text-white">knowledge or artifact itself</strong>, while TrueMark provides the structure that preserves its authenticity and history.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* In Simple Terms */}
      <Section className="mx-auto max-w-4xl py-12 pb-24">
        <div className="border-t border-gray-900 pt-12">
          <div className="bg-gradient-to-b from-dark to-black border border-gray-800 p-12 rounded-xl text-center">
             <h2 className="mb-6 text-2xl font-bold text-gray-400 uppercase tracking-widest">In Simple Terms</h2>
             <p className="text-2xl sm:text-3xl font-medium text-gray-300 mb-8 max-w-2xl mx-auto">
               A TrueMark Object turns knowledge into something that can be:
             </p>
             <div className="flex flex-wrap justify-center gap-4 text-xl sm:text-2xl font-bold">
               <span className="text-white bg-[#050505] border border-gray-800 px-4 py-2 rounded-lg">Preserved</span>
               <span className="text-white bg-[#050505] border border-gray-800 px-4 py-2 rounded-lg">Verified</span>
               <span className="text-white bg-[#050505] border border-gray-800 px-4 py-2 rounded-lg">Owned</span>
               <span className="text-white bg-[#050505] border border-gray-800 px-4 py-2 rounded-lg">Licensed</span>
             </div>
             <p className="mt-6 text-xl sm:text-2xl font-bold text-truth">
               or passed down to future generations.
             </p>
          </div>
        </div>
      </Section>
    </div>
  );
}
