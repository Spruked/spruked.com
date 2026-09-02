import { Section } from '@/components/ui/Section';

export default function OrbPresencePage() {
  return (
    <>
      <Section className="mx-auto max-w-5xl py-24 text-center">
        <h1 className="mb-4 text-5xl font-black leading-tight sm:text-7xl">
          <span className="text-truth">CALI</span> ORB
        </h1>
        <p className="mb-6 text-2xl font-bold uppercase tracking-widest text-white">
          "If better is possible, good is simply not enough."
        </p>
        <p className="mx-auto mb-12 max-w-2xl text-xl text-gray-400">
          Voice-first Website ORB presence for Spruked.
        </p>

        <div className="mx-auto flex min-h-[520px] max-w-4xl flex-col items-center justify-center overflow-hidden rounded-2xl border border-gray-800 bg-[#050505] p-10 shadow-[0_0_50px_rgba(255,255,255,0.02)]">
          <div className="relative h-56 w-56 drop-shadow-[0_0_80px_rgba(88,205,255,0.46)]">
            <div
              className="pointer-events-none absolute inset-[-18%] z-0 rounded-full border border-sky-300/55 opacity-90"
              style={{
                boxShadow: '0 0 24px rgba(88,205,255,0.42), inset 0 0 18px rgba(88,205,255,0.2)',
                animation: 'orb-orbit-spin 12s linear infinite',
              }}
            >
              {[0, 120, 240].map((angle) => (
                <span
                  key={angle}
                  className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-sky-200 shadow-[0_0_10px_rgba(125,220,255,0.92)]"
                  style={{
                    animation: 'orb-node-pulse 1.8s ease-in-out infinite',
                    animationDelay: `${angle / 360}s`,
                    transform: `rotate(${angle}deg) translateX(154px) translate(-50%, -50%)`,
                  }}
                ></span>
              ))}
            </div>
            <div
              className="pointer-events-none absolute inset-[-27%] z-0 rounded-full border border-sky-400/30"
              style={{
                boxShadow: '0 0 38px rgba(68,190,255,0.22)',
                animation: 'orb-orbit-spin-reverse 18s linear infinite',
              }}
            ></div>
            <img
              src="/assets/redorbbluecenter1600.png"
              alt="Spruked CALI ORB"
              draggable={false}
              className="relative z-20 h-full w-full select-none object-contain drop-shadow-[0_0_38px_rgba(88,205,255,0.52)]"
            />
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-30 h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full mix-blend-screen">
              <div
                className="absolute left-1/2 top-1/2 h-[68%] w-[68%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-[4px]"
                style={{
                  background:
                    'conic-gradient(from 0deg, rgba(255,255,255,0.86), rgba(66,190,255,0.18), rgba(255,255,255,0.74), rgba(35,128,255,0.1), rgba(255,255,255,0.86))',
                  animation: 'orb-core-swirl 4.2s linear infinite',
                }}
              ></div>
            </div>
          </div>

          <div className="mt-14 max-w-xl rounded-2xl border border-sky-300/30 bg-black/70 px-5 py-4 text-left text-sm leading-relaxed text-gray-100 shadow-[0_0_28px_rgba(88,205,255,0.14)]">
            CALI speaks through the floating ORB. The bubble is only her spoken caption.
          </div>
        </div>
      </Section>

      <Section className="mx-auto max-w-4xl py-12 pb-24">
        <div className="border-t border-gray-900 pt-12 text-gray-300 md:flex md:flex-row md:justify-between md:gap-12">
          <div className="flex-1 space-y-4">
            <h3 className="mb-4 text-xl font-bold text-white">Runtime</h3>
            <div className="flex flex-col gap-4 border-b border-gray-900 pb-3 sm:flex-row">
              <span className="w-32 font-sans text-xs uppercase tracking-widest text-gray-500">Cognition:</span>
              <span className="font-mono text-white">CALI via local llama.cpp</span>
            </div>
            <div className="flex flex-col gap-4 border-b border-gray-900 pb-3 sm:flex-row">
              <span className="w-32 font-sans text-xs uppercase tracking-widest text-gray-500">Speech:</span>
              <span className="font-mono text-truth">Kokoro server TTS</span>
            </div>
            <div className="flex flex-col gap-4 border-b border-gray-900 pb-3 sm:flex-row">
              <span className="w-32 font-sans text-xs uppercase tracking-widest text-gray-500">Hearing:</span>
              <span className="font-mono text-white">Faster-Whisper STT</span>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
