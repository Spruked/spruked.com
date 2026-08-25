import { BrowserContext } from "../bridges/BrowserContext";
import { DesireEngine } from "./DesireEngine";
import { IntentPredictor } from "./IntentPredictor";
import { OrbitalDynamics } from "./OrbitalDynamics";
import { PresenceVisuals } from "./PresenceVisuals";
import { SelfPruner } from "./SelfPruner";
import type {
  CursorIntent,
  MotionRecord,
  OrbSnapshot,
  OrbState,
  SiteId,
  Vector2,
  ViewportState,
} from "./types";

interface MotionGovernorOptions {
  siteId: SiteId;
  onState?: (snapshot: OrbSnapshot) => void;
}

export class MotionGovernor {
  private state: OrbState;

  private dynamics: OrbitalDynamics;

  private visuals: PresenceVisuals;

  private predictor: IntentPredictor;

  private desire: DesireEngine;

  private pruner: SelfPruner;

  private browser: BrowserContext;

  private motionHistory: MotionRecord[] = [];

  private behaviorPatterns = new Map<string, number>();

  private animationFrameId: number | null = null;

  private learningTimer: number | null = null;

  private desireTimer: number | null = null;

  private paused = false;

  private lastPrune = 0;

  private readonly pruneInterval = 30000;

  constructor(private options: MotionGovernorOptions) {
    this.state = {
      position: { x: window.innerWidth - 100, y: 100 },
      velocity: { x: 0, y: 0 },
      intent: "observing",
      energy: 0.3,
      cursorAffinity: 0,
      desireVector: { x: 0, y: 0 },
    };

    this.browser = new BrowserContext();
    this.predictor = new IntentPredictor();
    this.dynamics = new OrbitalDynamics(options.siteId);
    this.visuals = new PresenceVisuals(options.siteId);
    this.desire = new DesireEngine(options.siteId);
    this.pruner = new SelfPruner(options.siteId);
  }

  start(): void {
    this.stop();
    this.physicsLoop();
    this.learningTimer = window.setInterval(() => this.learningLoop(), 5000);
    this.desireTimer = window.setInterval(() => this.desireLoop(), 8000);
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.learningTimer !== null) {
      window.clearInterval(this.learningTimer);
      this.learningTimer = null;
    }
    if (this.desireTimer !== null) {
      window.clearInterval(this.desireTimer);
      this.desireTimer = null;
    }
  }

  destroy(): void {
    this.stop();
    this.browser.destroy();
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  getIntentColor(): string {
    return this.visuals.getIntentColor(this.state.intent);
  }

  private physicsLoop(): void {
    const tick = () => {
      if (!this.paused) {
        const cursor = this.browser.getCursorState();
        const viewport = this.browser.getViewport();

        const cursorIntent = this.predictor.analyze(cursor, this.motionHistory);
        const cursorVelocity = this.predictor.getCursorVelocity();

        const forces = this.dynamics.calculateForces(this.state, cursorIntent, viewport, cursorVelocity);

        this.integrate(forces, viewport);
        this.updateIntent(cursorIntent);

        this.motionHistory.push({
          t: Date.now(),
          pos: { ...this.state.position },
          intent: this.state.intent,
          energy: this.state.energy,
        });

        this.options.onState?.(this.snapshot());
      }

      this.animationFrameId = window.requestAnimationFrame(tick);
    };

    this.animationFrameId = window.requestAnimationFrame(tick);
  }

  private integrate(forces: Vector2, viewport: ViewportState): void {
    const dt = 0.016;
    this.state.velocity.x += forces.x * dt;
    this.state.velocity.y += forces.y * dt;

    this.state.velocity.x *= 0.95;
    this.state.velocity.y *= 0.95;

    this.state.position.x += this.state.velocity.x;
    this.state.position.y += this.state.velocity.y;

    const maxX = Math.max(20, viewport.width - 150);
    const maxY = Math.max(20, viewport.height - 150);
    this.state.position.x = Math.min(maxX, Math.max(20, this.state.position.x));
    this.state.position.y = Math.min(maxY, Math.max(20, this.state.position.y));
  }

  private updateIntent(cursorIntent: CursorIntent): void {
    if (cursorIntent.urgency > 0.8) {
      this.state.intent = "alert";
      this.state.energy = Math.min(1, this.state.energy + 0.08);
      return;
    }

    if (cursorIntent.reading) {
      this.state.intent = "observing";
      this.state.energy = Math.max(0.2, this.state.energy - 0.03);
      return;
    }

    if (this.state.energy > 0.7) {
      this.state.intent = "offering";
      this.state.energy = Math.max(0.45, this.state.energy - 0.01);
      return;
    }

    if (this.desire.isBored()) {
      this.state.intent = "curious";
      this.state.energy = Math.min(0.7, this.state.energy + 0.02);
      return;
    }

    this.state.intent = "retreating";
    this.state.energy = Math.max(0.25, this.state.energy - 0.01);
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
    const urge = this.desire.generateUrge(this.state, this.browser.getPageContext());
    if (!urge) return;

    this.state.intent = urge.intent;
    this.state.energy = Math.min(1, this.state.energy + urge.intensity);
    this.state.desireVector = { ...urge.vector };
    this.dynamics.injectDesireVector(urge.vector);

    const key = `urge:${urge.intent}`;
    this.behaviorPatterns.set(key, (this.behaviorPatterns.get(key) || 0) + urge.intensity);
  }

  private snapshot(): OrbSnapshot {
    return {
      position: { ...this.state.position },
      velocity: { ...this.state.velocity },
      intent: this.state.intent,
      energy: this.state.energy,
      isIdle: this.state.intent === "observing" && this.state.energy < 0.4,
    };
  }
}
