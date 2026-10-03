import { BrowserContext } from './orbital_behavior_skg/bridges/BrowserContext';
import { DesireEngine } from './orbital_behavior_skg/core/DesireEngine';
import { IntentPredictor } from './orbital_behavior_skg/core/IntentPredictor';
import { OrbitalDynamics } from './orbital_behavior_skg/core/OrbitalDynamics';
import { PresenceVisuals } from './orbital_behavior_skg/core/PresenceVisuals';
import { SelfPruner } from './orbital_behavior_skg/core/SelfPruner';
import { Lidar2DMappingCoordinateCache } from './lidar/Lidar2DMappingCoordinateCache';
import type {
  CursorIntent,
  MotionRecord,
  OrbSnapshot,
  OrbState,
  Vector2,
  ViewportState,
} from './orbital_behavior_skg/core/types';
import type { LidarPointerRecord, LidarViewportCoordinate } from './lidar/Lidar2DMapping.types';

export type MotionAuthority = 'ambient' | 'hold' | 'guided';

export type MotionRuntimeSnapshot = {
  position: Vector2;
  authority: MotionAuthority;
  behavior: OrbSnapshot;
};

type PositionListener = (position: Vector2) => void;
type SnapshotListener = (snapshot: MotionRuntimeSnapshot) => void;

const ORB_SIZE = 206;
const ORB_HALO = Math.ceil(ORB_SIZE * 0.3);
const VIEWPORT_PADDING = 20;
const GUIDANCE_GAP = 22;

/** The single physical motion authority for the browser ORB. */
export class MotionRuntime {
  private authority: MotionAuthority = 'ambient';
  private readonly state: OrbState;
  private readonly browser: BrowserContext;
  private readonly predictor: IntentPredictor;
  private readonly dynamics: OrbitalDynamics;
  private readonly visuals: PresenceVisuals;
  private readonly desire: DesireEngine;
  private readonly pruner: SelfPruner;
  private readonly lidar = Lidar2DMappingCoordinateCache.getInstance();
  private position: Vector2;
  private motionHistory: MotionRecord[] = [];
  private behaviorPatterns = new Map<string, number>();
  private animationFrameId: number | null = null;
  private learningTimer: number | null = null;
  private desireTimer: number | null = null;
  private lastPrune = 0;
  private readonly pruneInterval = 30000;

  constructor(
    private readonly onPosition: PositionListener,
    private readonly onSnapshot?: SnapshotListener,
  ) {
    this.state = {
      position: { x: typeof window === 'undefined' ? 0 : window.innerWidth - 100, y: 100 },
      velocity: { x: 0, y: 0 },
      intent: 'observing',
      energy: 0.3,
      cursorAffinity: 0,
      desireVector: { x: 0, y: 0 },
    };
    this.position = this.clamp(this.state.position);
    this.browser = new BrowserContext();
    this.predictor = new IntentPredictor();
    this.dynamics = new OrbitalDynamics('spruked');
    this.visuals = new PresenceVisuals('spruked');
    this.desire = new DesireEngine('spruked');
    this.pruner = new SelfPruner('spruked');
  }

  start(): void {
    this.stop();
    this.physicsLoop();
    this.learningTimer = window.setInterval(() => this.learningLoop(), 5000);
    this.desireTimer = window.setInterval(() => this.desireLoop(), 8000);
    this.commit(this.position);
  }

  stop(): void {
    if (this.animationFrameId !== null) window.cancelAnimationFrame(this.animationFrameId);
    if (this.learningTimer !== null) window.clearInterval(this.learningTimer);
    if (this.desireTimer !== null) window.clearInterval(this.desireTimer);
    this.animationFrameId = null;
    this.learningTimer = null;
    this.desireTimer = null;
  }

  destroy(): void {
    this.stop();
    this.browser.destroy();
  }

  wake(): void {
    if (this.authority === 'ambient') this.startPhysicsIfNeeded();
  }

