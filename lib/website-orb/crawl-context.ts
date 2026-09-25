import fs from 'node:fs';
import path from 'node:path';

type CrawlContext = {
  source: string;
  crawl_id: string;
  saved_at: string;
  site_summary: string;
  page_count: number;
  orb_ready_score: number;
  key_facts: string[];
  route_hints: Record<string, string>;
  pages: Array<{
    route: string;
    title: string;
    h1: string;
  }>;
  lidar: {
    status: string;
    pointer_candidate_count: number;
    routes_with_targets: number;
    geometry_status: string;
    live_validation_required: boolean;
    pointer_record_count: number;
    stable_guidance_count: number;
    recovery_status: string;
  };
};

let cachedContext: CrawlContext | null | undefined;

function crawlPath(): string {
  return process.env.SPRUKED_ORB_CRAWL_PATH ||
    path.join(process.cwd(), 'data/orb/crawl_7/history/crawl_7.json');
}

function compactText(value: unknown, max = 700): string {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function getSprukedCrawlContext(): CrawlContext | null {
  if (cachedContext !== undefined) return cachedContext;

  try {
    const source = crawlPath();
    const raw = JSON.parse(fs.readFileSync(source, 'utf8')) as any;
    const pages = Array.isArray(raw?.crawl?.pages) ? raw.crawl.pages : [];
    const pointerSummary = raw?.pointer_summary || raw?.crawl?.pointer_summary || {};
    const lidarWeave = raw?.crawl?.stats?.lidar_weave || {};
    const quality = raw?.pointer_plot_map?.quality || {};

    cachedContext = {
      source: 'Orb Weaver crawl_7.json',
      crawl_id: String(raw?.crawl?.id || raw?.site_profile?.latest_crawl_id || '7'),
      saved_at: String(raw?.saved_at || ''),
      site_summary: compactText(raw?.website_orb_context?.site_summary, 240),
      page_count: Number(raw?.site_profile?.page_count || pages.length || 0),
      orb_ready_score: Number(raw?.website_orb_context?.orb_ready_score || 0),
      key_facts: (Array.isArray(raw?.website_orb_context?.key_facts)
        ? raw.website_orb_context.key_facts
        : []).map((fact: unknown) => compactText(fact, 120)).filter(Boolean).slice(0, 6),
      route_hints: Object.fromEntries(
        Object.entries(raw?.website_orb_context?.route_hints || {})
          .slice(0, 10)
          .map(([label, route]) => [compactText(label, 100), compactText(route, 120)]),
      ),
      pages: pages.slice(0, 15).map((page: any) => ({
        route: new URL(String(page?.url || 'https://spruked.com/')).pathname || '/',
        title: compactText(page?.title, 120),
        h1: compactText(page?.h1, 100),
      })),
      lidar: {
        status: String(lidarWeave?.status || 'candidate_inventory_complete'),
        pointer_candidate_count: Number(lidarWeave?.pointer_candidate_count || raw?.pointer_plot_map?.record_count || 0),
        routes_with_targets: Number(lidarWeave?.routes_with_targets || 0),
        geometry_status: String(lidarWeave?.geometry_status || 'runtime_measurement_required'),
        live_validation_required: Boolean(lidarWeave?.live_validation_required ?? true),
        pointer_record_count: Number(raw?.pointer_plot_map?.record_count || 0),
        stable_guidance_count: Number(raw?.pointer_plot_map?.diagnostics?.unique_verified_guidance_targets || quality?.stable_count || 0),
        recovery_status: String(raw?.pointer_plot_map?.quality?.status || pointerSummary?.status || 'POINTER_RECOVERY_REQUIRED'),
      },
    };
  } catch (error) {
    console.warn(`[Spruked ORB] Crawl context unavailable at ${crawlPath()}:`, error);
    cachedContext = null;
  }

  return cachedContext;
}
