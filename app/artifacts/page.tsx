import { Section } from '@/components/ui/Section';

export default function ArtifactsPage() {
  return (
    <>
      <Section className="mx-auto max-w-5xl py-24">
        <h1 className="mb-4 text-5xl font-black leading-tight sm:text-7xl">
          Visual <span className="text-truth">Evidence</span>
        </h1>
        <p className="text-xl text-gray-400 mb-16 max-w-3xl">
          Demonstrations, verifications, and actual objects generated and preserved by the Spruked System. These artifacts represent the tangible outputs of the Alpha CertSig engine and TrueMark registry.
        </p>

        <div className="space-y-24">
          
          {/* Certificate Output Section */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 space-y-6">
              <h2 className="text-3xl font-bold text-white">Alpha CertSig Output</h2>
              <p className="text-lg text-gray-400">
                A look at the final generated forensic certificate output from the Alpha CertSig engine, designed to cryptographically preserve knowledge objects.
              </p>
              <div className="bg-[#050505] p-4 rounded-lg border border-gray-800 font-mono text-sm text-gray-300">
                Type: K-NFT Knowledge Object <br/>
                Action: Mint Generation <br/>
                Result: Verified / Issued
              </div>
            </div>
            <div className="order-1 lg:order-2 bg-black/40 border border-gray-800 p-4 rounded-xl shadow-[0_0_30px_rgba(255,255,255,0.05)]">
              <img 
                src="/assets/CertificateKNFTsample.png" 
                alt="Alpha CertSig Output Certificate" 
                className="w-full h-auto rounded-lg shadow-xl" 
              />
            </div>
          </div>

          {/* System Demo Videos Section */}
          <div className="grid lg:grid-cols-2 gap-12 items-start pt-16 border-t border-gray-900">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-white">Interface & Registry Demonstrations</h2>
              <p className="text-lg text-gray-400">
                Examples of the Spruked UI in action, demonstrating interaction layers and the live behavior of the system.
              </p>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-truth"></div>
                  <span>UI Interaction Flows</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-truth"></div>
                  <span>Object Metadata Browsing</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-truth"></div>
                  <span>System Navigations</span>
                </li>
              </ul>
            </div>
            <div className="bg-[#050505] border border-gray-800 p-4 rounded-xl shadow-[0_0_30px_rgba(255,255,255,0.05)] aspect-video flex items-center justify-center relative overflow-hidden">
               <video 
                 src="/assets/Untitled.mp4" 
                 controls 
                 className="w-full h-full object-cover rounded-lg"
               >
                 Your browser does not support the video tag.
               </video>
            </div>
          </div>
          
        </div>
      </Section>
    </>
  );
}