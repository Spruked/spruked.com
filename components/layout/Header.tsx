import Link from 'next/link';
import { WordmarkLogo } from '@/components/brand/WordmarkLogo';
import { Navigation } from './Navigation';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-900/60 bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" aria-label="Spruked home">
          <WordmarkLogo size="sm" />
        </Link>
        <Navigation />
      </div>
    </header>
  );
}
