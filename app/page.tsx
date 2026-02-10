import Link from 'next/link';
import { PrimaryLogo } from '@/components/brand/PrimaryLogo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Section } from '@/components/ui/Section';

export default function Home() {
  return (
    <>
      <Section bleed className="relative flex min-h-[90vh] flex-col items-center justify-center text-center">
        <div className="absolute inset-0 opacity-5">
          <PrimaryLogo size={800} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <PrimaryLogo size={180} className="mb-8" />
        <h1 className="mb-6 text-6xl font-black uppercase leading-none tracking-tight sm:text-8xl">
          You&rsquo;ve been
          <br />
          <span className="text-truth">Spruked</span>
        </h1>
        <p className="mb-12 max-w-2xl text-xl text-gray-400 sm:text-2xl">
          Truth with teeth. Precision correction. No fluff. No mercy.
        </p>
        <div className="mb-16 flex flex-col gap-6 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="#waitlist">Get Spruked</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="mailto:bryan@spruked.com">Contact</a>
          </Button>
        </div>
      </Section>

      <Section className="mx-auto max-w-5xl">
        <h2 className="mb-12 text-5xl font-black leading-tight sm:text-7xl">
          What does it mean to <span className="text-truth">Spruke</span>?
        </h2>
        <div className="space-y-8 text-2xl text-gray-300">
          <p>Spruking is the act of delivering correction with precision and authority.</p>
          <p>It&rsquo;s not vague feedback. It&rsquo;s not polite criticism.</p>
          <p className="text-3xl font-semibold text-light">
            It&rsquo;s the moment someone who knows better steps in and says:
            <br />
            <span className="text-truth">“Here&rsquo;s what you missed. Here&rsquo;s what&rsquo;s actually true. Here&rsquo;s how to fix it.”</span>
          </p>
        </div>
      </Section>

      <Section id="waitlist" className="bg-gradient-to-b from-dark to-black">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-8 text-5xl font-black uppercase leading-tight sm:text-7xl">
            Ready to be <span className="text-truth">Spruked</span>?
          </h2>
          <p className="mb-10 text-lg text-gray-400">Join the private waitlist. First 100 receive lifetime status.</p>
          <form className="mx-auto flex max-w-xl flex-col gap-4">
            <Input type="email" placeholder="you@truth.com" required className="py-5 text-lg" />
            <Button size="lg" className="py-5 text-lg">
              Secure My Spot
            </Button>
          </form>
        </div>
      </Section>
    </>
  );
}
