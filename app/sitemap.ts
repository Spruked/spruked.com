import type { MetadataRoute } from 'next';
import { SITE_ROUTES } from '@/lib/orb-site-world';

const BASE_URL = 'https://spruked.com';

export const publicRoutes = SITE_ROUTES.map((route) => route.path);

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return publicRoutes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified,
  }));
}
