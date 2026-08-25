'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const groupedItems = [
  {
    label: 'Company',
    links: [
      { href: '/about', label: 'About' },
    ],
  },
  {
    label: 'Products',
    links: [
      { href: '/products', label: 'All Products' },
      { href: '/products/orb-weaver', label: 'Orb Weaver' },
      { href: '/products/alpha-certsig', label: 'Alpha CertSig' },
      { href: '/products/truemark-mint', label: 'TrueMark Mint' },
      { href: '/products/prompt-like-a-pro', label: 'Prompt Like a Pro' },
      { href: '/goat', label: 'The GOAT' },
      { href: '/orb-marketplace', label: 'ORB Marketplace' },
    ],
  },
  {
    label: 'Platform',
    links: [
      { href: '/artifacts', label: 'Evidence' },
      { href: '/admin', label: 'Admin' },
      { href: 'http://localhost:21010/', label: 'Local CALI CRM' },
      { href: 'http://localhost:19000', label: 'Prime Mail' },
    ],
  },
];

function isExternalHref(href: string) {
  return /^https?:\/\//.test(href);
}

function isActivePath(pathname: string, href: string) {
  if (isExternalHref(href)) {
    return false;
  }

  if (href === '/') {
    return pathname === '/';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function isGroupActive(pathname: string, hrefs: string[]) {
  return hrefs.some((href) => isActivePath(pathname, href));
}

export function Navigation() {
  const pathname = usePathname();

  return (
    <>
      <nav className="flex items-center gap-2 overflow-x-auto text-[11px] uppercase tracking-[0.12em] lg:hidden">
        {[
          { href: '/', label: 'Home' },
          { href: '/about', label: 'About' },
          { href: '/products/prompt-like-a-pro', label: 'Prompt Pro' },
          { href: '/products', label: 'Products' },
          { href: '/cart', label: 'Cart' },
          { href: '/checkout', label: 'Checkout' },
          { href: '/artifacts', label: 'Evidence' },
          { href: 'http://localhost:21010/', label: 'CRM' },
          { href: 'http://localhost:19000', label: 'Mail' },
        ].map((item) => {
          const className = clsx(
            'whitespace-nowrap rounded-md px-2.5 py-1.5 transition-colors duration-200',
            isActivePath(pathname, item.href) ? 'text-light' : 'text-gray-500 hover:text-light',
          );

          return isExternalHref(item.href) ? (
            <a key={item.href} href={item.href} target="_blank" rel="noreferrer" className={className}>
              {item.label}
            </a>
          ) : (
            <Link key={item.href} href={item.href} className={className}>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <nav className="hidden w-full max-w-5xl items-center text-sm uppercase tracking-[0.14em] lg:flex">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className={clsx(
              'rounded-md px-3 py-2 transition-colors duration-200 whitespace-nowrap',
              isActivePath(pathname, '/') ? 'text-light' : 'text-gray-500 hover:text-light',
            )}
          >
            Home
          </Link>

          <Link
            href="/products/prompt-like-a-pro"
            className={clsx(
              'rounded-md px-3 py-2 transition-colors duration-200 whitespace-nowrap',
              isActivePath(pathname, '/products/prompt-like-a-pro')
                ? 'text-light'
                : 'text-gray-500 hover:text-light',
            )}
          >
            Prompt Pro
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
                className={clsx(
                  'inline-flex items-center gap-1 rounded-md px-3 py-2 transition-colors duration-200 whitespace-nowrap',
                  active ? 'text-light' : 'text-gray-500 hover:text-light',
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

              <div className="invisible absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-gray-800 bg-black/95 p-2 opacity-0 shadow-[0_16px_36px_rgba(0,0,0,0.45)] backdrop-blur-lg transition-all duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                {group.links.map((link) => {
                  const className = clsx(
                    'block rounded-lg px-3 py-2 text-xs tracking-[0.12em] transition-colors duration-200',
                    isActivePath(pathname, link.href)
                      ? 'bg-white/5 text-light'
                      : 'text-gray-400 hover:bg-white/5 hover:text-light',
                  );

                  return isExternalHref(link.href) ? (
                    <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className={className}>
                      {link.label}
                    </a>
                  ) : (
                    <Link key={link.href} href={link.href} className={className}>
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2 pl-4">
          <Link
            href="/cart"
            className={clsx(
              'rounded-md px-3 py-2 transition-colors duration-200 whitespace-nowrap',
              isActivePath(pathname, '/cart') ? 'text-light' : 'text-gray-500 hover:text-light',
            )}
          >
            Cart
          </Link>

          <Link
            href="/checkout"
            className={clsx(
              'rounded-md border border-gray-800 px-3 py-2 transition-colors duration-200 whitespace-nowrap',
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
