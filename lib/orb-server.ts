import { spawn } from 'child_process';
import crypto from 'crypto';
import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
import { sprukedVaultPaths } from '@/lib/spruked-vault';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type MeshArtifactType =
  | 'insight'
  | 'embedding_manifest'
  | 'index_manifest'
  | 'capability'
  | 'state_snapshot'
  | 'result'
  | 'task';

function utcNow(): string {
  return new Date().toISOString();
}

function resolveOrbPythonPath(): string {
  const configured = process.env.ORB_PYTHON_PATH?.trim();
  if (configured) {
    return configured;
  }

  const candidates = [
    '/home/bryan/venv312/bin/python',
    '/home/bryan/py312/bin/python',
    '/usr/bin/python3',
    'python3',
  ];

  return candidates.find((candidate) => candidate === 'python3' || existsSync(candidate)) || 'python3';
}

export function getOrbPaths() {
  const siteRoot = process.cwd();
  const orbRoot = path.join(siteRoot, 'Orb_Assistant');
  const vaultPaths = sprukedVaultPaths();
  const meshRoot = process.env.ORB_SHARED_MESH_ROOT || vaultPaths.mesh;
  const webSystemRoot = process.env.ORB_WEB_SYSTEM_ROOT || vaultPaths.runtime;
  const cp3Root = process.env.CP3_ROOT || process.env.ACP3_ROOT || '/mnt/r/cochlear_processor_3.0';
  const pythonPath = resolveOrbPythonPath();
  const bridgeScript = path.join(orbRoot, 'api', 'web_orb_bridge.py');

  return {
    siteRoot,
    orbRoot,
    vaultRoot: vaultPaths.root,
    meshRoot,
    webSystemRoot,
    cp3Root,
    pythonPath,
    bridgeScript,
    instanceId: 'web',
  };
}

async function writeJson(filePath: string, payload: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function readJsonIfExists<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content) as T;
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return fallback;
    }
    throw error;
  }
}

async function listJsonFiles(rootDir: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(currentDir: string): Promise<void> {
    let entries: any[] = [];
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        return;
      }
      throw error;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        files.push(fullPath);
      }
    }
  }

  await walk(rootDir);
  return files.sort();
}

function artifactDirectory(type: MeshArtifactType): string | null {
  const mapping: Record<string, string> = {
    insight: 'insights',
    embedding_manifest: 'embeddings',
    index_manifest: 'indexes',
    capability: 'capabilities',
    state_snapshot: 'state_snapshots',
  };
  return mapping[type] || null;
}

function makeArtifactEnvelope(
  type: MeshArtifactType,
  payload: JsonValue | Record<string, unknown>,
  metadata: Record<string, unknown> = {}
) {
  const content = JSON.stringify(payload ?? {});
  return {
    schema_version: '1.0',
    artifact_id: crypto.randomUUID(),
    artifact_type: type,
    source_orb: 'web',
    target_orb: typeof metadata.target_orb === 'string' ? metadata.target_orb : 'broadcast',
    created_at: utcNow(),
    updated_at: utcNow(),
    confidence: typeof metadata.confidence === 'number' ? metadata.confidence : 0.5,
    priority: typeof metadata.priority === 'string' ? metadata.priority : 'normal',
    content_hash: crypto.createHash('sha256').update(content).digest('hex'),
    tags: Array.isArray(metadata.tags) ? metadata.tags : [],
    payload,
    ...metadata,
  };
}

async function appendAudit(action: string, payload: Record<string, unknown>): Promise<void> {
  const { meshRoot } = getOrbPaths();
  const auditPath = path.join(meshRoot, 'audit', 'web.log');
  await fs.mkdir(path.dirname(auditPath), { recursive: true });
  await fs.appendFile(
    auditPath,
    `${JSON.stringify({ timestamp: utcNow(), instance_id: 'web', action, ...payload })}\n`,
    'utf8'
  );
}

async function appendGlyphTrace(
  type: MeshArtifactType,
  payload: JsonValue | Record<string, unknown>,
  metadata: Record<string, unknown>,
): Promise<void> {
  if (!['insight', 'result', 'task'].includes(type)) return;
  const { glyphTraces } = sprukedVaultPaths();
  await fs.mkdir(glyphTraces, { recursive: true });
  await fs.appendFile(
    path.join(glyphTraces, 'website-orb.jsonl'),
    `${JSON.stringify({
      schema_version: 'spruked-glyph-trace.v1',
      timestamp: utcNow(),
      source: 'website_orb',
      artifact_type: type,
      glyph: type === 'insight' ? '🧠' : type === 'task' ? '⚙️' : '↗️',
      payload,
      metadata,
    })}\n`,
    'utf8',
  );
}

