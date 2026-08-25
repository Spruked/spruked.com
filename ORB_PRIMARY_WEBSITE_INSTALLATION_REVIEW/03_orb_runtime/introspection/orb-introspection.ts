import { promises as fs } from 'node:fs';
import path from 'node:path';

export const ORB_STATE_SCHEMA_VERSION = 'orb-state.v1';

export type OrbReasoningMode = 'local' | 'shared' | 'hybrid';
export type OrbClassification = 'truly site-specific reasoning' | 'hybrid reasoning' | 'shared central reasoning with site branding only';

export type OrbState = {
  schema_version: string;
  site_id: string;
  orb_id: string;
  display_name: string;
  frontend_component: string;
  endpoint: string;
  handler: string;
  reasoning_profile: string;
  context_source: string;
  reasoning_mode: OrbReasoningMode;
  fallback_state: string;
  last_reasoning_timestamp: string | null;
  voice_engine: string;
  voice_profile: string;
  tts_ready: boolean;
  last_synthesis_timestamp: string | null;
  last_error: string | null;
  service_health: string;
  orb_health: string;
  reasoning_state: string;
  voice_state: string;
  classification: OrbClassification;
  updated_at: string;
};

export type OrbStateUpdate = Partial<OrbState> & Pick<OrbState, 'site_id' | 'orb_id'>;

const DEFAULT_STATE_DIR = '/mnt/r/substrate/orb_state';

function stateDir(): string {
  return process.env.SUBSTRATE_ORB_STATE_DIR || DEFAULT_STATE_DIR;
}

function statePath(siteId: string, orbId: string): string {
  const safeSite = siteId.replace(/[^a-z0-9_.-]/gi, '_');
  const safeOrb = orbId.replace(/[^a-z0-9_.-]/gi, '_');
  return path.join(stateDir(), `${safeSite}__${safeOrb}.json`);
}

function classify(mode: OrbReasoningMode, fallbackState: string): OrbClassification {
  if (/fallback-native|shared generic|generic behavior/i.test(fallbackState || '')) {
    return 'shared central reasoning with site branding only';
  }
  if (mode === 'local') {
    return 'truly site-specific reasoning';
  }
  if (mode === 'hybrid') {
    return 'hybrid reasoning';
  }
  return 'shared central reasoning with site branding only';
}

function baseState(siteId: string, orbId: string): OrbState {
  const now = new Date().toISOString();
  return {
    schema_version: ORB_STATE_SCHEMA_VERSION,
    site_id: siteId,
    orb_id: orbId,
    display_name: orbId,
    frontend_component: 'unknown',
    endpoint: 'unknown',
    handler: 'unknown',
    reasoning_profile: 'unknown',
    context_source: 'unknown',
    reasoning_mode: 'shared',
    fallback_state: 'unknown',
    last_reasoning_timestamp: null,
    voice_engine: 'unknown',
    voice_profile: 'unknown',
    tts_ready: false,
    last_synthesis_timestamp: null,
    last_error: null,
    service_health: 'unknown',
    orb_health: 'unknown',
    reasoning_state: 'unknown',
    voice_state: 'unknown',
    classification: 'shared central reasoning with site branding only',
    updated_at: now,
  };
}

async function readExisting(siteId: string, orbId: string): Promise<OrbState | null> {
  try {
    const raw = await fs.readFile(statePath(siteId, orbId), 'utf8');
    return JSON.parse(raw) as OrbState;
  } catch {
    return null;
  }
}

export async function updateOrbState(update: OrbStateUpdate): Promise<OrbState> {
  await fs.mkdir(stateDir(), { recursive: true });
  const previous = (await readExisting(update.site_id, update.orb_id)) || baseState(update.site_id, update.orb_id);
  const next: OrbState = {
    ...previous,
    ...update,
    schema_version: ORB_STATE_SCHEMA_VERSION,
    updated_at: new Date().toISOString(),
  };
  next.classification = classify(next.reasoning_mode, next.fallback_state);

  const file = statePath(next.site_id, next.orb_id);
  const temp = `${file}.tmp`;
  await fs.writeFile(temp, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  await fs.rename(temp, file);
  await writeIndex();
  return next;
}

export async function readOrbStates(): Promise<OrbState[]> {
  try {
    const files = await fs.readdir(stateDir());
    const states: OrbState[] = [];
    for (const file of files) {
      if (!file.endsWith('.json') || file === 'orbs.json') {
        continue;
      }
      try {
        const raw = await fs.readFile(path.join(stateDir(), file), 'utf8');
        states.push(JSON.parse(raw) as OrbState);
      } catch {
        continue;
      }
    }
    return states.sort((left, right) => `${left.site_id}:${left.orb_id}`.localeCompare(`${right.site_id}:${right.orb_id}`));
  } catch {
    return [];
  }
}

export async function writeIndex(): Promise<void> {
  const states = await readOrbStates();
  const index = {
    schema_version: ORB_STATE_SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    count: states.length,
    orbs: states,
  };
  await fs.mkdir(stateDir(), { recursive: true });
  const file = path.join(stateDir(), 'orbs.json');
  const temp = `${file}.tmp`;
  await fs.writeFile(temp, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  await fs.rename(temp, file);
}
