import { Section } from '@/components/ui/Section';
import Link from 'next/link';

export const metadata = {
  title: 'TrueMark Digital Object Types — Spruked',
  description: 'Understanding Knowledge NFTs within the TrueMark Registry.',
};

export default function ObjectTypesPage() {
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
            TrueMark Digital <span className="text-truth">Object Types</span>
          </h1>
          <p className="mt-6 text-3xl font-bold tracking-tight text-light">
            Understanding Knowledge NFTs
          </p>
        </div>
        <div className="mt-10 space-y-6 text-xl text-gray-300">
          <p>
            TrueMark objects are designed to preserve <strong className="text-white">knowledge, expertise, and meaningful digital artifacts</strong> in a structured and verifiable form.
          </p>
          <p>
            Unlike speculative NFTs, TrueMark objects represent <strong className="text-white">real intellectual artifacts</strong> that can be preserved, licensed, transferred, or inherited over time.
          </p>
          <p className="text-truth font-medium py-4">
            Each NFT type exists to serve a different purpose in the preservation of knowledge and digital legacy.
          </p>
        </div>
      </Section>

      {/* Visual Grid Top */}
      <Section className="mx-auto max-w-5xl pb-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <a href="#k-nft" className="bg-[#050505] rounded-xl p-6 border border-gray-800 hover:border-gray-600 transition-colors group block text-center">
            <h3 className="font-mono text-2xl font-bold text-white group-hover:text-truth transition-colors mb-2">K-NFT</h3>
            <p className="text-sm text-gray-400 font-medium">Knowledge Object</p>
          </a>
          <a href="#kl-nft" className="bg-[#050505] rounded-xl p-6 border border-gray-800 hover:border-gray-600 transition-colors group block text-center">
            <h3 className="font-mono text-2xl font-bold text-white group-hover:text-truth transition-colors mb-2">KL-NFT</h3>
            <p className="text-sm text-gray-400 font-medium">Licensed Knowledge</p>
          </a>
          <a href="#h-nft" className="bg-[#050505] rounded-xl p-6 border border-gray-800 hover:border-gray-600 transition-colors group block text-center">
            <h3 className="font-mono text-2xl font-bold text-white group-hover:text-truth transition-colors mb-2">H-NFT</h3>
            <p className="text-sm text-gray-400 font-medium">Heirloom Object</p>
          </a>
          <a href="#l-nft" className="bg-[#050505] rounded-xl p-6 border border-gray-800 hover:border-gray-600 transition-colors group block text-center">
            <h3 className="font-mono text-2xl font-bold text-white group-hover:text-truth transition-colors mb-2">L-NFT</h3>
            <p className="text-sm text-gray-400 font-medium">Legacy Object</p>
          </a>
          <a href="#e-nft" className="bg-truth/10 rounded-xl p-6 border border-truth/30 hover:border-truth/60 transition-colors group block text-center col-span-2 md:col-span-1 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
            <h3 className="font-mono text-2xl font-bold text-truth mb-2">E-NFT</h3>
            <p className="text-sm text-gray-300 font-medium">Enterprise Object</p>
          </a>
        </div>
      </Section>

      {/* K-NFT */}
      <Section id="k-nft" className="mx-auto max-w-4xl py-12 scroll-mt-20">
        <div className="border-t border-gray-900 pt-12">
          <div className="flex items-center gap-4 mb-4">
            <span className="bg-gray-800 text-white font-mono font-bold px-3 py-1 rounded text-xl">K-NFT</span>
            <h2 className="text-3xl font-bold text-light">Knowledge Object</h2>
          </div>
          <p className="text-xl text-gray-300 my-6">
            A <strong className="text-white">K-NFT</strong> represents a single intellectual artifact or a tightly related set of artifacts.
          </p>
          <p className="text-lg text-gray-400 mb-8">
            These objects preserve a specific piece of knowledge in a durable digital format.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-[#050505] border border-gray-800 p-8 rounded-xl">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Examples</h3>
              <ul className="list-inside list-disc space-y-2 text-gray-300">
                <li>A single book or manuscript</li>
                <li>A research paper</li>
                <li>A technical document</li>
                <li>An engineering method</li>
                <li>A proprietary process</li>
                <li>An instructional guide</li>
                <li>A creative work</li>
              </ul>
            </div>
            <div className="bg-[#050505] border border-gray-800 p-8 rounded-xl flex flex-col">
              <h3 className="text-sm font-bold text-truth uppercase tracking-widest mb-4">Value Model</h3>
              <p className="text-gray-400 mb-4">A K-NFT can be:</p>
              <ul className="list-inside list-disc space-y-2 text-white mb-6">
                <li>Sold to another party</li>
                <li>Licensed for use or distribution</li>
                <li>Transferred to institutions or collectors</li>
              </ul>
              <p className="text-gray-300 mt-auto">
                In many cases, a K-NFT functions like a <strong className="text-white">digital edition of an intellectual artifact</strong>, preserved with permanent authorship and timestamp verification.
              </p>
            </div>
          </div>

          <div className="mt-8 bg-[#0a0a0a] border border-gray-800 p-8 rounded-xl">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6">Certificate Representation</h3>
            <img 
              src="/assets/CertificateKNFTsample.png" 
              alt="K-NFT Spruked Certificate Sample" 
              className="w-full max-w-2xl mx-auto h-auto rounded-lg shadow-[0_0_30px_rgba(255,255,255,0.05)] border border-gray-800" 
            />
          </div>
        </div>
      </Section>

      {/* KL-NFT */}
      <Section id="kl-nft" className="mx-auto max-w-4xl py-12 scroll-mt-20">
        <div className="border-t border-gray-900 pt-12">
          <div className="flex items-center gap-4 mb-4">
            <span className="bg-gray-800 text-white font-mono font-bold px-3 py-1 rounded text-xl">KL-NFT</span>
            <h2 className="text-3xl font-bold text-light">Knowledge License Collection</h2>
          </div>
          <p className="text-xl text-gray-300 my-6">
            A <strong className="text-white">KL-NFT</strong> represents a structured collection of knowledge artifacts designed for licensing and distribution.
          </p>
          <p className="text-lg text-gray-400 mb-8 border-l-4 border-truth pl-4 py-1">
            Where a K-NFT represents a single artifact, a KL-NFT represents <strong className="text-white">a complete knowledge system.</strong>
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-[#050505] border border-gray-800 p-8 rounded-xl">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Examples</h3>
              <ul className="list-inside list-disc space-y-2 text-gray-300">
                <li>Professional training courses</li>
                <li>Masterclass programs</li>
                <li>Structured learning systems</li>
                <li>Educational curriculum</li>
                <li>Research collections</li>
                <li>Multi-part technical instruction</li>
              </ul>
            </div>
            <div className="bg-[#050505] border border-gray-800 p-8 rounded-xl flex flex-col">
              <h3 className="text-sm font-bold text-truth uppercase tracking-widest mb-4">Value Model</h3>
              <p className="text-gray-400 mb-4">KL-NFTs are designed to be <strong className="text-white">licensed repeatedly</strong>. Owners may:</p>
              <ul className="list-inside list-disc space-y-2 text-white mb-6">
                <li>License access to the content</li>
                <li>Distribute learning programs</li>
                <li>Offer certification or training based on the material</li>
              </ul>
              <p className="text-gray-300 mt-auto text-sm">
                This makes KL-NFTs ideal for educators, subject-matter experts, and organizations that want to preserve and distribute structured expertise.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* H-NFT */}
      <Section id="h-nft" className="mx-auto max-w-4xl py-12 scroll-mt-20">
        <div className="border-t border-gray-900 pt-12">
          <div className="flex items-center gap-4 mb-4">
            <span className="bg-gray-800 text-white font-mono font-bold px-3 py-1 rounded text-xl">H-NFT</span>
            <h2 className="text-3xl font-bold text-light">Heirloom Object</h2>
          </div>
          <p className="text-xl text-gray-300 my-6">
            An <strong className="text-white">H-NFT</strong> preserves knowledge and artifacts intended to be passed down across generations.
          </p>
          <p className="text-lg text-gray-400 mb-8 border-l-4 border-truth pl-4 py-1">
            These objects focus on <strong className="text-white">family legacy and cultural preservation.</strong>
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-[#050505] border border-gray-800 p-8 rounded-xl">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Examples</h3>
              <ul className="list-inside list-disc space-y-2 text-gray-300 mb-6">
                <li>Family recipes</li>
                <li>Letters to future generations</li>
                <li>Historical family documents</li>
                <li>Farming knowledge passed through generations</li>
                <li>Craftsmanship techniques</li>
                <li>Cultural traditions</li>
              </ul>
              <p className="text-gray-400 text-sm mt-auto">
                These artifacts may contain knowledge that has been preserved within families for decades or even centuries.
              </p>
            </div>
            <div className="bg-[#050505] border border-gray-800 p-8 rounded-xl flex flex-col">
              <h3 className="text-sm font-bold text-truth uppercase tracking-widest mb-4">Value Model</h3>
              <p className="text-gray-400 mb-4">Heirloom NFTs may be:</p>
              <ul className="list-inside list-disc space-y-2 text-white mb-6">
                <li>Inherited across generations</li>
                <li>Preserved as family archives</li>
                <li>Licensed if the knowledge becomes valuable to others</li>
              </ul>
              <p className="text-gray-300 mt-auto text-sm">
                The primary goal of an H-NFT is <strong className="text-white">preservation and continuity of family knowledge.</strong>
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* L-NFT */}
      <Section id="l-nft" className="mx-auto max-w-4xl py-12 scroll-mt-20">
        <div className="border-t border-gray-900 pt-12">
          <div className="flex items-center gap-4 mb-4">
            <span className="bg-gray-800 text-white font-mono font-bold px-3 py-1 rounded text-xl">L-NFT</span>
            <h2 className="text-3xl font-bold text-light">Legacy Object</h2>
          </div>
          <p className="text-xl text-gray-300 my-6">
            An <strong className="text-white">L-NFT</strong> represents significant intellectual contributions or life-work artifacts.
          </p>
          <p className="text-lg text-gray-400 mb-8 border-l-4 border-truth pl-4 py-1">
            These objects often preserve work that has <strong className="text-white">long-term historical or intellectual importance.</strong>
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-[#050505] border border-gray-800 p-8 rounded-xl">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Examples</h3>
              <ul className="list-inside list-disc space-y-2 text-gray-300 mb-6">
                <li>Major discoveries</li>
                <li>Important technical designs</li>
                <li>Lifetime research collections</li>
                <li>Influential creative works</li>
                <li>Historical documentation</li>
              </ul>
              <p className="text-gray-400 text-sm mt-auto">
                Legacy NFTs preserve the <strong className="text-white">long-term intellectual footprint of a creator or organization.</strong>
              </p>
            </div>
            <div className="bg-[#050505] border border-gray-800 p-8 rounded-xl flex flex-col">
              <h3 className="text-sm font-bold text-truth uppercase tracking-widest mb-4">Value Model</h3>
              <p className="text-gray-400 mb-4">Legacy objects may be:</p>
              <ul className="list-inside list-disc space-y-2 text-white mb-6">
                <li>Transferred to archives or institutions</li>
                <li>Preserved as historical records</li>
                <li>Licensed for educational or research use</li>
              </ul>
              <p className="text-gray-300 mt-auto text-sm">
                These artifacts are often created to ensure that meaningful contributions are <strong className="text-white">not lost over time.</strong>
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* E-NFT */}
      <Section id="e-nft" className="mx-auto max-w-4xl py-12 scroll-mt-20">
        <div className="border-t border-gray-900 pt-12">
          <div className="flex items-center gap-4 mb-4">
            <span className="bg-truth/20 text-truth font-mono font-bold px-3 py-1 rounded text-xl">E-NFT</span>
            <h2 className="text-3xl font-bold text-light">Enterprise Object</h2>
          </div>
          <p className="text-xl text-gray-300 my-6">
            An <strong className="text-white">E-NFT</strong> represents digital objects created by organizations or institutions.
          </p>
          <p className="text-lg text-gray-400 mb-8 border-l-4 border-truth pl-4 py-1">
            These objects often originate from systems such as <Link href="/products/alpha-certsig" className="text-white hover:underline font-bold">Alpha CertSig infrastructure</Link> and may represent internal or external artifacts.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-[#050505] border border-gray-800 p-8 rounded-xl">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Examples</h3>
              <ul className="list-inside list-disc space-y-2 text-gray-300">
                <li>Institutional research</li>
                <li>Certified documentation</li>
                <li>Technical specifications</li>
                <li>Digital twins</li>
                <li>Product documentation</li>
                <li>Corporate intellectual property</li>
              </ul>
            </div>
            <div className="bg-[#050505] border border-gray-800 p-8 rounded-xl flex flex-col">
              <h3 className="text-sm font-bold text-truth uppercase tracking-widest mb-4">Value Model</h3>
              <p className="text-gray-400 mb-4">Enterprise objects are typically used to:</p>
              <ul className="list-inside list-disc space-y-2 text-white mb-6">
                <li>Preserve internal knowledge</li>
                <li>Track certified documents</li>
                <li>Verify intellectual property</li>
                <li>Maintain institutional memory</li>
              </ul>
              <p className="text-gray-300 mt-auto text-sm">
                In some cases, these objects may also be licensed or transferred between organizations.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Ownership, Licensing, and Inheritance */}
      <Section className="mx-auto max-w-4xl py-12">
        <div className="border-t border-gray-900 pt-12">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="mb-6 text-3xl font-bold text-light">Ownership & Transfer</h2>
              <p className="text-xl text-gray-300 mb-6">TrueMark digital objects are designed to support multiple forms of ownership and transfer.</p>
              <p className="text-lg text-gray-400 mb-4 font-medium uppercase tracking-wide">Depending on intent, an object may be:</p>
              <ul className="space-y-4 text-xl">
                <li className="flex items-center gap-3"><span className="text-truth font-bold">•</span> <span><strong className="text-white">Sold</strong> to another owner</span></li>
                <li className="flex items-center gap-3"><span className="text-truth font-bold">•</span> <span><strong className="text-white">Licensed</strong> for commercial or educational use</span></li>
                <li className="flex items-center gap-3"><span className="text-truth font-bold">•</span> <span><strong className="text-white">Transferred</strong> to institutions or collectors</span></li>
                <li className="flex items-center gap-3"><span className="text-truth font-bold">•</span> <span><strong className="text-white">Inherited</strong> by future generations</span></li>
              </ul>
            </div>
            <div className="bg-[#050505] p-8 rounded-xl border border-gray-800 flex flex-col justify-center">
              <p className="text-xl font-medium text-gray-300 leading-snug">
                The blockchain record provides a <strong className="text-white">verifiable history of authorship and ownership</strong>, while licensing agreements define how the knowledge may be used.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* The Purpose of TrueMark Objects */}
      <Section className="mx-auto max-w-4xl py-12">
        <div className="border-t border-gray-900 pt-12">
          <h2 className="mb-6 text-3xl font-bold text-light text-center">The Purpose</h2>
          <div className="bg-gradient-to-b from-dark to-black border border-gray-800 p-12 rounded-xl text-center max-w-3xl mx-auto">
             <p className="text-2xl font-bold text-white mb-6">
               Knowledge is one of the most valuable things people create.
             </p>
             <p className="text-xl text-gray-400 mb-10">
               Yet most knowledge disappears when files are lost, platforms vanish, or creators pass away.
             </p>
             <p className="text-2xl sm:text-3xl font-bold text-truth leading-tight">
               TrueMark provides a structure where knowledge can become a durable digital artifact that survives beyond its creator.
             </p>
          </div>
        </div>
      </Section>

      {/* CTA */}
      <Section className="mx-auto max-w-4xl pt-8 pb-12 text-center">
        <div className="mx-auto w-16 h-1 bg-gray-800 mb-12 rounded-full"></div>
        <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-widest text-light mb-6">
          Spruked
        </h2>
        <p className="text-3xl sm:text-4xl font-bold text-gray-300 leading-tight">
          Mint your mind.<br className="hidden sm:block"/>{' '}
          <span className="text-truth">It&apos;s worth more than you think.</span>
        </p>
      </Section>
    </div>
  );
}