export async function ensureWebMeshScaffold(): Promise<void> {
  const { meshRoot, siteRoot, webSystemRoot } = getOrbPaths();

  const directories = [
    path.join(meshRoot, 'exports', 'web', 'insights'),
    path.join(meshRoot, 'exports', 'web', 'embeddings'),
    path.join(meshRoot, 'exports', 'web', 'indexes'),
    path.join(meshRoot, 'exports', 'web', 'capabilities'),
    path.join(meshRoot, 'exports', 'web', 'state_snapshots'),
    path.join(meshRoot, 'imports', 'web'),
    path.join(meshRoot, 'results', 'web'),
    path.join(meshRoot, 'checkpoints', 'web'),
    path.join(meshRoot, 'tasks', 'web_to_wsl'),
    path.join(meshRoot, 'tasks', 'web_to_desktop'),
    path.join(meshRoot, 'tasks', 'wsl_to_web'),
    path.join(meshRoot, 'tasks', 'desktop_to_web'),
    path.join(meshRoot, 'audit'),
    webSystemRoot,
  ];

  await Promise.all(directories.map((dirPath) => fs.mkdir(dirPath, { recursive: true })));

  const checkpointPath = path.join(meshRoot, 'checkpoints', 'web', 'sync_state.json');
  if (!existsSync(checkpointPath)) {
    await writeJson(checkpointPath, {
      schema_version: '1.0',
      instance_id: 'web',
      last_export_scan: null,
      last_import_applied: null,
      last_task_poll: null,
      notes: 'Checkpoint scaffold created for the website ORB instance.',
    });
  }

  const meshManifestPath = path.join(meshRoot, 'manifests', 'orb_mesh_manifest.json');
  const meshManifest = await readJsonIfExists(meshManifestPath, {
    schema_version: '1.0',
    mesh_id: 'orb_dual_instance_mesh',
    created_at: utcNow(),
    instances: ['wsl', 'desktop'],
    shared_root: meshRoot,
    protocol: 'append_only_with_checkpoint',
    promotion_policy: 'curated_or_rule_based',
    audit_enabled: true,
  });
  const instances = Array.isArray((meshManifest as any).instances) ? (meshManifest as any).instances : [];
  if (!instances.includes('web')) {
    instances.push('web');
  }
  (meshManifest as any).instances = instances;
  (meshManifest as any).shared_root = meshRoot;
  await writeJson(meshManifestPath, meshManifest);

  const orbRegistryPath = path.join(meshRoot, 'manifests', 'orb_registry.json');
  const orbRegistry = await readJsonIfExists(orbRegistryPath, {
    schema_version: '1.0',
    created_at: utcNow(),
    orbs: [],
  });
  const orbs = Array.isArray((orbRegistry as any).orbs) ? (orbRegistry as any).orbs : [];
  const nextOrbs = orbs.filter((orb: any) => orb?.instance_id !== 'web');
  nextOrbs.push({
    instance_id: 'web',
    role: 'website_orb',
    root: siteRoot,
    system_root: webSystemRoot,
    exports_root: path.join(meshRoot, 'exports', 'web'),
    imports_root: path.join(meshRoot, 'imports', 'web'),
    checkpoint_root: path.join(meshRoot, 'checkpoints', 'web'),
  });
  (orbRegistry as any).orbs = nextOrbs;
  await writeJson(orbRegistryPath, orbRegistry);

  const webManifestPath = path.join(meshRoot, 'manifests', 'web_instance_manifest.json');
  await writeJson(webManifestPath, {
    schema_version: '1.0',
    instance_id: 'web',
    role: 'website_orb',
    root: siteRoot,
    system_root: webSystemRoot,
    mesh_exports: path.join(meshRoot, 'exports', 'web'),
    mesh_imports: path.join(meshRoot, 'imports', 'web'),
    capabilities: [
      'website_chat_interface',
      'server_side_r_drive_access',
      'server_qwen_tts',
      'server_kokoro_tts_fallback',
      'electron_dock_adapter',
      'mesh_publish_and_import',
    ],
    adapters: {
      electron: {
        id: 'electron_dock_adapter',
        root: path.join(siteRoot, 'Orb_Assistant', 'electron_dock_adapter'),
        role: 'dock_adapter',
        cognition_owner: 'cali_skg',
        voice_owner: 'qwen_primary_kokoro_fallback',
      },
    },
    system_partition: 'WSL_SITE',
  });
}

type OrbCommand = {
  action: 'query' | 'research' | 'speak' | 'status';
  prompt?: string;
  text?: string;
  query?: string;
  emotion?: string;
  context?: Record<string, unknown>;
  domains?: string[];
};

export async function runWebOrbCommand(command: OrbCommand) {
  await ensureWebMeshScaffold();

  const { orbRoot, webSystemRoot, cp3Root, pythonPath, bridgeScript, meshRoot } = getOrbPaths();
  await fs.mkdir(webSystemRoot, { recursive: true });

  return new Promise<any>((resolve, reject) => {
    const child = spawn(pythonPath, ['-u', bridgeScript], {
      cwd: orbRoot,
      env: {
        ...process.env,
        ORB_INSTANCE_ID: 'web',
        ORB_SYSTEM_ROOT: webSystemRoot,
        ORB_SHARED_MESH_ROOT: meshRoot,
        CP3_ROOT: cp3Root,
        ACP3_ROOT: cp3Root,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || stdout.trim() || `web_orb_bridge exited with code ${code}`));
        return;
      }

      try {
        resolve(JSON.parse(stdout.trim()));
      } catch (error) {
        reject(new Error(`Invalid web ORB response: ${stdout.trim()}`));
      }
    });

    child.stdin.write(JSON.stringify(command));
    child.stdin.end();
  });
}

