import type { MetadataRoute } from 'next';
import { portfolioAliases, portfolioEntries } from '@/data/portfolio';

const ecosystemSections = [
  'orb-weaver',
  'web-weaver',
  'code-weaver',
  'truemark',
  'truemark-mint',
  'certsig',
  'alpha-certsig',
  'global-registry',
  'pops',
];

const technologySections = ['orb', 'aims', 'governance'];

const fixedPages = [
  '/',
  '/about',
  '/contact',
  '/pro-prime-series-ai',
  '/ecosystem',
  '/technology',
  '/research',
  '/products',
  '/products/alpha-certsig',
  '/products/truemark-mint',
  '/products/truemark-mint/object-types',
  '/products/truemark-mint/objects',
  '/truemark/example-object',
  '/artifacts',
  '/brand',
  '/goat',
  '/orb',
  '/orb-skin-studio',
  '/orb-skin-studio/gallery.html',
  '/orb-skin-studio/pricing.html',
  '/orb-skin-studio/contact.html',
  '/cart',
  '/checkout',
  '/portfolio',
  '/ai-intelligent-systems',
  '/software-platforms',
  '/books-writing',
  '/research-architecture',
  '/archive',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://spruked.com';
  const paths = [
    ...fixedPages,
    ...ecosystemSections.map((section) => `/ecosystem/${section}`),
    ...technologySections.map((section) => `/technology/${section}`),
    ...portfolioEntries.map((entry) => `/portfolio/${entry.slug}`),
    ...Object.keys(portfolioAliases).map((slug) => `/portfolio/${slug}`),
    ...portfolioEntries.filter((entry) => entry.category === 'Books & Writing').map((entry) => `/books/${entry.slug}`),
    ...portfolioEntries.filter((entry) => entry.category === 'Research & Architecture').map((entry) => `/research/${entry.slug}`),
    '/research/unusual-development-methodology',
  ];

  return paths.map((path) => ({
    url: `${baseUrl}${path}`,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : 0.7,
  }));
}
