import type { MetadataRoute } from 'next';

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
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://spruked.com';
  const paths = [
    ...fixedPages,
    ...ecosystemSections.map((section) => `/ecosystem/${section}`),
    ...technologySections.map((section) => `/technology/${section}`),
  ];

  return paths.map((path) => ({
    url: `${baseUrl}${path}`,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : 0.7,
  }));
}
