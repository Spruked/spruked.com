import 'server-only';

import { readFile } from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';
import { sprukedVaultRoot } from '@/lib/spruked-vault';

export type PointerPlotRecord = {
  target_id: string;
  page_route: string;
  target_type: string;
  meaning: string;
  intent_aliases: string[];
  direct_aliases: string[];
  topic_aliases: string[];
  content_fingerprint: string;
  semantic_locator: string;
  anchor_strategy: string;
  structural_context: {
    landmark: string;
    parent_locator: string;
    parent_heading: string;
    ordinal_in_parent: number;
    tag: string;
  };
  confidence: number;
  runtime_policy?: { may_point?: boolean; behavior?: string; must_verify_before_action?: boolean };
  finding_class?: string;
  allowed_actions: string[];
  status: string;
  last_verified_at: string;
  source: string;
};

const POINTER_MAP_PATH = path.join(
  sprukedVaultRoot(),
  'knowledge',
  'website',
  'orb-weaver',
  'pointer_plot_map.json',
);

const VERIFIED_POINTER_MAP_PATH = path.join(
  sprukedVaultRoot(),
  'knowledge',
  'website',
  'runtime_verified_pointer_map.json',
);

export const TRUEMARK_MINT_PROOF_TARGET_ID = 'target_c429b8d10a77';

let cachedMap: Promise<{ records: PointerPlotRecord[] }> | null = null;

function loadPointerMap() {
  cachedMap ??= Promise.all([
    readFile(VERIFIED_POINTER_MAP_PATH, 'utf8').then((raw) => JSON.parse(raw)).catch(() => ({ records: [] })),
    readFile(POINTER_MAP_PATH, 'utf8').then((raw) => JSON.parse(raw)),
  ]).then(([verified, imported]) => ({
    // Prefer freshly rendered and independently verified records when both
    // layers describe the same visible target.
    records: [...verified.records, ...imported.records],
  }));
  return cachedMap;
}

export async function getControlledPointerTarget(targetId: string) {
  const pointerMap = await loadPointerMap();
  return pointerMap.records.find((record) => (
    record.target_id === targetId
    && record.status === 'active'
    && record.allowed_actions.includes('point')
    && record.runtime_policy?.may_point === true
  )) || null;
}

function normalized(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function containsPhrase(text: string, phrase: string) {
  return text === phrase
    || text.startsWith(`${phrase} `)
    || text.endsWith(` ${phrase}`)
    || text.includes(` ${phrase} `);
}

type LiveBrowserControl = {
  tag?: string;
  label?: string;
  anchor_id?: string | null;
  semantic_locator?: string;
  target_type?: string;
};

function pointerSubject(prompt: string) {
  return normalized(prompt)
    .replace(/\b(?:please|cali|orb)\b/g, ' ')
    .replace(/\b(?:point(?: me)? to|highlight|show me|where is|find)\b/g, ' ')
    .replace(/\b(?:the|a|an|button|link|field|control|section|on this page)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Build a single-use pointer record from the caller's current visible DOM. */
export function findLiveBrowserTarget(prompt: string, currentPath: string, browserContext: unknown): PointerPlotRecord | null {
  const subject = pointerSubject(prompt);
  if (!subject) return null;
  const controls = Array.isArray((browserContext as any)?.controls)
    ? (browserContext as any).controls as LiveBrowserControl[]
    : [];
  const matches = controls
    .filter((control) => control.anchor_id && control.semantic_locator && control.label && control.tag)
    .map((control) => {
      const label = normalized(String(control.label));
      const score = label === subject ? 100
        : label.includes(subject) ? 80 + Math.min(subject.length, 15)
        : subject.includes(label) && label.length >= 3 ? 60 + Math.min(label.length, 15)
        : 0;
      return { control, label, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);
  const winner = matches[0];
  if (!winner) return null;
  if (matches[1] && matches[1].score === winner.score && matches[1].label !== winner.label) return null;

  const control = winner.control;
  const rawLabel = String(control.label).replace(/\s+/g, ' ').trim();
  return {
    target_id: String(control.anchor_id),
    page_route: `https://spruked.com${currentPath.startsWith('/') ? currentPath : `/${currentPath}`}`,
    target_type: String(control.target_type || control.tag),
    meaning: `${control.target_type || control.tag}: ${rawLabel}`,
    intent_aliases: [rawLabel, `point to ${rawLabel}`, `show me ${rawLabel}`],
    direct_aliases: [rawLabel],
    topic_aliases: [],
    content_fingerprint: createHash('sha256').update(rawLabel.toLowerCase()).digest('hex').slice(0, 16),
    semantic_locator: String(control.semantic_locator),
    anchor_strategy: 'live_browser_anchor',
    structural_context: {
      landmark: 'live_browser_context',
      parent_locator: 'body',
      parent_heading: '',
      ordinal_in_parent: 0,
      tag: String(control.tag),
    },
    confidence: 1,
    runtime_policy: { may_point: true, behavior: 'verify_live_dom_then_point', must_verify_before_action: true },
    finding_class: 'LIVE_VERIFIED_REQUEST',
    allowed_actions: ['point'],
    status: 'active',
    last_verified_at: new Date().toISOString(),
    source: 'live_browser_context',
  };
}

export async function findPointerTarget(prompt: string, currentPath: string) {
  const query = normalized(prompt);
  if (!query) return null;
  const pointerMap = await loadPointerMap();
  const actionRequested = /\b(show|take|go|navigate|open|find|point|where|bring|scroll|highlight|guide|jump)\b/.test(query);
  if (!actionRequested) return null;

  let winner: { record: PointerPlotRecord; score: number } | null = null;
  for (const record of pointerMap.records) {
    if (record.status !== 'active' || !record.allowed_actions.includes('point')) continue;
    // Orb Weaver distinguishes extracted candidates from targets safe for
    // runtime guidance. Do not turn an unverified or conflicted locator into a
    // live DOM action.
    if (record.runtime_policy && record.runtime_policy.may_point !== true) continue;
    const routePath = new URL(record.page_route).pathname || '/';
    const aliases = [...record.direct_aliases, ...record.intent_aliases, ...record.topic_aliases];
    const routeBonus = routePath === currentPath ? 20 : 0;
    const typeBonus = /\b(show|where|highlight|point|jump)\b/.test(query) && record.target_type === 'heading' ? 6
      : /\b(go|navigate|open|take)\b/.test(query) && record.target_type === 'nav' ? 6
      : 0;
    // Being on the current page is only a tie-breaker. It is not semantic
    // evidence that this is the requested target.
    let score = 0;
    let matched = false;
    for (const alias of aliases) {
      const candidate = normalized(alias);
      if (!candidate || candidate.length < 3) continue;
      if (query === candidate) {
        matched = true;
        score = Math.max(score, 100 + candidate.length + routeBonus + typeBonus);
      } else if (containsPhrase(query, candidate)) {
        matched = true;
        score = Math.max(score, 60 + candidate.length + routeBonus + typeBonus);
      } else if (containsPhrase(candidate, query) && query.length >= 5) {
        matched = true;
        score = Math.max(score, 30 + query.length + routeBonus + typeBonus);
      }
    }
    if (matched && score > (winner?.score || 0)) winner = { record, score };
  }
  return winner?.record || null;
}
