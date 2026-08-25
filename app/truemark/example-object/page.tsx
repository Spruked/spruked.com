import Link from 'next/link';
import Image from 'next/image';
import { Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';

export default function ExampleObjectPage() {
  return (
    <>
      <Section className="mx-auto max-w-5xl pt-24 pb-12">
        <h1 className="mb-4 text-5xl font-black leading-tight sm:text-7xl">
          Example <span className="text-truth">TrueMark Object</span>
        </h1>
        <h2 className="mb-8 text-2xl font-bold text-gray-300 uppercase tracking-widest">Certified Digital Knowledge Artifact</h2>
        
        <p className="text-xl text-gray-400 max-w-3xl mb-8">
          This certificate demonstrates what a finalized <strong className="text-white">TrueMark digital object</strong> looks like after verification and preservation. Each artifact issued through the Spruked ecosystem receives a structured forensic certificate containing verification metadata, identifiers, and authentication layers.
        </p>
        <p className="text-xl text-gray-400 max-w-3xl">
          The certificate serves as the <strong className="text-white">human-readable verification layer</strong> that accompanies the digital artifact.
        </p>
      </Section>

      <Section className="mx-auto max-w-6xl py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Image Column */}
          <div className="bg-[#050505] p-6 rounded-xl border border-gray-800 shadow-[0_0_30px_rgba(255,255,255,0.05)] lg:sticky lg:top-24">
            <Image
              src="/assets/CertificateKNFTsample.png"
              alt="K-NFT Spruked Certificate Sample"
              width={1400}
              height={1000}
              className="w-full h-auto rounded-lg border border-gray-900 shadow-xl"
            />
            
            <div className="mt-8 flex justify-center">
              <Button variant="outline" className="w-full border-truth/50 hover:bg-truth/10 text-truth py-6 text-lg" asChild>
                <a href="/assets/CertificateKNFTsample.png" download>
                  Download Artifact Sample
                </a>
              </Button>
            </div>
          </div>

          {/* Metadata Column */}
          <div className="space-y-12">
            <div>
              <h3 className="text-2xl font-bold mb-6 text-white border-b border-gray-800 pb-4">Example Object Record</h3>
              <div className="space-y-4 font-mono text-sm sm:text-base">
                <div className="flex flex-col sm:flex-row sm:justify-between py-3 border-b border-gray-900">
                  <span className="text-gray-500 mb-1 sm:mb-0 uppercase tracking-widest font-sans text-xs font-bold">Object Identifier</span>
                  <span className="text-truth font-bold bg-truth/10 px-2 py-1 rounded">K-NFT-SPRUK-ENG-2026-000014</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between py-3 border-b border-gray-900">
                  <span className="text-gray-500 mb-1 sm:mb-0 uppercase tracking-widest font-sans text-xs font-bold">Artifact</span>
                  <span className="text-white">Precision Lathe Retrofit Method</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between py-3 border-b border-gray-900">
                  <span className="text-gray-500 mb-1 sm:mb-0 uppercase tracking-widest font-sans text-xs font-bold">Creator</span>
                  <span className="text-white">Bryan Anthony Spruk</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between py-3 border-b border-gray-900">
                  <span className="text-gray-500 mb-1 sm:mb-0 uppercase tracking-widest font-sans text-xs font-bold">Category</span>
                  <span className="text-white">K-NFT Knowledge Object</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between py-3 border-b border-gray-900">
                  <span className="text-gray-500 mb-1 sm:mb-0 uppercase tracking-widest font-sans text-xs font-bold">Verification</span>
                  <span className="text-white">10-Layer Forensic Certificate</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between py-3 border-b border-gray-900">
                  <span className="text-gray-500 mb-1 sm:mb-0 uppercase tracking-widest font-sans text-xs font-bold">Encryption</span>
                  <span className="text-white">ChaCha20-Poly1305</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold mb-6 text-white border-b border-gray-800 pb-4">Certificate Elements</h3>
              
              <div className="space-y-8 text-gray-300">
                <div>
                  <h4 className="text-truth font-bold mb-3 uppercase tracking-wide text-sm flex items-center gap-2">
                    <div className="w-2 h-2 bg-truth rounded-full"></div>
                    Structured Identifier
                  </h4>
                  <p className="mb-3">Every object is assigned a permanent identifier. Example:</p>
                  <code className="block bg-[#050505] p-4 rounded border border-gray-800 text-truth font-bold mb-4 w-fit">E-NFT-MAYO-MED-2026-000002</code>
                  <p className="text-sm text-gray-400">This identifier encodes:</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {['object type', 'issuing prefix', 'industry category', 'year of issuance', 'sequential object record'].map((tag) => (
                      <span key={tag} className="bg-gray-900 text-gray-300 px-2 py-1 rounded text-xs">{tag}</span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-truth font-bold mb-3 uppercase tracking-wide text-sm flex items-center gap-2">
                    <div className="w-2 h-2 bg-truth rounded-full"></div>
                    Forensic Verification Layers
                  </h4>
                  <p className="mb-3">Alpha CertSig certificates may include up to <strong>10 forensic verification layers</strong>.</p>
                  <p className="mb-3 text-sm text-gray-400">These layers document technical information about the artifact including:</p>
                  <ul className="list-disc list-inside text-sm space-y-2 ml-2 text-white">
                    <li>file format verification</li>
                    <li>resolution analysis</li>
                    <li>cryptographic signatures</li>
                    <li>metadata preservation</li>
                    <li>structural integrity checks</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-truth font-bold mb-3 uppercase tracking-wide text-sm flex items-center gap-2">
                    <div className="w-2 h-2 bg-truth rounded-full"></div>
                    Encryption Layer
                  </h4>
                  <p className="mb-3">Optional encryption modules protect the artifact and certificate from unauthorized alteration. The flagship configuration supports:</p>
                  <p className="font-mono bg-truth/10 border border-truth/30 py-2 px-3 rounded inline-block text-truth font-bold mb-3 text-sm">ChaCha20-Poly1305 encryption</p>
                  <p className="text-sm text-gray-400">This provides authenticated encryption for high-security digital artifacts.</p>
                </div>

                <div>
                  <h4 className="text-truth font-bold mb-3 uppercase tracking-wide text-sm flex items-center gap-2">
                    <div className="w-2 h-2 bg-truth rounded-full"></div>
                    QR Verification
                  </h4>
                  <p className="text-sm">Each certificate may include a QR code linking to a verification endpoint or registry entry. This allows the certificate to be quickly verified using a mobile device.</p>
                </div>

                <div>
                  <h4 className="text-truth font-bold mb-3 uppercase tracking-wide text-sm flex items-center gap-2">
                    <div className="w-2 h-2 bg-truth rounded-full"></div>
                    TrueMark Seal
                  </h4>
                  <p className="text-sm">The TrueMark seal indicates that the object has been issued within the curated registry and has passed the required verification processes. The seal acts as a visual authenticity marker for the artifact.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section className="mx-auto max-w-5xl md:py-16 py-8">
        <div className="grid md:grid-cols-2 gap-12 items-stretch">
          <div className="h-full flex flex-col justify-center">
            <h3 className="text-3xl font-bold mb-6 text-white">Why the Certificate Matters</h3>
            <p className="text-gray-400 mb-6 text-lg">The certificate transforms a simple file into a <strong className="text-white">verifiable digital artifact</strong>.</p>
            <p className="text-gray-400 mb-4">Instead of existing as an isolated document, the artifact becomes a structured record containing:</p>
            <ul className="space-y-4 mb-8">
              {['authorship', 'timestamped origin', 'forensic verification', 'permanent identification', 'preservation metadata'].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-truth"></div>
                  <span className="text-white font-medium capitalize text-lg">{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-truth italic border-l-2 border-truth pl-4">This ensures that the knowledge or artifact can be verified long after its original creation.</p>
          </div>

          <div className="bg-gradient-to-br from-[#0a0a0a] to-[#050505] p-10 rounded-xl border border-gray-800 shadow-2xl h-full flex flex-col">
            <h3 className="text-3xl font-bold mb-6 text-truth">Where Certificates Come From</h3>
            <div className="space-y-6 text-gray-300 flex-grow">
              <p>
                Certificates like this are generated through the <strong className="text-white">Alpha CertSig mint engine</strong>.
              </p>
              <p>
                The engine performs the verification steps, generates the structured identifier, and produces the forensic certificate that accompanies the artifact.
              </p>
              <p>
                Selected artifacts may also appear in the <strong className="text-white">TrueMark registry</strong>, preserving them within the curated archive of digital knowledge objects.
              </p>
            </div>
            
            <div className="pt-8 border-t border-gray-900 mt-8 flex flex-col sm:flex-row gap-4">
              <Button asChild className="flex-1">
                <Link href="/products/alpha-certsig">Explore Alpha CertSig</Link>
              </Button>
              <Button variant="outline" asChild className="flex-1">
                <Link href="/products/truemark-mint">View TrueMark Registry</Link>
              </Button>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}