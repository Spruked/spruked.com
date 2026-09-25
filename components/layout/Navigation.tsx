'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import clsx from 'clsx';

const groupedItems = [
  {
    label: 'Company',
    links: [
      { href: '/about', label: 'About Pro Prime Series AI' },
      { href: '/pro-prime-series-ai', label: 'Pro Prime Series AI' },
      { href: '/about#mission', label: 'Mission & Principles' },
    ],
  },
  {
    label: 'Ecosystem',
    links: [
      { href: '/ecosystem', label: 'Ecosystem Overview' },
      { href: '/ecosystem/orb-weaver', label: 'Orb Weaver' },
      { href: '/ecosystem/web-weaver', label: 'Web Weaver' },
      { href: '/ecosystem/code-weaver', label: 'Code Weaver' },
      { href: '/ecosystem/truemark', label: 'TrueMark' },
      { href: '/ecosystem/truemark-mint', label: 'TrueMark Mint' },
      { href: '/ecosystem/certsig', label: 'CertSig' },
      { href: '/ecosystem/alpha-certsig', label: 'Alpha CertSig' },
      { href: '/ecosystem/global-registry', label: 'Pro Prime Global Registry' },
      { href: '/ecosystem/pops', label: 'POPS' },
    ],
  },
  {
    label: 'Technology',
    links: [
      { href: '/technology', label: 'Technology Overview' },
      { href: '/technology/orb', label: 'ORB' },
      { href: '/technology/aims', label: 'A.I.M.S.' },
      { href: '/technology/governance', label: 'Governance Architecture' },
    ],
  },
  {
    label: 'Research',
    links: [
      { href: '/research', label: 'Research Overview' },
      { href: '/research#experimental-systems', label: 'Experimental Systems' },
    ],
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function isGroupActive(pathname: string, hrefs: string[]) {
  return hrefs.some((href) => isActivePath(pathname, href));
}

function orbTargetForHref(href: string): string | undefined {
  const targets: Record<string, string> = {
    '/': 'spruked.nav.home',
    '/products': 'spruked.nav.products',
    '/cart': 'spruked.nav.cart',
    '/checkout': 'spruked.nav.checkout',
  };
  return targets[href];
}

export function Navigation() {
  const pathname = usePathname();
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  useEffect(() => {
    setOpenGroup(null);
  }, [pathname]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenGroup(null);
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  return (
    <>
      <nav aria-label="Primary navigation" className="flex min-w-0 items-center gap-1 overflow-x-auto text-[11px] uppercase tracking-[0.12em] lg:hidden">
        {[
          { href: '/', label: 'Home' },
          { href: '/about', label: 'Company' },
          { href: '/ecosystem', label: 'Ecosystem' },
          { href: '/technology', label: 'Technology' },
          { href: '/research', label: 'Research' },
          { href: '/about#contact', label: 'Contact' },
          { href: '/cart', label: 'Cart' },
          { href: '/checkout', label: 'Checkout' },
        ].map((item) => (
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
          <Link
            href="/"
            data-orb-target="spruked.nav.home"
            className={clsx(
              'rounded-md px-3 py-2 transition-colors duration-200 whitespace-nowrap',
              isActivePath(pathname, '/') ? 'text-light' : 'text-gray-500 hover:text-light',
            )}
          >
            Home
          </Link>

          {groupedItems.map((group) => {
          const active = isGroupActive(
            pathname,
            group.links.map((link) => link.href),
          );

          return (
            <div key={group.label} className="group relative">
              <button
                type="button"
                aria-expanded={openGroup === group.label}
                aria-haspopup="true"
                onClick={() => setOpenGroup((current) => (current === group.label ? null : group.label))}
                className={clsx(
                  'inline-flex items-center gap-1 rounded-md px-3 py-2 transition-colors duration-200 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
                  active || openGroup === group.label ? 'text-light' : 'text-gray-500 hover:text-light',
                )}
              >
                {group.label}
                <svg
                  className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M5.25 7.5L10 12.25L14.75 7.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <div
                role="menu"
                className={clsx(
                  'absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-gray-800 bg-black/95 p-2 shadow-[0_16px_36px_rgba(0,0,0,0.45)] backdrop-blur-lg transition-all duration-200',
                  openGroup === group.label
                    ? 'visible opacity-100'
                    : 'invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100',
                )}
              >
                {group.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    role="menuitem"
                    data-orb-target={orbTargetForHref(link.href)}
                    onClick={() => setOpenGroup(null)}
                    className={clsx(
                      'block rounded-lg px-3 py-2 text-xs tracking-[0.12em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
                      isActivePath(pathname, link.href)
                        ? 'bg-white/5 text-light'
                        : 'text-gray-400 hover:bg-white/5 hover:text-light',
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2 pl-4">
          <Link
            href="/about#contact"
            className="rounded-md px-3 py-2 whitespace-nowrap text-gray-500 transition-colors duration-200 hover:text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            Contact
          </Link>
          <Link
            href="/cart"
            data-orb-target="spruked.nav.cart"
            className={clsx(
              'rounded-md px-3 py-2 transition-colors duration-200 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
              isActivePath(pathname, '/cart') ? 'text-light' : 'text-gray-500 hover:text-light',
            )}
          >
            Cart
          </Link>

          <Link
            href="/checkout"
            data-orb-target="spruked.nav.checkout"
            className={clsx(
              'rounded-md border border-gray-800 px-3 py-2 transition-colors duration-200 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
              isActivePath(pathname, '/checkout')
                ? 'border-gray-600 bg-white/5 text-light'
                : 'text-gray-400 hover:border-gray-600 hover:text-light',
            )}
          >
            Checkout
          </Link>
        </div>
      </nav>
    </>
  );
}
