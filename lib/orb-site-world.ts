export type SiteAnchor = {
  id: string;
  route: string;
  label: string;
  aliases: string[];
  selector: string;
  kind: 'page' | 'section' | 'link' | 'button' | 'form' | 'input';
};

export type SiteRoute = {
  path: string;
  title: string;
  aliases: string[];
  summary: string;
};

// The Spruked Vault is the single source of truth for every public page CALI may navigate.
export const SITE_ROUTES: SiteRoute[] = siteWorldRoutes;

export const SITE_ANCHORS: SiteAnchor[] = SITE_ROUTES.map((route) => ({
  id: `route:${route.path}`,
  route: route.path,
  label: route.title,
  aliases: route.aliases,
  selector: 'main, body',
  kind: 'page',
}));

export function publicSiteWorld() {
  return {
    schema_version: '1.1',
    site_id: 'spruked.com',
    authority: 'website-orb',
    positioning: 'live_dom_required',
    routes: SITE_ROUTES,
    anchors: SITE_ANCHORS,
  };
}
import siteWorldRoutes from '@/spruked_Vault/knowledge/website/site_world_routes.json';
