import Link from 'next/link';
import { WordmarkLogo } from '@/components/brand/WordmarkLogo';
import { Navigation } from './Navigation';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-900/60 bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link href="/" aria-label="Spruked home">
          <WordmarkLogo size="sm" />
        </Link>
        <div className="flex flex-1 justify-end">
          <Navigation />
        </div>
      </div>
    </header>
  );
}
