import Link from 'next/link';
import Image from 'next/image';
import { Navigation } from './Navigation';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#07080b]/80 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3.5">
        <Link href="/" aria-label="Spruked home" className="shrink-0 transition-opacity hover:opacity-80">
          <Image src="/logos/spruked-wordmark-white.svg" alt="spruked" width={168} height={56} className="h-10 w-auto sm:h-11" priority />
        </Link>
        <p className="hidden text-[10px] font-semibold uppercase tracking-[0.3em] text-gray-600 xl:block">Local-first knowledge systems</p>
        <div className="flex flex-1 justify-end">
          <Navigation />
        </div>
      </div>
    </header>
  );
}
