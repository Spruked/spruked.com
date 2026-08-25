import { Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export const metadata = {
  title: 'TrueMark Mint — Spruked',
  description: 'TrueMark Mint is the founder-curated registry of verified digital knowledge objects issued through the Spruked ecosystem.',
};

export default function TrueMarkMintPage() {
  return (
    <div className="pb-24">
      {/* Top Visual Contrast Block */}
      <div className="bg-[#050505] border-b border-gray-900 py-6">
        <div className="mx-auto max-w-4xl px-4 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-xl font-bold text-truth">TrueMark Mint</h3>
            <p className="text-gray-400 text-sm uppercase tracking-widest mt-1">Curated Registry</p>
          </div>
          <div className="hidden sm:block w-px h-12 bg-gray-800"></div>
          <div className="flex-1 text-center sm:text-right">
            <h3 className="text-xl font-bold text-white">Alpha CertSig</h3>
            <p className="text-gray-400 text-sm uppercase tracking-widest mt-1">Licensed Infrastructure</p>
          </div>
        </div>
      </div>

      {/* Hero */}
      <Section className="mx-auto max-w-4xl pt-24 pb-12">
        <div className="mb-0">
          <h1 className="mt-4 text-5xl font-black leading-tight sm:text-7xl">
            TrueMark <span className="text-truth">Mint</span>
          </h1>
          <p className="mt-6 text-3xl font-bold tracking-tight text-light">
            The Curated Digital Object Vault
          </p>
        </div>
        <div className="mt-10 space-y-6 text-xl text-gray-300">
          <p>
            TrueMark Mint is the <strong className="text-light">founder-curated registry of verified digital knowledge objects issued through the Spruked ecosystem.</strong>
          </p>
          <p>
            Unlike typical NFT platforms that allow anyone to mint anything, TrueMark focuses on <strong className="text-light">authenticity, provenance, and preservation of meaningful intellectual artifacts.</strong>
          </p>
          <div>
            <p className="mb-4 text-gray-400 font-medium">Each object issued through TrueMark is intended to represent something real:</p>
            <ul className="list-inside list-disc space-y-2 text-gray-300">
              <li>Knowledge</li>
              <li>Expertise</li>
              <li>Creative work</li>
              <li>Technical documentation</li>
              <li>Intellectual property</li>
              <li>Personal legacy artifacts</li>
            </ul>
          </div>
          <p className="border-l-4 border-truth pl-5 text-2xl font-medium text-gray-400 mt-8 py-2">
            The goal is not speculation.<br />
            <strong className="text-truth font-bold mt-2 block">The goal is preservation with attribution.</strong>
          </p>
        </div>
      </Section>

      {/* The Distinction */}
      <Section className="mx-auto max-w-4xl py-12">
        <div className="border-t border-gray-900 pt-12">
          <h2 className="mb-8 text-3xl font-bold text-light">The Distinction</h2>
          <p className="mb-8 text-xl text-gray-300">The Spruked ecosystem contains two different minting systems.</p>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-truth/30 bg-truth/5 p-8 relative flex flex-col shadow-[0_0_20px_rgba(255,255,255,0.05)]">
               <h3 className="mb-4 text-2xl font-bold text-truth">TrueMark Mint</h3>
               <p className="mb-4 text-gray-400 font-medium uppercase tracking-widest text-sm">The Curated Registry</p>
               <div className="text-lg text-gray-300 space-y-4">
                 <p>Artifacts issued through TrueMark are selected and issued through the founder vault.</p>
                 <p className="font-bold text-white mt-8">TrueMark is the museum.</p>
               </div>
            </div>
            
            <div className="rounded-xl border border-gray-800 bg-[#050505] p-8">
              <h3 className="mb-4 text-2xl font-bold text-white">Alpha CertSig</h3>
              <p className="mb-4 text-gray-400 font-medium uppercase tracking-widest text-sm">Licensed Infrastructure</p>
              <div className="text-lg text-gray-300 space-y-4">
                <p>Organizations install and operate their own mint engine.</p>
                <p className="font-bold text-white mt-8">Alpha CertSig is the printing press.</p>
              </div>
            </div>
          </div>
          
          <p className="mt-8 text-xl text-gray-400 font-medium text-center">
            This distinction protects the credibility and long-term integrity of the registry.
          </p>
        </div>
      </Section>

      {/* What TrueMark Mints */}
      <Section className="mx-auto max-w-4xl py-12">
        <div className="border-t border-gray-900 pt-12">
          <h2 className="mb-6 text-3xl font-bold text-light">What TrueMark Mints</h2>
          <div className="space-y-6 text-xl text-gray-300">
            <p>TrueMark issues <strong className="text-white">Digital Knowledge Objects.</strong></p>
            <p>These are structured artifacts designed to preserve valuable intellectual content.</p>
            
            <div className="pt-4">
              <p className="mb-4 text-gray-400 font-medium">Examples include:</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <ul className="list-inside list-disc space-y-2 text-gray-300">
                  <li>Research findings</li>
                  <li>Instructional knowledge</li>
                  <li>Professional expertise</li>
                  <li>Creative works</li>
                </ul>
                <ul className="list-inside list-disc space-y-2 text-gray-300">
                  <li>Personal legacy messages</li>
                  <li>Technical documentation</li>
                  <li>Historical records</li>
                </ul>
              </div>
            </div>
            <p className="font-medium text-truth pt-4">Each object is preserved as a <strong className="font-bold text-white">structured digital asset</strong> tied to a permanent certificate.</p>
          </div>
        </div>
      </Section>

      {/* The Digital Knowledge Object Model */}
      <Section className="mx-auto max-w-4xl py-12">
        <div className="border-t border-gray-900 pt-12">
          <h2 className="mb-6 text-3xl font-bold text-light">The Digital Knowledge Object Model</h2>
          <div className="space-y-6 text-xl text-gray-300">
            <p>Traditional NFTs often represent artwork or speculative collectibles.</p>
            <p>TrueMark focuses on <strong className="text-white">knowledge artifacts.</strong></p>
            
            <div className="bg-[#050505] border border-gray-800 p-8 rounded-xl mt-8">
              <p className="mb-6 text-gray-400 font-medium uppercase tracking-wide text-sm">A knowledge object includes:</p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="text-truth font-bold">•</span>
                  <span><strong className="text-white">The original artifact</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-truth font-bold">•</span>
                  <span><strong className="text-white">A forensic certificate</strong></span>
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
            <p className="text-xl text-truth font-medium pt-4">These elements transform a simple file into a <strong className="font-bold text-white">verified digital object.</strong></p>
          </div>
        </div>
      </Section>

      {/* NFT Types in the TrueMark Registry */}
      <Section className="mx-auto max-w-4xl py-12">
         <div className="border-t border-gray-900 pt-12">
          <h2 className="mb-8 text-3xl font-bold text-light">NFT Types in the TrueMark Registry</h2>
          <p className="mb-10 text-xl text-gray-300">TrueMark supports multiple object categories.</p>

          <div className="space-y-8">
            {/* K-NFT */}
            <div className="border border-gray-800 bg-[#050505] p-8 rounded-xl">
              <div className="flex items-center gap-4 mb-4">
                <span className="bg-gray-800 text-white font-mono font-bold px-3 py-1 rounded text-lg">K-NFT</span>
                <h3 className="text-2xl font-bold text-white">Knowledge Objects</h3>
              </div>
              <p className="text-lg text-gray-300 mb-6">Knowledge NFTs preserve expertise and educational content.</p>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-gray-400 mb-2 font-medium text-sm uppercase tracking-wide">Examples include:</p>
                  <ul className="list-inside list-disc text-gray-400 space-y-1">
                    <li>Specialized tutorials</li>
                    <li>Professional training</li>
                    <li>Proprietary methods</li>
                    <li>Technical insights</li>
                  </ul>
                </div>
                <div className="flex items-end">
                  <p className="text-truth font-medium">These artifacts allow knowledge to be preserved and transferred across generations.</p>
                </div>
              </div>
            </div>

            {/* H-NFT */}
            <div className="border border-gray-800 bg-[#050505] p-8 rounded-xl">
              <div className="flex items-center gap-4 mb-4">
                <span className="bg-gray-800 text-white font-mono font-bold px-3 py-1 rounded text-lg">H-NFT</span>
                <h3 className="text-2xl font-bold text-white">Heirloom Objects</h3>
              </div>
              <p className="text-lg text-gray-300 mb-6">Heirloom NFTs preserve personal legacy artifacts.</p>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-gray-400 mb-2 font-medium text-sm uppercase tracking-wide">Examples include:</p>
                  <ul className="list-inside list-disc text-gray-400 space-y-1">
                    <li>Letters to future generations</li>
                    <li>Family knowledge</li>
                    <li>Personal messages</li>
                    <li>Historical records</li>
                  </ul>
                </div>
                <div className="flex items-end">
                  <p className="text-truth font-medium">These objects focus on <strong className="text-white px-1">long-term preservation of personal history.</strong></p>
                </div>
              </div>
            </div>

            {/* L-NFT */}
            <div className="border border-gray-800 bg-[#050505] p-8 rounded-xl">
              <div className="flex items-center gap-4 mb-4">
                <span className="bg-gray-800 text-white font-mono font-bold px-3 py-1 rounded text-lg">L-NFT</span>
                <h3 className="text-2xl font-bold text-white">Legacy Objects</h3>
              </div>
              <p className="text-lg text-gray-300 mb-6">Legacy NFTs preserve significant intellectual or creative work.</p>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-gray-400 mb-2 font-medium text-sm uppercase tracking-wide">Examples include:</p>
                  <ul className="list-inside list-disc text-gray-400 space-y-1">
                    <li>Published works</li>
                    <li>Major technical designs</li>
                    <li>Documented discoveries</li>
                    <li>Historical contributions</li>
                  </ul>
                </div>
                <div className="flex items-end">
                  <p className="text-truth font-medium">These artifacts represent the long-term intellectual footprint of their creator.</p>
                </div>
              </div>
            </div>

            {/* E-NFT */}
            <div className="border border-gray-800 bg-[#050505] p-8 rounded-xl">
              <div className="flex items-center gap-4 mb-4">
                <span className="bg-truth/20 text-truth font-mono font-bold px-3 py-1 rounded text-lg">E-NFT</span>
                <h3 className="text-2xl font-bold text-white">Enterprise Objects</h3>
              </div>
              <p className="text-lg text-gray-300 mb-6">Enterprise NFTs represent verified organizational artifacts.</p>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-gray-400 mb-2 font-medium text-sm uppercase tracking-wide">Examples include:</p>
                  <ul className="list-inside list-disc text-gray-400 space-y-1">
                    <li>Institutional records</li>
                    <li>Internal research</li>
                    <li>Certified documentation</li>
                    <li>Digital twins</li>
                  </ul>
                </div>
                <div className="flex items-end">
                  <p className="text-gray-400 text-sm">Enterprise artifacts are often produced through <Link href="/products/alpha-certsig" className="text-white hover:underline">Alpha CertSig infrastructure</Link> and may optionally appear in the TrueMark registry.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Why TrueMark Exists */}
      <Section className="mx-auto max-w-4xl py-12">
        <div className="border-t border-gray-900 pt-12">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="mb-8 text-3xl font-bold text-light">Why TrueMark Exists</h2>
              <div className="space-y-4 text-xl text-gray-300">
                <p>Modern knowledge is fragile.</p>
                <ul className="text-gray-400 space-y-1 font-mono text-sm py-4">
                  <li>&gt; Files disappear.</li>
                  <li>&gt; Platforms vanish.</li>
                  <li>&gt; Creators lose attribution.</li>
                </ul>
                <p>TrueMark exists to ensure that meaningful digital artifacts are preserved with <strong className="text-white">structure, verification, and historical context.</strong></p>
                <p className="text-truth font-medium pt-4">Instead of existing as scattered files, knowledge becomes a <strong className="text-white">durable digital object with a permanent record of origin.</strong></p>
              </div>
            </div>
            
            {/* The Value of a TrueMark Object */}
            <div>
              <h2 className="mb-8 text-3xl font-bold text-light">The Value of an Object</h2>
              <ul className="space-y-6">
                <li>
                  <span className="text-white font-bold block text-xl mb-1">Authorship</span>
                  <span className="text-gray-400 text-base">Clear identification of the creator.</span>
                </li>
                <li>
                  <span className="text-white font-bold block text-xl mb-1">Timestamped Origin</span>
                  <span className="text-gray-400 text-base">Verifiable issuance record.</span>
                </li>
                <li>
                  <span className="text-white font-bold block text-xl mb-1">Structured Preservation</span>
                  <span className="text-gray-400 text-base">Artifacts stored with durable metadata.</span>
                </li>
                <li>
                  <span className="text-white font-bold block text-xl mb-1">Transferable Knowledge</span>
                  <span className="text-gray-400 text-base">Ideas and expertise that survive beyond their original creator.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* Who Uses TrueMark & Philosophy */}
      <Section className="mx-auto max-w-4xl py-12">
        <div className="border-t border-gray-900 pt-12">
          <h2 className="mb-6 text-3xl font-bold text-light">Who Uses TrueMark</h2>
          <p className="mb-8 text-xl text-gray-300">TrueMark is designed for individuals and organizations who understand that knowledge has lasting value.</p>
          
          <div className="bg-[#050505] p-8 rounded-xl border border-gray-800 mb-12">
            <p className="text-gray-400 font-medium mb-4 uppercase tracking-wide text-sm">Typical users include:</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <ul className="list-inside list-disc text-gray-300 space-y-2 text-lg">
                <li>Subject matter experts</li>
                <li>Educators and researchers</li>
                <li>Engineers and developers</li>
              </ul>
              <ul className="list-inside list-disc text-gray-300 space-y-2 text-lg">
                <li>Writers and creators</li>
                <li>Families preserving legacy knowledge</li>
                <li>Organizations documenting internal discoveries</li>
              </ul>
            </div>
          </div>

          <div className="bg-truth/5 border border-truth/20 p-8 rounded-xl text-center">
            <h2 className="text-2xl font-bold text-light mb-4">The Philosophy</h2>
            <p className="text-xl text-gray-300 mb-4">TrueMark operates under a simple idea:</p>
            <p className="text-2xl text-white font-bold mb-4">Knowledge is one of the most valuable assets a person can create.</p>
            <p className="text-lg text-truth font-medium uppercase tracking-wide">If knowledge has value, it deserves a system capable of preserving it properly.</p>
          </div>
        </div>
      </Section>

      {/* The Registry */}
      <Section className="mx-auto max-w-4xl py-12 text-center">
        <div className="border-t border-gray-900 pt-12">
          <h2 className="mb-6 text-3xl font-bold text-light">The Registry</h2>
          <div className="space-y-6 text-xl text-gray-300 max-w-3xl mx-auto">
            <p>Objects issued through TrueMark become part of the growing <strong className="text-white">TrueMark Digital Knowledge Registry.</strong></p>
            <p>This registry acts as a long-term archive of verified intellectual artifacts created within the Spruked ecosystem.</p>
            <p className="text-truth font-medium pt-4">Over time, the registry becomes a searchable library of expertise and discovery.</p>
          </div>
        </div>
      </Section>

      {/* Divider & CTA */}
      <Section className="mx-auto max-w-4xl pt-8 pb-12 text-center">
        <div className="mx-auto w-16 h-1 bg-gray-800 mb-12 rounded-full"></div>
        <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-widest text-light mb-6">
          Spruked
        </h2>
        <p className="text-3xl sm:text-4xl font-bold text-white leading-tight">
          Mint your mind.<br className="hidden sm:block"/>{' '}
          <span className="text-truth">It&apos;s worth more than you think.</span>
        </p>
      </Section>
    </div>
  );
}
