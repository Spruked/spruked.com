import Link from 'next/link';
import { publicRoutes } from '../sitemap';

function titleFromRoute(route: string) {
  if (route === '/') return 'Home';
  return route
    .split('/')
    .filter(Boolean)
    .map((segment) => segment.replace(/-/g, ' '))
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' / ');
}

export default function SiteMapPage() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-light">Site Map</h1>
      <p className="mt-3 text-sm text-gray-400">Browse all public pages on spruked.com.</p>
      <ul className="mt-8 grid gap-3">
        {publicRoutes.map((route) => (
          <li key={route}>
            <Link className="text-gray-300 hover:text-light" href={route}>
              {titleFromRoute(route)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
