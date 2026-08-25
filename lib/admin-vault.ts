import { promises as fs } from 'node:fs';
import path from 'node:path';
import { sprukedVaultPath } from '@/lib/spruked-vault';

export type AdminVaultEntry = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type AdminVaultCategory = {
  key: string;
  label: string;
  description: string;
  created_at: string;
  updated_at: string;
  entries: AdminVaultEntry[];
};

export type AdminVaultData = {
  schema_version: 'admin-vault.v1';
  updated_at: string;
  categories: AdminVaultCategory[];
};

const DEFAULT_FILE = sprukedVaultPath('state', 'admin-vault.json');

function vaultFilePath(): string {
  return process.env.ADMIN_VAULT_FILE?.trim() || DEFAULT_FILE;
}

function normalizeCategoryKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function emptyVault(): AdminVaultData {
  return {
    schema_version: 'admin-vault.v1',
    updated_at: new Date().toISOString(),
    categories: [],
  };
}

async function writeVault(data: AdminVaultData): Promise<void> {
  const file = vaultFilePath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  const normalized: AdminVaultData = {
    ...data,
    schema_version: 'admin-vault.v1',
    updated_at: new Date().toISOString(),
  };
  const temp = `${file}.tmp`;
  await fs.writeFile(temp, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  await fs.rename(temp, file);
}

export async function readVault(): Promise<AdminVaultData> {
  try {
    const raw = await fs.readFile(vaultFilePath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<AdminVaultData>;
    const categories = Array.isArray(parsed.categories) ? parsed.categories : [];
    return {
      schema_version: 'admin-vault.v1',
      updated_at: typeof parsed.updated_at === 'string' ? parsed.updated_at : new Date().toISOString(),
      categories: categories.map((category) => ({
        key: normalizeCategoryKey(String(category?.key || '')) || 'general',
        label: String(category?.label || 'General'),
        description: String(category?.description || ''),
        created_at: String(category?.created_at || new Date().toISOString()),
        updated_at: String(category?.updated_at || new Date().toISOString()),
        entries: Array.isArray(category?.entries)
          ? category.entries.map((entry) => ({
              id: String(entry?.id || newId()),
              title: String(entry?.title || 'Untitled'),
              body: String(entry?.body || ''),
              tags: Array.isArray(entry?.tags) ? entry.tags.map((tag) => String(tag)) : [],
              created_at: String(entry?.created_at || new Date().toISOString()),
              updated_at: String(entry?.updated_at || new Date().toISOString()),
            }))
          : [],
      })),
    };
  } catch {
    const seed = emptyVault();
    await writeVault(seed);
    return seed;
  }
}

export async function upsertCategory(input: { key?: string; label: string; description?: string }): Promise<AdminVaultData> {
  const data = await readVault();
  const key = normalizeCategoryKey(input.key || input.label);
  if (!key) {
    throw new Error('Category key is required.');
  }

  const now = new Date().toISOString();
  const existing = data.categories.find((category) => category.key === key);

  if (existing) {
    existing.label = input.label.trim() || existing.label;
    existing.description = (input.description || '').trim();
    existing.updated_at = now;
  } else {
    data.categories.unshift({
      key,
      label: input.label.trim() || key,
      description: (input.description || '').trim(),
      created_at: now,
      updated_at: now,
      entries: [],
    });
  }

  await writeVault(data);
  return data;
}

export async function addEntry(input: { category_key: string; title: string; body: string; tags?: string[] }): Promise<AdminVaultData> {
  const data = await readVault();
  const key = normalizeCategoryKey(input.category_key);
  if (!key) {
    throw new Error('category_key is required.');
  }

  const category = data.categories.find((item) => item.key === key);
  if (!category) {
    throw new Error('Category not found. Create it first.');
  }

  const title = input.title.trim();
  if (!title) {
    throw new Error('Entry title is required.');
  }

  const now = new Date().toISOString();
  const tags = Array.isArray(input.tags)
    ? Array.from(new Set(input.tags.map((tag) => tag.trim()).filter(Boolean)))
    : [];

  category.entries.unshift({
    id: newId(),
    title,
    body: String(input.body || '').trim(),
    tags,
    created_at: now,
    updated_at: now,
  });
  category.updated_at = now;

  await writeVault(data);
  return data;
}

export async function deleteEntry(input: { category_key: string; entry_id: string }): Promise<AdminVaultData> {
  const data = await readVault();
  const key = normalizeCategoryKey(input.category_key);
  if (!key || !input.entry_id.trim()) {
    throw new Error('category_key and entry_id are required.');
  }

  const category = data.categories.find((item) => item.key === key);
  if (!category) {
    throw new Error('Category not found.');
  }

  const before = category.entries.length;
  category.entries = category.entries.filter((entry) => entry.id !== input.entry_id);
  if (category.entries.length === before) {
    throw new Error('Entry not found.');
  }
  category.updated_at = new Date().toISOString();

  await writeVault(data);
  return data;
}

export function normalizeVaultCategoryKey(value: string): string {
  return normalizeCategoryKey(value);
}
