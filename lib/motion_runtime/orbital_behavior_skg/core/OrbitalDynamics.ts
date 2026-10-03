import type { CursorIntent, OrbState, SiteId, Vector2, ViewportState } from "./types";

interface NearbyRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SiteConfig {
  primaryZone: "left" | "right";
  avoidanceRadius: number;
}

export class OrbitalDynamics {
  private config: SiteConfig;

  private desireVector: Vector2 = { x: 0, y: 0 };

  constructor(siteId: SiteId) {
    this.config = siteId === "spruked"
      ? { primaryZone: "right", avoidanceRadius: 120 }
      : { primaryZone: "left", avoidanceRadius: 150 };
  }

  calculateForces(
    state: OrbState,
    cursorIntent: CursorIntent,
    viewport: ViewportState,
    cursorVelocity: Vector2,
  ): Vector2 {
    const forces: Vector2 = { x: 0, y: 0 };

    const centerX = viewport.width / 2;
    const centerY = viewport.height / 2;
    const dx = state.position.x - centerX;
    const dy = state.position.y - centerY;

    const angle = Math.atan2(dy, dx) + 0.002;
    const orbitalRadius = Math.min(viewport.width, viewport.height) * 0.35;

    const idealX = centerX + Math.cos(angle) * orbitalRadius;
    const idealY = centerY + Math.sin(angle) * orbitalRadius;

    forces.x += (idealX - state.position.x) * 0.01;
    forces.y += (idealY - state.position.y) * 0.01;

    const predictedCursorX = cursorIntent.direction.x * 100;
    const predictedCursorY = cursorIntent.direction.y * 100;

    const awayX = state.position.x - predictedCursorX;
    const awayY = state.position.y - predictedCursorY;
    const pathDistance = Math.max(1, Math.hypot(awayX, awayY));
    if (pathDistance < this.config.avoidanceRadius) {
      forces.x += (awayX / pathDistance) * 0.5;
      forces.y += (awayY / pathDistance) * 0.5;
    }

    const nearby = this.getNearbyElements(state.position);
    nearby.forEach((rect) => {
      const centerRectX = rect.x + rect.width / 2;
      const centerRectY = rect.y + rect.height / 2;
      const toX = state.position.x - centerRectX;
      const toY = state.position.y - centerRectY;
      const distance = Math.max(1, Math.hypot(toX, toY));
      if (distance < 100) {
        forces.x += (toX / distance) * 2;
        forces.y += (toY / distance) * 2;
      }
    });

    forces.x += this.desireVector.x;
    forces.y += this.desireVector.y;

    this.desireVector.x *= 0.9;
    this.desireVector.y *= 0.9;

    const sideBias = this.config.primaryZone === "right" ? 1 : -1;
    forces.x += sideBias * 0.04;

    forces.x -= cursorVelocity.x * 0.002;
    forces.y -= cursorVelocity.y * 0.002;

    return forces;
  }

  injectDesireVector(vector: Vector2): void {
    this.desireVector = { ...vector };
  }

  private getNearbyElements(position: Vector2): NearbyRect[] {
    if (typeof document === "undefined") return [];

    const nodes = document.querySelectorAll("button, input, textarea, select, a, [role=\"button\"]");
    return Array.from(nodes)
      .map((node) => node.getBoundingClientRect())
      .filter((rect) => {
        const dx = position.x - (rect.x + rect.width / 2);
        const dy = position.y - (rect.y + rect.height / 2);
        return Math.hypot(dx, dy) < 200;
      })
      .map((rect) => ({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      }));
  }
}
