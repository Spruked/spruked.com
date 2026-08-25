import { readFile } from 'node:fs/promises';

const baseUrl = process.env.ORB_TEST_BASE_URL || 'http://127.0.0.1:3400';
const cdpUrl = process.env.ORB_CDP_URL || 'http://127.0.0.1:9223';
const mapPath = new URL('../spruked_Vault/knowledge/website/orb-weaver/pointer_plot_map.json', import.meta.url);
const verifiedMapPath = new URL('../spruked_Vault/knowledge/website/runtime_verified_pointer_map.json', import.meta.url);

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
    if (this.socket.readyState === WebSocket.OPEN) return;
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
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
  const result = await session.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Browser evaluation failed');
  return result.result.value;
}

async function waitForRoute(session, pathname) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const state = await evaluate(session, `({ path: location.pathname, ready: document.readyState })`);
    if (state.path === pathname && state.ready === 'complete') return;
    await delay(200);
  }
  throw new Error(`Timed out loading ${pathname}`);
}

const pointerMap = JSON.parse(await readFile(mapPath, 'utf8'));
const verifiedMap = JSON.parse(await readFile(verifiedMapPath, 'utf8'));
const admitted = [...verifiedMap.records, ...pointerMap.records].filter((record) => (
  record.status === 'active'
  && record.allowed_actions.includes('point')
  && record.runtime_policy?.may_point === true
));
assert(admitted.length > 0, 'The Vault contains no runtime-admitted pointer records.');

const pages = await fetch(`${cdpUrl}/json/list`).then((response) => response.json());
const page = pages.find((candidate) => candidate.type === 'page' && candidate.webSocketDebuggerUrl);
assert(page, `No debuggable browser page is available at ${cdpUrl}.`);

const session = new CdpSession(page.webSocketDebuggerUrl);
await session.open();
await session.send('Page.enable');
await session.send('Runtime.enable');

const failures = [];
const byRoute = Map.groupBy(admitted, (record) => {
  const url = new URL(record.page_route);
  return `${url.pathname}${url.search}`;
});

for (const [route, records] of byRoute) {
  const expectedPath = new URL(route, baseUrl).pathname;
  await session.send('Page.navigate', { url: new URL(route, baseUrl).href });
  await waitForRoute(session, expectedPath);
  await delay(350);

  const results = await evaluate(session, `(async () => {
    const records = ${JSON.stringify(records)};
    const normalize = (value) => value.replace(/\\s+/g, ' ').trim();
    const fingerprint = async (value) => {
      const bytes = new TextEncoder().encode(normalize(value).toLowerCase());
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 16);
    };
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const pointerText = (element, source) => {
      if (source === 'runtime_verified_site_scan') {
        if (element.matches('main section[id], main form')) {
          const heading = element.querySelector('h1, h2, h3');
          if (heading?.textContent) return heading.textContent;
        }
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)) {
          return element.getAttribute('aria-label') || element.getAttribute('placeholder') || element.getAttribute('name') || '';
        }
        return element.getAttribute('aria-label') || element.textContent || element.getAttribute('placeholder') || element.getAttribute('name') || '';
      }
      if (source === 'live_browser_context') {
        return element.getAttribute('aria-label') || element.textContent || element.getAttribute('placeholder') || element.getAttribute('name') || '';
      }
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)) {
        return [element.getAttribute('aria-label') || '', element.getAttribute('placeholder') || '', element.getAttribute('name') || ''].join(' ');
      }
      return element.textContent || element.getAttribute('aria-label') || '';
    };
    const output = [];
    for (const record of records) {
      let scope = document;
      let element = null;
      try {
        if (record.structural_context.parent_locator) scope = document.querySelector(record.structural_context.parent_locator);
        if (scope) element = scope.querySelector(record.semantic_locator);
      } catch {}
      const actualFingerprint = element ? await fingerprint(pointerText(element, record.source)) : '';
      output.push({
        id: record.target_id,
        found: Boolean(element),
        visible: Boolean(element && visible(element)),
        tagMatches: Boolean(element && element.tagName.toLowerCase() === record.structural_context.tag.toLowerCase()),
        fingerprintMatches: actualFingerprint === record.content_fingerprint,
      });
    }
    return output;
  })()`);

  for (const result of results) {
    if (!result.found || !result.visible || !result.tagMatches || !result.fingerprintMatches) {
      failures.push({ route, ...result });
    }
  }
}

assert(failures.length === 0, `Runtime pointer verification failed:\n${JSON.stringify(failures, null, 2)}`);

// Verify the visible worker-Morb lifecycle on the homepage, where GlobalOrb is mounted.
await session.send('Page.navigate', { url: new URL('/', baseUrl).href });
await waitForRoute(session, '/');
let globalOrbMounted = false;
const orbMountDeadline = Date.now() + 15_000;
while (!globalOrbMounted && Date.now() < orbMountDeadline) {
  globalOrbMounted = await evaluate(session, `Boolean(document.querySelector('button[aria-label*="ORB voice turn"]'))`);
  if (!globalOrbMounted) await delay(200);
}
assert(globalOrbMounted, 'The global ORB is not mounted on the homepage.');
const morbStarted = await evaluate(session, `(() => {
  window.dispatchEvent(new CustomEvent('spruked-morb-deploy', { detail: { x: 240, y: 240, target_id: 'browser-audit' } }));
  return true;
})()`);
assert(morbStarted, 'The Morb deployment event could not be dispatched.');
await delay(120);
const morbFlight = await evaluate(session, `(() => {
  const element = document.querySelector('.orb-morb-flight');
  if (!element) return null;
  const style = getComputedStyle(element);
  return { width: style.width, height: style.height, animationName: style.animationName };
})()`);
assert(morbFlight, 'The worker Morb did not deploy.');
assert(morbFlight.width === '25px' && morbFlight.height === '25px', `The worker Morb is not 25px: ${JSON.stringify(morbFlight)}`);
assert(morbFlight.animationName.includes('cali-morb-flight'), 'The worker Morb flight animation did not start.');
await delay(3_900);
const morbRemaining = await evaluate(session, `Boolean(document.querySelector('.orb-morb-flight'))`);
assert(!morbRemaining, 'The worker Morb did not dissolve after pointing.');

session.close();
console.log(`Browser pointer audit passed: ${admitted.length} authoritative targets across ${byRoute.size} routes; 25px worker Morb deployed, dwelled, and dissolved.`);
