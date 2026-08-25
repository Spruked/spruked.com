import { SITE_ROUTES } from '@/lib/orb-site-world';
import type { PointerPlotRecord } from '@/lib/orb-pointer-map-server';

export type OrbToolRequest = {
  id: string;
  name: 'navigate' | 'point_to' | 'scroll_to';
  arguments: Record<string, string>;
  pointer_target?: PointerPlotRecord;
  requires_confirmation: true;
};

export const ORB_CAPABILITIES = [
  {
    name: 'navigate',
    description: 'Navigate the visitor to a known public Spruked route.',
    authorization: 'public_read_navigation',
    execution: 'browser',
    confirmation: 'required',
    parameters: { route: 'A route from the Site World', anchor_id: 'Optional stable anchor identifier' },
  },
  {
    name: 'point_to',
    description: 'Highlight and point to a live visible DOM control resolved from an anchor or label.',
    authorization: 'public_visual_guidance',
    execution: 'browser',
    confirmation: 'required',
    parameters: { anchor_id: 'Stable anchor identifier', label: 'Visible label or alias' },
  },
  {
    name: 'scroll_to',
    description: 'Scroll a live DOM element into view without activating it.',
    authorization: 'public_visual_guidance',
    execution: 'browser',
    confirmation: 'required',
    parameters: { anchor_id: 'Stable anchor identifier', label: 'Visible label or alias' },
  },
] as const;

function normalized(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function isNavigationIntent(prompt: string) {
  const text = normalized(prompt);
  const explicitlyRequestsLiveControl = /\b(point(?: me)? to|highlight|where is)\b/.test(text)
    || /\b(button|link|control|field|input|section)\b/.test(text);
  if (explicitlyRequestsLiveControl) return false;
  return /\b(take me|go to|navigate to|open|visit|bring me to|send me to|head to|show me|where can i learn about|learn about)\b/.test(text);
}

/** Resolve a requested destination only against canonical Site World routes. */
export function resolveCanonicalSiteRoute(prompt: string) {
  const text = normalized(prompt);
  const candidates = SITE_ROUTES
    .flatMap((candidate) => [candidate.title, ...candidate.aliases]
      .map((alias) => ({ candidate, phrase: normalized(alias) })))
    .filter(({ phrase }) => phrase.length > 2 && text.includes(phrase))
    .sort((a, b) => b.phrase.length - a.phrase.length);

  const best = candidates[0];
  if (!best) return null;
  // If equally strong phrases point to different routes, do not guess.
  const equallyStrong = candidates.filter(({ phrase }) => phrase.length === best.phrase.length);
  if (equallyStrong.some(({ candidate }) => candidate.path !== best.candidate.path)) return null;
  return best.candidate;
}

export function selectWebsiteTool(prompt: string, currentPath = '/'): OrbToolRequest | null {
  if (!isNavigationIntent(prompt)) return null;
  const route = resolveCanonicalSiteRoute(prompt);
  if (!route) return null;

  const id = `orb-tool-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return { id, name: 'navigate', arguments: { route: route.path, anchor_id: `route:${route.path}`, label: route.title }, requires_confirmation: true };
}
