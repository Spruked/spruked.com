'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const items = [
  { href: '/', label: 'Home' },
  { href: '/brand', label: 'Brand' },
  { href: '/true-mark-mint', label: 'True Mark Mint' },
  { href: '/goat', label: 'The GOAT' },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-6 text-sm uppercase tracking-widest">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={clsx(
            'transition-colors duration-200',
            pathname === item.href ? 'text-light' : 'text-gray-500 hover:text-light',
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