  setHold(hold: boolean): void {
    if (this.authority === 'guided') return;
    this.authority = hold ? 'hold' : 'ambient';
    if (!hold) this.startPhysicsIfNeeded();
    this.emit();
  }

  setGuidedTarget(rect: Pick<DOMRect, 'top' | 'left' | 'width' | 'height'>): void {
    this.authority = 'guided';
    const candidates = [
      { x: rect.left + rect.width + GUIDANCE_GAP, y: rect.top + rect.height / 2 - ORB_SIZE / 2 },
      { x: rect.left - ORB_SIZE - GUIDANCE_GAP, y: rect.top + rect.height / 2 - ORB_SIZE / 2 },
      { x: rect.left + rect.width / 2 - ORB_SIZE / 2, y: rect.top - ORB_SIZE - GUIDANCE_GAP },
      { x: rect.left + rect.width / 2 - ORB_SIZE / 2, y: rect.top + rect.height + GUIDANCE_GAP },
    ];
    const next = candidates
      .map((candidate) => this.clampViewport(candidate))
      .sort((a, b) => this.overlap(a, rect) - this.overlap(b, rect))[0];
    this.state.velocity = { x: 0, y: 0 };
    this.commit(next || this.position);
    this.emit();
  }

  clearGuidance(hold = false): void {
    if (this.authority !== 'guided') return;
    this.authority = hold ? 'hold' : 'ambient';
    if (!hold) this.startPhysicsIfNeeded();
    this.emit();
  }

  handleCursor(x: number, y: number): void {
    if (this.authority !== 'ambient') return;
    const center = { x: this.position.x + ORB_SIZE / 2, y: this.position.y + ORB_SIZE / 2 };
    const dx = center.x - x;
    const dy = center.y - y;
    const distance = Math.hypot(dx, dy);
    if (distance > 104) return;
    const safeDistance = Math.max(distance, 1);
    this.commit(this.clamp({
      x: center.x + (dx / safeDistance) * 28 - ORB_SIZE / 2,
      y: center.y + (dy / safeDistance) * 28 - ORB_SIZE / 2,
    }));
  }

  handleResize(): void {
    this.commit(this.clamp(this.position));
  }

  loadSpatialTargets(records: LidarPointerRecord[]): void {
    this.lidar.load(records);
  }

  startSpatialAudit(): void {
    this.lidar.startDriftAudit();
  }

  stopSpatialAudit(): void {
    this.lidar.stopDriftAudit();
  }

  getSpatialCoordinate(targetId: string): LidarViewportCoordinate | null {
    return this.lidar.get(targetId);
  }

  getIntentColor(): string {
    return this.visuals.getIntentColor(this.state.intent);
  }

  private startPhysicsIfNeeded(): void {
    if (this.animationFrameId === null) this.physicsLoop();
  }

  private physicsLoop(): void {
    const tick = () => {
      if (this.authority === 'ambient') {
        const cursor = this.browser.getCursorState();
        const viewport = this.browser.getViewport();
        const cursorIntent = this.predictor.analyze(cursor, this.motionHistory);
        const cursorVelocity = this.predictor.getCursorVelocity();
        const forces = this.dynamics.calculateForces(this.state, cursorIntent, viewport, cursorVelocity);
        this.integrate(forces, viewport);
        this.updateIntent(cursorIntent);
        this.commit(this.state.position);
        this.motionHistory.push({
          t: Date.now(),
          pos: { ...this.state.position },
          intent: this.state.intent,
          energy: this.state.energy,
        });
        this.emit();
      }
      this.animationFrameId = window.requestAnimationFrame(tick);
    };
    this.animationFrameId = window.requestAnimationFrame(tick);
  }

  private integrate(forces: Vector2, viewport: ViewportState): void {
    const dt = 0.016;
    this.state.velocity.x = (this.state.velocity.x + forces.x * dt) * 0.95;
    this.state.velocity.y = (this.state.velocity.y + forces.y * dt) * 0.95;
    this.state.position.x += this.state.velocity.x;
    this.state.position.y += this.state.velocity.y;
    const maxX = Math.max(20, viewport.width - 150);
    const maxY = Math.max(20, viewport.height - 150);
    this.state.position.x = Math.min(maxX, Math.max(20, this.state.position.x));
    this.state.position.y = Math.min(maxY, Math.max(20, this.state.position.y));
  }

