import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const baseUrl = process.env.ORB_TEST_BASE_URL || 'http://127.0.0.1:3400';
const cdpUrl = process.env.ORB_CDP_URL || 'http://127.0.0.1:9223';
const routesPath = new URL('../spruked_Vault/knowledge/website/site_world_routes.json', import.meta.url);
const outputPath = new URL('../spruked_Vault/knowledge/website/runtime_verified_pointer_map.json', import.meta.url);

const selector = [
  'a', 'button', 'input:not([type="hidden"])', 'select', 'textarea', '[role="button"]',
  'main h1', 'main h2', 'main h3', 'main section[id]', 'main form', '[data-orb-point]',
].join(', ');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

class CdpSession {
  constructor(webSocketUrl) {
    this.nextId = 1;
    this.pending = new Map();
    this.socket = new WebSocket(webSocketUrl);
  }
  async open() {
    if (this.socket.readyState !== WebSocket.OPEN) {
      await new Promise((resolve, reject) => {
        this.socket.addEventListener('open', resolve, { once: true });
        this.socket.addEventListener('error', reject, { once: true });
      });
    }
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (!message.id) return;
      const waiting = this.pending.get(message.id);
      if (!waiting) return;
      this.pending.delete(message.id);
      if (message.error) waiting.reject(new Error(message.error.message));
      else waiting.resolve(message.result);
    });
  }
  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() {
    this.socket.close();
  }
}

async function evaluate(session, expression) {
  const result = await session.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Browser evaluation failed');
  return result.result.value;
}

async function loadRoute(session, route) {
  const destination = new URL(route, baseUrl);
  await session.send('Page.navigate', { url: destination.href });
  // Dev compilation can briefly hold a first route load while Next rebuilds.
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const state = await evaluate(session, `({ path: location.pathname, ready: document.readyState })`);
    if (state.path === destination.pathname && state.ready === 'complete') {
      await delay(450);
      return;
    }
    await delay(200);
  }
  throw new Error(`Timed out loading ${route}`);
}

const routes = JSON.parse(await readFile(routesPath, 'utf8'));
const pages = await fetch(`${cdpUrl}/json/list`).then((response) => response.json());
const page = pages.find((candidate) => candidate.type === 'page' && candidate.webSocketDebuggerUrl);
assert(page, `No debuggable Chromium page is available at ${cdpUrl}.`);

const session = new CdpSession(page.webSocketDebuggerUrl);
await session.open();
await session.send('Page.enable');
await session.send('Runtime.enable');

const records = [];
const rejected = [];
const verifiedAt = new Date().toISOString();