export async function publishWebArtifact(
  type: MeshArtifactType,
  payload: JsonValue | Record<string, unknown>,
  metadata: Record<string, unknown> = {}
) {
  await ensureWebMeshScaffold();
  const { meshRoot } = getOrbPaths();
  const artifact = makeArtifactEnvelope(type, payload, metadata);
  const subdir = artifactDirectory(type);
  const baseDir =
    type === 'result'
      ? path.join(meshRoot, 'results', 'web')
      : type === 'state_snapshot'
        ? path.join(meshRoot, 'checkpoints', 'web')
        : subdir
          ? path.join(meshRoot, 'exports', 'web', subdir)
          : path.join(meshRoot, 'exports', 'web');
  const artifactPath = path.join(baseDir, `${artifact.artifact_id}.json`);

  await writeJson(artifactPath, artifact);
  await appendGlyphTrace(type, payload, metadata);
  await appendAudit('publish', {
    artifact_id: artifact.artifact_id,
    artifact_type: artifact.artifact_type,
    path: artifactPath,
  });
  return artifact;
}

export async function submitWebTask(
  targetOrb: string,
  taskType: string,
  payload: JsonValue | Record<string, unknown>,
  priority = 'normal'
) {
  await ensureWebMeshScaffold();
  const { meshRoot } = getOrbPaths();
  const normalizedTarget = targetOrb || 'broadcast';
  const task = makeArtifactEnvelope('task', payload, {
    target_orb: normalizedTarget,
    task_type: taskType,
    priority,
  });
  const queueName = normalizedTarget === 'broadcast' ? 'broadcast' : `web_to_${normalizedTarget}`;
  const taskPath = path.join(meshRoot, 'tasks', queueName, `${task.artifact_id}.json`);

  await writeJson(taskPath, task);
  await appendAudit('submit_task', {
    artifact_id: task.artifact_id,
    task_type: taskType,
    path: taskPath,
  });
  return task;
}

export async function listOtherOrbExports(otherOrbId: string): Promise<string[]> {
  await ensureWebMeshScaffold();
  const { meshRoot } = getOrbPaths();
  const rootDir = path.join(meshRoot, 'exports', otherOrbId);
  const files = await listJsonFiles(rootDir);
  return files.map((filePath) => path.relative(rootDir, filePath));
}

export async function importOtherOrbArtifact(otherOrbId: string, artifactRelativePath: string) {
  await ensureWebMeshScaffold();
  const { meshRoot } = getOrbPaths();
  const sourceRoot = path.join(meshRoot, 'exports', otherOrbId);
  const sourcePath = path.resolve(sourceRoot, artifactRelativePath);
  if (!sourcePath.startsWith(sourceRoot)) {
    throw new Error('Artifact path escapes source export root');
  }

  const targetPath = path.join(meshRoot, 'imports', 'web', otherOrbId, artifactRelativePath);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.copyFile(sourcePath, targetPath);

  const checkpoint = {
    schema_version: '1.0',
    imported_at: utcNow(),
    instance_id: 'web',
    source_orb: otherOrbId,
    artifact_path: artifactRelativePath,
    local_path: targetPath,
  };
  const checkpointPath = path.join(
    meshRoot,
    'checkpoints',
    'web',
    `import_${otherOrbId}_${path.basename(artifactRelativePath, '.json')}.json`
  );
  await writeJson(checkpointPath, checkpoint);
  await appendAudit('import', {
    source_orb: otherOrbId,
    artifact_path: artifactRelativePath,
    local_path: targetPath,
  });
  return checkpoint;
}

export async function getWebMeshStatus() {
  await ensureWebMeshScaffold();
  const { meshRoot, webSystemRoot } = getOrbPaths();

  return {
    enabled: true,
    instance_id: 'web',
    mesh_root: meshRoot,
    system_root: webSystemRoot,
    exports_root: path.join(meshRoot, 'exports', 'web'),
    imports_root: path.join(meshRoot, 'imports', 'web'),
    results_root: path.join(meshRoot, 'results', 'web'),
    checkpoints_root: path.join(meshRoot, 'checkpoints', 'web'),
    tasks_out: [path.join(meshRoot, 'tasks', 'web_to_wsl'), path.join(meshRoot, 'tasks', 'web_to_desktop')],
    tasks_in: [path.join(meshRoot, 'tasks', 'wsl_to_web'), path.join(meshRoot, 'tasks', 'desktop_to_web')],
  };
}