  private updateIntent(cursorIntent: CursorIntent): void {
    if (cursorIntent.urgency > 0.8) {
      this.state.intent = 'alert';
      this.state.energy = Math.min(1, this.state.energy + 0.08);
    } else if (cursorIntent.reading) {
      this.state.intent = 'observing';
      this.state.energy = Math.max(0.2, this.state.energy - 0.03);
    } else if (this.state.energy > 0.7) {
      this.state.intent = 'offering';
      this.state.energy = Math.max(0.45, this.state.energy - 0.01);
    } else if (this.desire.isBored()) {
      this.state.intent = 'curious';
      this.state.energy = Math.min(0.7, this.state.energy + 0.02);
    } else {
      this.state.intent = 'retreating';
      this.state.energy = Math.max(0.25, this.state.energy - 0.01);
    }
  }

  private learningLoop(): void {
    this.predictor.learn();
    this.behaviorPatterns = this.pruner.pruneBehaviorPatterns(this.behaviorPatterns);
    if (Date.now() - this.lastPrune > this.pruneInterval) {
      this.motionHistory = this.pruner.pruneMotionHistory(this.motionHistory);
      this.lastPrune = Date.now();
    }
  }

  private desireLoop(): void {
    if (this.authority !== 'ambient') return;
    const urge = this.desire.generateUrge(this.state, this.browser.getPageContext());
    if (!urge) return;
    this.state.intent = urge.intent;
    this.state.energy = Math.min(1, this.state.energy + urge.intensity);
    this.state.desireVector = { ...urge.vector };
    this.dynamics.injectDesireVector(urge.vector);
    const key = `urge:${urge.intent}`;
    this.behaviorPatterns.set(key, (this.behaviorPatterns.get(key) || 0) + urge.intensity);
  }

  private commit(position: Vector2): void {
    this.position = this.clamp(position);
    this.state.position = { ...this.position };
    this.onPosition({ ...this.position });
  }

  private emit(): void {
    this.onSnapshot?.({
      position: { ...this.position },
      authority: this.authority,
      behavior: {
        position: { ...this.state.position },
        velocity: { ...this.state.velocity },
        intent: this.state.intent,
        energy: this.state.energy,
        isIdle: this.state.intent === 'observing' && this.state.energy < 0.4,
      },
    });
  }

  private clamp(position: Vector2): Vector2 {
    if (typeof window === 'undefined') return position;
    const minX = VIEWPORT_PADDING + ORB_HALO;
    const minY = VIEWPORT_PADDING + ORB_HALO;
    const maxX = Math.max(minX, window.innerWidth - ORB_SIZE - VIEWPORT_PADDING - ORB_HALO);
    const maxY = Math.max(minY, Math.floor(window.innerHeight * 0.86) - ORB_SIZE - VIEWPORT_PADDING - ORB_HALO);
    return { x: Math.min(maxX, Math.max(minX, position.x)), y: Math.min(maxY, Math.max(minY, position.y)) };
  }

  private clampViewport(position: Vector2): Vector2 {
    if (typeof window === 'undefined') return position;
    return {
      x: Math.min(Math.max(0, window.innerWidth - ORB_SIZE), Math.max(0, position.x)),
      y: Math.min(Math.max(0, window.innerHeight - ORB_SIZE), Math.max(0, position.y)),
    };
  }

  private overlap(position: Vector2, rect: Pick<DOMRect, 'top' | 'left' | 'width' | 'height'>): number {
    const horizontal = Math.max(0, Math.min(position.x + ORB_SIZE, rect.left + rect.width) - Math.max(position.x, rect.left));
    const vertical = Math.max(0, Math.min(position.y + ORB_SIZE, rect.top + rect.height) - Math.max(position.y, rect.top));
    return horizontal * vertical;
  }
}
