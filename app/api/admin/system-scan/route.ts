import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const runtime = 'nodejs';

const MAX_DEPTH = 4;
const MAX_RESULTS = 120;
const NAME_PATTERN = /(pro[\s_-]?prime|prometheus|financial|prime)/i;
const SKIP_DIRS = new Set([
  '.git',
  '.next',
  'node_modules',
  'dist',
  'build',
  'venv',
  '.venv',
  '__pycache__',
  '.cache',
]);

type ScanMatch = {
  name: string;
  path: string;
  root: string;
  has_package_json: boolean;
  has_git: boolean;
  has_readme: boolean;
  has_src_or_app: boolean;
  last_modified: string | null;
};

async function inspectProject(candidatePath: string): Promise<Omit<ScanMatch, 'name' | 'path' | 'root'>> {
  try {
    const entries = await fs.readdir(candidatePath, { withFileTypes: true });
    const names = entries.map((entry) => entry.name.toLowerCase());
    const hasPackageJson = names.includes('package.json');
    const hasGit = names.includes('.git');
    const hasReadme = names.some((name) => name === 'readme' || name.startsWith('readme.'));
    const hasSrcOrApp = names.includes('src') || names.includes('app') || names.includes('pages');

    let lastModified: string | null = null;
    try {
      const stats = await fs.stat(candidatePath);
      lastModified = stats.mtime.toISOString();
    } catch {
      lastModified = null;
    }

    return {
      has_package_json: hasPackageJson,
      has_git: hasGit,
      has_readme: hasReadme,
      has_src_or_app: hasSrcOrApp,
      last_modified: lastModified,
    };
  } catch {
    return {
      has_package_json: false,
      has_git: false,
      has_readme: false,
      has_src_or_app: false,
      last_modified: null,
    };
  }
}

async function scanRoot(rootPath: string): Promise<ScanMatch[]> {
  const results: ScanMatch[] = [];
  const queue: Array<{ dir: string; depth: number }> = [{ dir: rootPath, depth: 0 }];

  while (queue.length > 0 && results.length < MAX_RESULTS) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    let entries: Array<import('node:fs').Dirent> = [];

    try {
      entries = await fs.readdir(current.dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      if (SKIP_DIRS.has(entry.name)) {
        continue;
      }

      const fullPath = path.join(current.dir, entry.name);

      if (NAME_PATTERN.test(entry.name)) {
        const projectSignals = await inspectProject(fullPath);
        results.push({
          name: entry.name,
          path: fullPath,
          root: rootPath,
          ...projectSignals,
        });

        if (results.length >= MAX_RESULTS) {
          break;
        }
      }

      if (current.depth < MAX_DEPTH) {
        queue.push({ dir: fullPath, depth: current.depth + 1 });
      }
    }
  }

  return results;
}

export async function GET(request: NextRequest) {
  const adminToken = process.env.ADMIN_ACCESS_TOKEN;
  const authorization = request.headers.get('authorization');

  if (!adminToken) {
    return NextResponse.json(
      { error: 'Server is missing ADMIN_ACCESS_TOKEN. Configure the environment before scanning systems.' },
      { status: 500 },
    );
  }

  if (authorization !== `Bearer ${adminToken}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const roots = [
    '/mnt/f',
    '/home/bryan',
    '/mnt/c/dev/Desktop',
    '/mnt/c/dev/Desktop/Active',
    '/mnt/c/dev/Desktop/_repo_backups',
  ];

  const allMatches: ScanMatch[] = [];

  for (const root of roots) {
    const matches = await scanRoot(root);
    allMatches.push(...matches);
    if (allMatches.length >= MAX_RESULTS) {
      break;
    }
  }

  const dedupedMap = new Map<string, ScanMatch>();
  for (const match of allMatches) {
    if (!dedupedMap.has(match.path)) {
      dedupedMap.set(match.path, match);
    }
  }

  const deduped = Array.from(dedupedMap.values())
    .sort((left, right) => (right.last_modified || '').localeCompare(left.last_modified || ''))
    .slice(0, MAX_RESULTS);

  return NextResponse.json({
    scanned_at: new Date().toISOString(),
    count: deduped.length,
    systems: deduped,
  });
}


