import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = path.resolve(new URL('..', import.meta.url).pathname);
const appRoot = path.join(projectRoot, 'app');
const registryPath = path.join(projectRoot, 'spruked_Vault', 'knowledge', 'website', 'site_world_routes.json');
const excludedRoutes = new Set(['/admin']);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function collectPages(directory = appRoot) {
  const entries = await readdir(directory, { withFileTypes: true });
  const routes = [];
  if (entries.some((entry) => entry.isFile() && entry.name === 'page.tsx')) {
    const relative = path.relative(appRoot, directory);
    routes.push(relative ? `/${relative.split(path.sep).join('/')}` : '/');
  }
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name !== 'api') {
      routes.push(...await collectPages(path.join(directory, entry.name)));
    }
  }
  return routes;
}

const registry = JSON.parse(await readFile(registryPath, 'utf8'));
const paths = registry.map((route) => route.path);
assert(new Set(paths).size === paths.length, 'Site World contains duplicate canonical paths.');
for (const route of registry) {
  assert(route.path.startsWith('/'), `Invalid canonical route: ${route.path}`);
  assert(route.title && route.aliases?.length, `Route ${route.path} needs a title and spoken aliases.`);
}

const pages = (await collectPages()).filter((route) => !excludedRoutes.has(route)).sort();
const registered = [...paths].sort();
const missing = pages.filter((route) => !paths.includes(route));
const stale = registered.filter((route) => !pages.includes(route));
assert(!missing.length, `Public pages missing from CALI Site World: ${missing.join(', ')}`);
assert(!stale.length, `CALI Site World routes without pages: ${stale.join(', ')}`);

console.log(`Site World audit passed: all ${registered.length} public pages have canonical routes and spoken aliases.`);
