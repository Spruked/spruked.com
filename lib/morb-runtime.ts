/**
 * M.O.R.B.S. — Micro-ORB Runtime
 *
 * A deliberately ephemeral helper for short-lived pointer/retrieval tasks.
 * It is not CALI cognition, does not own a persona, and never persists to a
 * vault. Callers provide the substrate adapter explicitly.
 */

export type MorbStatus = 'pending' | 'ready' | 'running' | 'success' | 'fail' | 'pruned';

export type MorbTask = {
  topic: string;
  scope?: string;
  depth?: number;
  constraints?: Record<string, unknown>;
  expectedSchema?: { properties?: Record<string, unknown> };
  vaultLayers?: string[];
};

export type MorbFillables = {
  taskFields: MorbTask;
  assignedApi?: string;
  assignedMesh?: string;
  transformerLogic?: string;
};

export type MorbStructuredResult = {
  summary: string;
  findings: unknown[];
  sources: unknown[];
  confidenceScore: number;
  provenance: {
    apiUsed: string;
    meshNode: string;
    vaultLayers: string[];
  };
  [key: string]: unknown;
};

export type MorbExecution = {
  morbId: string;
  status: 'pass' | 'fail';
  structuredOutput?: MorbStructuredResult;
  confidence?: number;
  latencyMs: number;
  error?: string;
};

export type MorbStateSnapshot = {
  morbId: string;
  swarmId: string;
  status: MorbStatus;
  latencyMs: number;
  hasFillables: boolean;
  hasResult: boolean;
  edgeCount: number;
};

export type MorbSubstrate = (plan: {
  query: string;
  task: MorbTask;
  reasoningEdges: Array<{ from: string; to: string; type: string }>;
}) => Promise<Partial<MorbStructuredResult>>;

export class MicroOrb {
  readonly morbId: string;
  readonly swarmId: string;
  private status: MorbStatus = 'pending';
  private fillables: MorbFillables | null = null;
  private reasoningEdges: Array<{ from: string; to: string; type: string }> = [];
  private result: MorbStructuredResult | null = null;
  private error: string | null = null;
  private latencyMs = 0;

  constructor(morbId: string, swarmId: string) {
    this.morbId = morbId;
    this.swarmId = swarmId;
  }

  inject(fillables: MorbFillables) {
    if (this.status === 'pruned') throw new Error('Cannot inject a pruned MORB');
    this.fillables = { ...fillables, taskFields: { ...fillables.taskFields } };
    this.status = 'ready';
  }

  async execute(substrate: MorbSubstrate): Promise<MorbExecution> {
    const started = Date.now();
    if (!this.fillables) throw new Error('MORB must be injected before execution');
    this.status = 'running';

    try {
      const task = this.fillables.taskFields;
      const taskId = `${this.morbId}-task`;
      const queryId = `${this.morbId}-query`;
      const apiId = `${this.morbId}-api`;
      this.reasoningEdges = [
        { from: taskId, to: queryId, type: 'generates' },
        { from: queryId, to: apiId, type: 'targets' },
      ];
      const query = `[${this.fillables.transformerLogic || 'research_query'}] ${task.topic} | scope:${task.scope || 'standard'} | depth:${task.depth || 2}`;
      const raw = await substrate({ query, task, reasoningEdges: this.reasoningEdges });
      const structured: MorbStructuredResult = {
        summary: raw.summary || `Research on: ${task.topic}`,
        findings: raw.findings || [],
        sources: raw.sources || [],
        confidenceScore: raw.confidenceScore ?? 0.5,
        provenance: raw.provenance || {
          apiUsed: this.fillables.assignedApi || 'explicit-adapter',
          meshNode: this.fillables.assignedMesh || 'explicit-adapter',
          vaultLayers: task.vaultLayers || [],
        },
        ...raw,
      };
      for (const key of Object.keys(task.expectedSchema?.properties || {})) {
        if (!(key in structured)) structured[key] = null;
      }
      this.result = structured;
      this.status = 'success';
      this.latencyMs = Date.now() - started;
      return { morbId: this.morbId, status: 'pass', structuredOutput: structured, confidence: structured.confidenceScore, latencyMs: this.latencyMs };
    } catch (cause) {
      this.error = cause instanceof Error ? cause.message : String(cause);
      this.status = 'fail';
      this.latencyMs = Date.now() - started;
      return { morbId: this.morbId, status: 'fail', error: this.error, latencyMs: this.latencyMs };
    }
  }

  prune() {
    this.fillables = null;
    this.reasoningEdges = [];
    this.result = null;
    this.error = null;
    this.status = 'pruned';
    return true;
  }

  getState(): MorbStateSnapshot {
    return {
      morbId: this.morbId,
      swarmId: this.swarmId,
      status: this.status,
      latencyMs: this.latencyMs,
      hasFillables: this.fillables !== null,
      hasResult: this.result !== null,
      edgeCount: this.reasoningEdges.length,
    };
  }
}

export class MorbFactory {
  private readonly pool: MicroOrb[] = [];
  private spawned = 0;
  private recycled = 0;

  create(swarmId: string) {
    const morb = this.pool.pop() || new MicroOrb(`${swarmId}-morb-${String(this.spawned).padStart(4, '0')}`, swarmId);
    if (morb.getState().status === 'pruned') this.recycled += 1;
    this.spawned += 1;
    return morb;
  }

  recycle(morb: MicroOrb) {
    if (!morb.prune()) return false;
    this.pool.push(morb);
    return true;
  }

  getStats() {
    return { spawned: this.spawned, recycled: this.recycled, poolSize: this.pool.length, efficiency: this.recycled / Math.max(this.spawned, 1) };
  }
}
