'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

function isActivePath(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function orbTargetForHref(href: string): string | undefined {
  const targets: Record<string, string> = {
    '/': 'spruked.nav.home',
    '/products': 'spruked.nav.products',
    '/technology': 'spruked.nav.technology',
    '/research': 'spruked.nav.research',
  };
  return targets[href];
}

export function Navigation() {
  const pathname = usePathname();

  const items = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/products', label: 'Products' },
    { href: '/technology', label: 'Technology' },
    { href: '/research', label: 'Research' },
    { href: '/contact', label: 'Contact' },
  ];

  return (
    <>
      <nav aria-label="Primary navigation" className="flex min-w-0 items-center gap-1 overflow-x-auto text-[11px] uppercase tracking-[0.12em] lg:hidden">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            data-orb-target={orbTargetForHref(item.href)}
            className={clsx(
              'whitespace-nowrap rounded-md px-2.5 py-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
              isActivePath(pathname, item.href) ? 'bg-white/10 text-light' : 'text-gray-500 hover:bg-white/5 hover:text-light',
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <nav aria-label="Primary navigation" className="hidden w-full max-w-5xl items-center text-sm uppercase tracking-[0.14em] lg:flex">
        <div className="flex items-center gap-3">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-orb-target={orbTargetForHref(item.href)}
              className={clsx(
                'rounded-md px-3 py-2 transition-colors duration-200 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
                isActivePath(pathname, item.href) ? 'text-light' : 'text-gray-500 hover:text-light',
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