for (const route of routes) {
  await loadRoute(session, route.path);
  const candidates = await evaluate(session, `(() => {
    const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const label = (element) => {
      if (element.matches('main section[id], main form')) {
        const heading = element.querySelector('h1, h2, h3');
        if (heading?.textContent) return normalize(heading.textContent);
      }
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)) {
        return normalize(element.getAttribute('aria-label') || element.getAttribute('placeholder') || element.getAttribute('name'));
      }
      return normalize(element.getAttribute('aria-label') || element.textContent || element.getAttribute('placeholder') || element.getAttribute('name'));
    };
    const cssPath = (element) => {
      if (element.id) {
        const idSelector = '#' + CSS.escape(element.id);
        if (document.querySelectorAll(idSelector).length === 1) return idSelector;
      }
      if (element.dataset.orbPoint) {
        const pointSelector = '[data-orb-point="' + CSS.escape(element.dataset.orbPoint) + '"]';
        if (document.querySelectorAll(pointSelector).length === 1) return pointSelector;
      }
      const parts = [];
      let current = element;
      while (current && current !== document.documentElement) {
        const tag = current.tagName.toLowerCase();
        if (current === document.body) {
          parts.unshift('body');
          break;
        }
        const parent = current.parentElement;
        if (!parent) break;
        const sameTag = Array.from(parent.children).filter((child) => child.tagName === current.tagName);
        const part = sameTag.length > 1 ? tag + ':nth-of-type(' + (sameTag.indexOf(current) + 1) + ')' : tag;
        parts.unshift(part);
        current = parent;
      }
      return parts.join(' > ');
    };
    const targetType = (element) => element.matches('button, [role="button"]') ? 'button'
      : element.matches('input, select, textarea') ? 'form_field'
      : element.tagName.toLowerCase() === 'a' ? 'link'
      : element.matches('h1, h2, h3') ? 'heading'
      : element.matches('section') ? 'section'
      : element.matches('form') ? 'form'
      : 'control';
    const aliases = (element, primaryLabel) => {
      const values = [
        primaryLabel,
        element.id?.replace(/[-_]+/g, ' '),
        element.getAttribute('name')?.replace(/[-_]+/g, ' '),
        element.getAttribute('aria-label'),
        element.getAttribute('placeholder'),
        ...Array.from(element.labels || []).map((item) => item.textContent),
      ].map(normalize).filter((value) => value.length >= 2);
      return [...new Set(values)];
    };
    return Array.from(document.querySelectorAll(${JSON.stringify(selector)}))
      .filter(visible)
      .filter((element) => !element.closest('[data-orb-transient]'))
      .map((element) => {
        const primaryLabel = label(element).slice(0, 160);
        return {
          selector: cssPath(element),
          label: primaryLabel,
          aliases: aliases(element, primaryLabel).map((value) => value.slice(0, 160)),
          tag: element.tagName.toLowerCase(),
          target_type: targetType(element),
        };
      })
      .filter((candidate) => candidate.selector && candidate.label.length >= 2);
  })()`);

  const provisional = candidates.map((candidate) => {
    const fingerprint = createHash('sha256').update(candidate.label.toLowerCase()).digest('hex').slice(0, 16);
    const targetId = `verified_${createHash('sha256').update(`${route.path}|${candidate.selector}|${candidate.label}`).digest('hex').slice(0, 12)}`;
    return {
      target_id: targetId,
      page_route: `https://spruked.com${route.path}`,
      target_type: candidate.target_type,
      pointer_class: 'runtime_verified_guidance',
      pointer_admission_reason: 'verified_against_rendered_public_route',
      meaning: `${candidate.target_type}: ${candidate.label}`,
      intent_aliases: candidate.aliases.flatMap((alias) => [alias, `point to ${alias}`, `show me ${alias}`]),
      direct_aliases: candidate.aliases,
      topic_aliases: candidate.aliases.flatMap((alias) => [`where is ${alias}`, `highlight ${alias}`]),
      content_fingerprint: fingerprint,
      semantic_locator: candidate.selector,
      anchor_strategy: candidate.selector.startsWith('#') ? 'element_id' : 'verified_structural_css',
      structural_context: {
        landmark: 'rendered_page', parent_locator: '', parent_heading: '', ordinal_in_parent: 0, tag: candidate.tag,
      },
      confidence: candidate.selector.startsWith('#') ? 0.99 : 0.94,
      confidence_class: 'RUNTIME_VERIFIED',
      runtime_policy: {
        behavior: 'guide_and_verify_before_action', may_point: true, must_verify_before_action: true, requires_confirmation: false,
      },
      allowed_actions: ['point'],
      status: 'active',
      finding_class: 'RUNTIME_VERIFIED',
      finding_subreason: 'resolved_visible_tag_and_fingerprint_match_on_second_load',
      pointer_health: 'VERIFIED',
      last_verified_at: verifiedAt,
      source: 'runtime_verified_site_scan',
    };
  });

  // A second page load catches locators that only worked because of transient DOM state.
  await loadRoute(session, route.path);
  const checks = await evaluate(session, `(async () => {
    const records = ${JSON.stringify(provisional)};
    const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const label = (element) => {
      if (element.matches('main section[id], main form')) {
        const heading = element.querySelector('h1, h2, h3');
        if (heading?.textContent) return normalize(heading.textContent);
      }
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)) {
        return normalize(element.getAttribute('aria-label') || element.getAttribute('placeholder') || element.getAttribute('name'));
      }
      return normalize(element.getAttribute('aria-label') || element.textContent || element.getAttribute('placeholder') || element.getAttribute('name'));
    };
    const fingerprint = async (value) => {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalize(value).toLowerCase()));
      return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 16);
    };
    const output = [];
    for (const record of records) {
      let element = null;
      try { element = document.querySelector(record.semantic_locator); } catch {}
      output.push({
        id: record.target_id,
        pass: Boolean(element && visible(element)
          && element.tagName.toLowerCase() === record.structural_context.tag
          && await fingerprint(label(element)) === record.content_fingerprint),
      });
    }
    return output;
  })()`);
  const passedIds = new Set(checks.filter((check) => check.pass).map((check) => check.id));
  records.push(...provisional.filter((record) => passedIds.has(record.target_id)));
  rejected.push(...provisional.filter((record) => !passedIds.has(record.target_id)).map((record) => ({
    target_id: record.target_id, page_route: record.page_route, meaning: record.meaning, reason: 'second_load_verification_failed',
  })));
  console.log(`${route.path}: ${passedIds.size}/${provisional.length} verified`);
}

session.close();
const output = {
  schema_version: '1.0',
  generated_at: verifiedAt,
  source: 'rendered_spruked_site_scan',
  source_base_url: baseUrl,
  route_count: routes.length,
  record_count: records.length,
  rejected_count: rejected.length,
  records,
  rejected,
};
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${records.length} verified pointer records across ${routes.length} routes; rejected ${rejected.length}.`);
