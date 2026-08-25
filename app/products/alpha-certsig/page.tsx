import { Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import Image from 'next/image';

export const metadata = {
  title: 'Alpha CertSig Mint Engine — Spruked',
  description: 'Alpha CertSig is a self-hosted mint engine designed for institutions and sovereign creators needing forensic-grade digital object issuance.',
};

export default function AlphaCertSigPage() {
  return (
    <div className="pb-24">
      {/* Hero */}
      <Section className="mx-auto max-w-4xl pt-24 pb-12">
        <div className="mb-0">
          <h1 className="mt-4 text-5xl font-black leading-tight sm:text-7xl">
            Alpha CertSig <span className="text-truth">Elite Mint Engine</span>
          </h1>
          <p className="mt-6 text-3xl font-bold tracking-tight text-light">
            Sovereign Digital Object Infrastructure
          </p>
        </div>
        <div className="mt-10 space-y-6 text-xl text-gray-300">
          <p>
            Alpha CertSig is a <strong className="text-light">self-hosted mint engine designed for institutions and sovereign creators who need forensic-grade digital object issuance without relying on third-party platforms.</strong>
          </p>
          <p>
            Unlike marketplace NFT systems, Alpha CertSig operates as <strong className="text-light">licensed infrastructure</strong> that runs inside your own environment.
          </p>
          <div>
            <p className="mb-4 text-gray-400 font-medium">Organizations use it to mint:</p>
            <ul className="list-inside list-disc space-y-2 text-gray-300">
              <li>Digital records</li>
              <li>Intellectual property</li>
              <li>Digital twins</li>
              <li>Certified documents</li>
              <li>Institutional knowledge objects</li>
            </ul>
          </div>
          <p className="border-l-4 border-truth pl-5 text-2xl font-medium text-truth mt-8 py-2">
            The result is a <strong className="font-bold text-light">structured, verifiable digital artifact</strong> that can be preserved indefinitely.
          </p>
        </div>
      </Section>

      {/* The Market Has Changed */}
      <Section className="mx-auto max-w-4xl py-12">
        <div className="border-t border-gray-900 pt-12">
          <h2 className="mb-8 text-3xl font-bold text-light">The Market Has Changed</h2>
          <div className="space-y-6 text-xl text-gray-300">
            <p>The first wave of NFTs focused on speculation.</p>
            <p>The next wave focuses on <strong className="text-light">infrastructure.</strong></p>
            <p>
              Modern organizations are not interested in collectible tokens. They need systems capable of issuing <strong className="text-light">forensic digital objects</strong> with long-term evidentiary value.
            </p>
            <div>
              <p className="mb-4 text-gray-400 font-medium">They care about:</p>
              <ul className="list-inside list-disc space-y-2 text-gray-300">
                <li>Immutable internal records</li>
                <li>Forensic timestamping</li>
                <li>Digital twin infrastructure</li>
                <li>Verifiable intellectual property</li>
                <li>Sovereign data control</li>
              </ul>
            </div>
            <p className="font-medium text-truth pt-4">Alpha CertSig was built for this new reality.</p>
          </div>
        </div>
      </Section>

      {/* The Key Distinction */}
      <Section className="mx-auto max-w-4xl py-12">
        <div className="border-t border-gray-900 pt-12">
          <h2 className="mb-8 text-3xl font-bold text-light">The Key Distinction</h2>
          <p className="mb-8 text-xl text-gray-300">Two systems exist in the Spruked ecosystem.</p>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-800 bg-[#050505] p-8">
              <h3 className="mb-4 text-2xl font-bold text-white">Alpha CertSig</h3>
              <p className="mb-4 text-gray-400">The licensed mint engine.</p>
              <ul className="list-inside list-disc space-y-2 text-gray-300">
                <li>Self-hosted</li>
                <li>Deployable infrastructure</li>
                <li>Licensable to organizations and individuals</li>
                <li>Designed for internal minting and digital object issuance</li>
              </ul>
            </div>
            <div className="rounded-xl border border-truth/30 bg-truth/5 p-8">
              <h3 className="mb-4 text-2xl font-bold text-truth">True Mark Mint</h3>
              <p className="mb-4 text-gray-400">The founder&apos;s curated vault.</p>
              <ul className="list-inside list-disc space-y-2 text-gray-300">
                <li>Not licensable</li>
                <li>Not installable</li>
                <li>Not commoditized</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 space-y-2 text-2xl text-gray-300 font-medium">
            <p>True Mark functions as <strong className="text-light">the museum.</strong></p>
            <p>Alpha CertSig is <strong className="text-light">the printing press.</strong></p>
            <p className="mt-4 text-truth font-bold uppercase tracking-widest text-sm">This distinction remains permanent.</p>
          </div>
        </div>
      </Section>

      {/* Core Capabilities */}
      <Section className="mx-auto max-w-4xl py-12">
        <div className="border-t border-gray-900 pt-12">
          <h2 className="mb-10 text-3xl font-bold text-light">Core Capabilities</h2>
          
          <div className="space-y-12">
            <div>
              <h3 className="mb-4 text-2xl font-semibold text-white">Infrastructure Ownership</h3>
              <div className="space-y-4 text-lg text-gray-300">
                <p>With Alpha CertSig, you purchase the engine once.</p>
                <p>There are <strong className="text-light">no per-mint fees</strong> and no platform dependency.</p>
                <p>After the system is deployed, the cost of issuing digital objects approaches zero.</p>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-2xl font-semibold text-white">Epistemic Sovereignty</h3>
              <div className="space-y-4 text-lg text-gray-300">
                <p>The system runs inside your own environment.</p>
                <div>
                  <p className="mb-2 text-gray-400">Supported deployment models include:</p>
                  <ul className="list-inside list-disc space-y-1 text-gray-300">
                    <li>Docker</li>
                    <li>Linux servers</li>
                    <li>WSL2 environments</li>
                    <li>Private blockchain networks</li>
                  </ul>
                </div>
                <p>No telemetry is required.</p>
                <p className="text-truth font-medium">Your records never leave your infrastructure.</p>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-2xl font-semibold text-white">Forensic Certificate Architecture</h3>
              <div className="space-y-4 text-lg text-gray-300">
                <p>Alpha CertSig supports a multi-layer certificate structure.</p>
                <p>The flagship configuration includes <strong className="text-light">10 layers of forensic metadata</strong> embedded into each certificate.</p>
                <div>
                  <p className="mb-2 text-gray-400">Optional encryption support includes:</p>
                  <ul className="list-inside list-disc space-y-1 text-gray-300">
                    <li>ChaCha20 secure object encryption</li>
                    <li>Structured digital object identifiers</li>
                    <li>Prefix-based registry architecture</li>
                  </ul>
                </div>
                <div className="bg-[#050505] border border-gray-800 p-4 rounded-lg mt-4 inline-block">
                  <span className="text-gray-500 text-sm block mb-1">Example identifier:</span>
                  <span className="text-white font-mono text-lg">E-NFT-MAYO-MED-2026-000002</span>
                </div>
                <p>This identifier format creates a <strong className="text-light">structured digital object record</strong> rather than a simple token reference.</p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Example Output Section */}
      <Section className="mx-auto max-w-4xl py-12">
        <div className="border-t border-gray-900 pt-12">
          <h2 className="mb-6 text-3xl font-bold text-truth">Example Certificate Output</h2>

          <div className="bg-[#050505] border border-gray-800 p-6 rounded-xl shadow-[0_0_30px_rgba(255,255,255,0.05)]">
            <Image
              src="/assets/CertificateKNFTsample.png"
              alt="Alpha CertSig Engine Output Sample"
              width={1400}
              height={1000}
              className="w-full h-auto rounded-lg border border-gray-900 shadow-xl"
            />
            <div className="mt-4 text-sm text-gray-400 bg-black/40 border border-gray-900 p-4 rounded-lg">
              <strong className="text-white block mb-1">Example Forensic Certificate Output</strong>
              Generated by the Alpha CertSig mint engine and issued within the TrueMark registry.
            </div>
            <div className="mt-6 flex justify-center pt-6 border-t border-gray-900">
              <Button variant="outline" className="border-truth/50 hover:bg-truth/10 text-truth" asChild>
                <Link href="/truemark/example-object">View Detailed Object Breakdown</Link>
              </Button>
            </div>
          </div>
        </div>
      </Section>

      {/* The Problems Alpha CertSig Solves */}
      <Section className="mx-auto max-w-4xl py-12">
        <div className="border-t border-gray-900 pt-12">
          <h2 className="mb-8 text-3xl font-bold text-light">The Problems Alpha CertSig Solves</h2>
          
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-800 bg-[#050505] p-8">
              <h3 className="mb-3 text-xl font-bold text-white">The SaaS Tax</h3>
              <p className="text-gray-400 mb-4 h-12">Many platforms charge subscription fees plus minting costs.</p>
              <p className="text-truth font-medium">Alpha CertSig eliminates the platform dependency by giving organizations <strong className="text-white">direct ownership of the mint engine.</strong></p>
            </div>
            
            <div className="rounded-xl border border-gray-800 bg-[#050505] p-8">
              <h3 className="mb-3 text-xl font-bold text-white">Data Sovereignty</h3>
              <p className="text-gray-400 mb-4 h-12">Sensitive documents and research often pass through third-party servers.</p>
              <p className="text-truth font-medium">Alpha CertSig performs all minting locally, allowing organizations to maintain <strong className="text-white">complete control of their data.</strong></p>
            </div>

            <div className="rounded-xl border border-gray-800 bg-[#050505] p-8">
              <h3 className="mb-3 text-xl font-bold text-white">Evidentiary Weight</h3>
              <p className="text-gray-400 mb-4 h-12">Typical NFTs rely on lightweight metadata.</p>
              <p className="text-truth font-medium">Alpha CertSig produces structured objects designed for <strong className="text-white">auditability, traceability, and institutional recordkeeping.</strong></p>
            </div>

            <div className="rounded-xl border border-gray-800 bg-[#050505] p-8">
              <h3 className="mb-3 text-xl font-bold text-white">Institutional Memory Loss</h3>
              <p className="text-gray-400 mb-4 h-12">Knowledge often disappears as staff turnover occurs.</p>
              <p className="text-truth font-medium">Alpha CertSig creates a structured digital library of internal knowledge artifacts that remain searchable and verifiable.</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Licensing Options */}
      <Section className="mx-auto max-w-4xl py-12">
        <div className="border-t border-gray-900 pt-12">
          <h2 className="mb-6 text-3xl font-bold text-light">Licensing Options</h2>
          <p className="mb-10 text-xl text-gray-300">Alpha CertSig is offered through a <strong className="text-light">one-time license model with optional annual maintenance updates.</strong></p>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="border border-gray-800 bg-[#050505] p-8 rounded-xl flex flex-col">
              <h3 className="text-xl font-bold text-white mb-6">Personal Node</h3>
              <div className="mb-6 pb-6 border-b border-gray-800">
                <p className="text-3xl font-black text-white">$3,900 <span className="text-sm font-normal text-gray-500">License</span></p>
                <p className="text-sm text-gray-500 mt-1">$500 Annual Maintenance (Optional)</p>
              </div>
              <p className="text-sm text-gray-400 mb-4 uppercase tracking-widest font-bold">Includes:</p>
              <ul className="text-gray-300 space-y-2 mb-6 text-sm flex-grow">
                <li className="flex gap-2">• <span>Single prefix registry</span></li>
                <li className="flex gap-2">• <span>5-layer certificate system</span></li>
                <li className="flex gap-2">• <span>DIY deployment</span></li>
                <li className="flex gap-2">• <span>Community support</span></li>
              </ul>
              <p className="text-xs text-gray-500 mt-auto">Designed for developers and creators entering the ecosystem.</p>
            </div>

            <div className="border-2 border-truth text-left bg-truth/5 p-8 rounded-xl relative flex flex-col shadow-[0_0_20px_rgba(255,255,255,0.05)]">
               <h3 className="text-xl font-bold text-white mb-6">Institutional Core</h3>
              <div className="mb-6 pb-6 border-b border-truth/20">
                <p className="text-3xl font-black text-white">$9,800 <span className="text-sm font-normal text-gray-500">License</span></p>
                <p className="text-sm text-gray-500 mt-1">20% Annual Renewal</p>
              </div>
              <p className="text-sm text-truth mb-4 uppercase tracking-widest font-bold">Includes:</p>
              <ul className="text-gray-300 space-y-2 mb-6 text-sm flex-grow">
                <li className="flex gap-2">• <span>Unlimited internal users</span></li>
                <li className="flex gap-2">• <span>Private minting infrastructure</span></li>
                <li className="flex gap-2">• <span>Prefix registry management</span></li>
                <li className="flex gap-2">• <span>Enterprise documentation</span></li>
              </ul>
            </div>

            <div className="border border-gray-700 bg-gradient-to-b from-[#111] to-[#050505] p-8 rounded-xl flex flex-col">
              <h3 className="text-xl font-bold text-white mb-6">Institutional Flagship</h3>
              <div className="mb-6 pb-6 border-b border-gray-800">
                <p className="text-3xl font-black text-white">$11,800 <span className="text-sm font-normal text-gray-500">License</span></p>
                <p className="text-sm text-gray-500 mt-1">20% Annual Renewal</p>
              </div>
              <p className="text-sm text-gray-400 mb-4 uppercase tracking-widest font-bold">Includes:</p>
              <ul className="text-gray-300 space-y-2 mb-6 text-sm flex-grow">
                <li className="flex gap-2 font-bold text-truth">• <span>Full 10-layer forensic certificate system</span></li>
                <li className="flex gap-2">• <span>ChaCha20 encryption module</span></li>
                <li className="flex gap-2">• <span>Priority onboarding</span></li>
                <li className="flex gap-2">• <span>Compliance-ready documentation</span></li>
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* Deployment & Affiliates */}
      <Section className="mx-auto max-w-4xl py-12">
        <div className="border-t border-gray-900 pt-12 space-y-16">
          
          <div>
            <h2 className="mb-6 text-3xl font-bold text-light">Deployment Services</h2>
            <p className="mb-8 text-lg text-gray-300">Professional deployment is available as a separate service.</p>
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="bg-[#050505] p-6 rounded-lg border border-gray-800">
                <h4 className="text-lg font-bold text-white mb-1">Guided Setup</h4>
                <p className="text-truth font-semibold mb-4">$2,400</p>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li>• Two remote setup sessions</li>
                  <li>• Prefix configuration</li>
                  <li>• Private node initialization</li>
                </ul>
              </div>
              <div className="bg-[#050505] p-6 rounded-lg border border-gray-800">
                <h4 className="text-lg font-bold text-white mb-1">Enterprise Installation</h4>
                <p className="text-truth font-semibold mb-4">$4,800</p>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li>• Hardened deployment</li>
                  <li>• Encryption configuration</li>
                  <li>• Certificate layer calibration</li>
                  <li>• 60-day priority support</li>
                </ul>
              </div>
              <div className="bg-[#050505] p-6 rounded-lg border border-gray-800">
                <h4 className="text-lg font-bold text-white mb-1">Air-Gapped Installation</h4>
                <p className="text-truth font-semibold mb-4">Starting at $7,500</p>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li>• Offline installation package</li>
                  <li>• Security key ceremony training</li>
                  <li>• Hardened system documentation</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
             <h2 className="mb-6 text-3xl font-bold text-light">Affiliate Expansion</h2>
             <div className="space-y-4 text-lg text-gray-300">
               <p>Organizations can unlock affiliate minting rights.</p>
               <p>Additional prefix slots allow institutions to extend the mint infrastructure across departments or partners.</p>
               <div className="pt-4">
                 <p className="text-gray-400 font-medium mb-3">Expansion tiers include:</p>
                 <ul className="list-inside list-disc space-y-2 text-white">
                   <li>+5 affiliate slots</li>
                   <li>+15 affiliate slots</li>
                   <li>Unlimited affiliate rights</li>
                 </ul>
               </div>
             </div>
          </div>
          
        </div>
      </Section>

      {/* ROI & Peace of Mind & Bottom Line */}
      <Section className="mx-auto max-w-4xl py-12">
        <div className="border-t border-gray-900 pt-12 space-y-16">
          
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="mb-6 text-3xl font-bold text-light">Return on Investment</h2>
              <div className="bg-[#050505] p-8 rounded-xl border border-gray-800 space-y-6 text-lg">
                <div>
                  <p className="text-gray-300 mb-2">Consider an organization minting 2,000 records through a SaaS platform charging $10 per mint.</p>
                  <p className="text-red-400 font-bold">That equals $20,000 paid to the platform.</p>
                </div>
                <div className="pt-6 border-t border-gray-800">
                  <p className="text-gray-400 mb-3">With Alpha CertSig:</p>
                  <ul className="space-y-2 text-white">
                    <li>• <strong className="text-truth">$9,800 one-time license</strong></li>
                    <li>• Break-even around 1,000–2,000 records</li>
                    <li>• Marginal mint cost approaches zero afterward</li>
                 </ul>
                </div>
              </div>
            </div>
            
            <div>
              <h2 className="mb-6 text-3xl font-bold text-light">The Peace of Mind Framework</h2>
              <p className="text-gray-400 mb-6 text-lg">Organizations deploying Alpha CertSig gain four long-term advantages.</p>
              <ul className="space-y-6">
                <li>
                  <span className="text-white font-bold block text-xl mb-1">Finality</span>
                  <span className="text-gray-400 text-base">Records cannot be retroactively altered.</span>
                </li>
                <li>
                  <span className="text-white font-bold block text-xl mb-1">Independence</span>
                  <span className="text-gray-400 text-base">The engine continues to function even if Alpha CertSig ceases operations.</span>
                </li>
                <li>
                  <span className="text-white font-bold block text-xl mb-1">Sovereignty</span>
                  <span className="text-gray-400 text-base">No external vendor holds custody of your records.</span>
                </li>
                <li>
                  <span className="text-white font-bold block text-xl mb-1">Continuity</span>
                  <span className="text-gray-400 text-base">Structured digital objects survive system upgrades and personnel changes.</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-truth/5 border border-truth/20 p-8 rounded-xl text-center">
            <h2 className="text-2xl font-bold text-light mb-4">The Bottom Line</h2>
            <p className="text-xl text-gray-300 mb-4">Alpha CertSig is not an NFT marketplace.</p>
            <p className="text-2xl text-truth font-medium">It is <strong className="text-white">licensed digital object infrastructure</strong> for institutions and sovereign creators who need permanent, verifiable records.</p>
          </div>

        </div>
      </Section>

      {/* Divider & CTA */}
      <Section className="mx-auto max-w-4xl pt-8 pb-12 text-center">
        <div className="mx-auto w-16 h-1 bg-gray-800 mb-12 rounded-full"></div>
        <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-widest text-light mb-6">
          Spruked
        </h2>
        <p className="text-3xl sm:text-4xl font-bold text-gray-400 leading-tight">
          Own the press.<br className="hidden sm:block"/>{' '}
          <span className="text-truth">Mint your mind.</span>
        </p>

        {/* Action Buttons */}
        <div className="mt-16 flex flex-col sm:flex-row justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="#quote">Request Enterprise Quote</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="#overview">Download Technical Overview</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="#examples">View Certificate Examples</Link>
          </Button>
        </div>
      </Section>
    </div>
  );
}
