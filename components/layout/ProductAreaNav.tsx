'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const items = [
  { href: '/', label: 'SPRUKED HOME' },
  { href: '/products', label: 'PRODUCTS HOME' },
  { href: '/orb', label: 'ORB WEAVER' },
  { href: '/pro-prime-series-ai', label: 'PRO PRIME SERIES' },
  { href: '/technology/aims', label: 'A.I.M.S.' },
  { href: '/products/truemark-mint', label: 'TRUEMARK' },
  { href: '/products/alpha-certsig', label: 'ALPHA CERTSIG' },
];

function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function ProductAreaNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Products area navigation" className="border-y border-white/[0.08] bg-[#050608]/80">
      <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-6 py-2.5 md:px-12">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'whitespace-nowrap rounded-md px-3 py-2 text-[10px] font-bold tracking-[0.14em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:text-[11px]',
              isActivePath(pathname, item.href) ? 'bg-white/10 text-white' : 'text-gray-500 hover:bg-white/5 hover:text-white',
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
