import type { OrbToolRequest } from '@/lib/orb-capability-registry';
import type { PointerPlotRecord } from '@/lib/orb-pointer-map-server';

export type BrowserToolResult = {
  request_id: string;
  tool: string;
  ok: boolean;
  status: 'confirmed' | 'failed';
  message: string;
  resolved?: { selector: string; label: string; x: number; y: number };
};

function visible(element: Element) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
}

function normalizeVisibleText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

async function textFingerprint(value: string) {
  const bytes = new TextEncoder().encode(normalizeVisibleText(value).toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

function pointerText(element: HTMLElement, source = 'live_browser_context'): string {
  if (source === 'runtime_verified_site_scan') {
    return livePointerLabel(element);
  }
  if (source === 'live_browser_context') {
    return element.getAttribute('aria-label')
      || element.textContent
      || element.getAttribute('placeholder')
      || element.getAttribute('name')
      || '';
  }
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)) {
    return [
      element.getAttribute('aria-label') || '',
      element.getAttribute('placeholder') || '',
      element.getAttribute('name') || '',
    ].join(' ');
  }
  return element.textContent || element.getAttribute('aria-label') || '';
}

function livePointerLabel(element: HTMLElement): string {
  if (element.matches('main section[id], main form')) {
    const heading = element.querySelector<HTMLElement>('h1, h2, h3');
    if (heading?.textContent) return heading.textContent;
  }
  return pointerText(element);
}

async function resolveAuthoritativeTarget(record: PointerPlotRecord): Promise<HTMLElement | null> {
  const recordUrl = new URL(record.page_route, window.location.origin);
  if (window.location.pathname !== recordUrl.pathname) return null;
  if (recordUrl.search && window.location.search !== recordUrl.search) return null;
  if (record.status !== 'active' || !record.allowed_actions.includes('point')) return null;

  const parentSelector = record.structural_context.parent_locator;
  const scope: ParentNode = parentSelector ? document.querySelector(parentSelector) as HTMLElement : document;
  if (!scope) return null;

  // semantic_locator is deliberately resolved only inside its authoritative parent scope.
  let candidate: HTMLElement | null = null;
  try {
    candidate = scope.querySelector<HTMLElement>(record.semantic_locator);
  } catch {
    return null;
  }
  if (!candidate || !visible(candidate)) return null;
  if (candidate.tagName.toLowerCase() !== record.structural_context.tag.toLowerCase()) return null;

  const fingerprint = await textFingerprint(pointerText(candidate, record.source));
  if (fingerprint !== record.content_fingerprint) return null;
  return candidate;
}

async function ping(element: HTMLElement) {
  element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  await new Promise((resolve) => window.setTimeout(resolve, 520));
  const previous = element.style.outline;
  const previousOffset = element.style.outlineOffset;
  element.style.outline = '3px solid #67c6ff';
  element.style.outlineOffset = '6px';
  window.setTimeout(() => {
    element.style.outline = previous;
    element.style.outlineOffset = previousOffset;
  }, 4200);
}

export function observeBrowserContext() {
  const controls = Array.from(document.querySelectorAll<HTMLElement>([
    'a',
    'button',
    'input:not([type="hidden"])',
    'select',
    'textarea',
    '[role="button"]',
    'main h1',
    'main h2',
    'main h3',
    'main section[id]',
    'main form',
    '[data-orb-point]',
  ].join(', ')))
    .filter(visible)
    .slice(0, 160)
    .map((element, index) => {
      const anchorId = element.dataset.orbAnchor || `orb-live:${window.location.pathname}:${index}`;
      element.dataset.orbAnchor = anchorId;
      return {
        tag: element.tagName.toLowerCase(),
        label: normalizeVisibleText(livePointerLabel(element)).slice(0, 160),
        anchor_id: anchorId,
        semantic_locator: `[data-orb-anchor="${anchorId}"]`,
        target_type: element.matches('button, [role="button"]') ? 'button'
          : element.matches('input, select, textarea') ? 'form_field'
          : element.tagName.toLowerCase() === 'a' ? 'link'
          : element.matches('h1, h2, h3') ? 'heading'
          : element.matches('section') ? 'section'
          : element.matches('form') ? 'form'
          : 'control',
      };
    });
  return {
    path: window.location.pathname,
    title: document.title,
    viewport: { width: window.innerWidth, height: window.innerHeight, scroll_x: window.scrollX, scroll_y: window.scrollY },
    controls,
  };
}

export async function executeBrowserTool(request: OrbToolRequest): Promise<BrowserToolResult> {
  if (request.name === 'navigate') {
    const route = request.arguments.route;
    if (!route || !route.startsWith('/')) {
      return { request_id: request.id, tool: request.name, ok: false, status: 'failed', message: 'The requested route is not authorized.' };
    }
    if (window.location.pathname === route) {
      return { request_id: request.id, tool: request.name, ok: true, status: 'confirmed', message: `Navigation verified at ${route}.` };
    }
    sessionStorage.setItem('orb.pending-tool', JSON.stringify(request));
    window.location.assign(route);
    return { request_id: request.id, tool: request.name, ok: true, status: 'confirmed', message: `Navigation started to ${route}.` };
  }

  if (!request.pointer_target || request.pointer_target.target_id !== request.arguments.anchor_id) {
    return { request_id: request.id, tool: request.name, ok: false, status: 'failed', message: 'The authoritative pointer target was not supplied.' };
  }
  const element = await resolveAuthoritativeTarget(request.pointer_target);
  if (!element) {
    return { request_id: request.id, tool: request.name, ok: false, status: 'failed', message: 'I could not resolve that control in the live page.' };
  }
  await ping(element);
  const rect = element.getBoundingClientRect();
  window.dispatchEvent(new CustomEvent('spruked-morb-deploy', {
    detail: {
      x: Math.round(rect.left + rect.width / 2),
      y: Math.round(rect.top + rect.height / 2),
      target_id: request.arguments.anchor_id,
    },
  }));
  const label = (element.getAttribute('aria-label') || element.textContent || request.arguments.label || 'page control').trim().slice(0, 120);
  return {
    request_id: request.id,
    tool: request.name,
    ok: true,
    status: 'confirmed',
    message: `I found ${label} and highlighted it.`,
    resolved: { selector: element.tagName.toLowerCase(), label, x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) },
  };
}
