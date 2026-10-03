import type { DesireUrge, OrbState, PageContext, SiteId, Vector2 } from "./types";

export class DesireEngine {
  private lastAction = 0;

  private boredomLevel = 0;

  constructor(private siteId: SiteId) {}

  generateUrge(state: OrbState, pageContext: PageContext): DesireUrge | null {
    const now = Date.now();

    if (now - this.lastAction > 10000) {
      this.boredomLevel = Math.min(1, this.boredomLevel + 0.1);
    }

    if (pageContext.hasForm && this.boredomLevel > 0.5) {
      this.lastAction = now;
      this.boredomLevel = 0;
      return {
        intent: "offering",
        intensity: 0.55,
        vector: this.getVectorTo(pageContext.formPosition),
      };
    }

    if (this.boredomLevel > 0.8 && Math.random() > 0.7) {
      this.lastAction = now;
      this.boredomLevel = 0;
      return {
        intent: "curious",
        intensity: 0.4,
        vector: this.getRandomExplorationVector(),
      };
    }

    if (pageContext.inactiveTime > 30000 && state.intent !== "alert") {
      return {
        intent: "alert",
        intensity: 0.3,
        vector: { x: 0, y: -2 },
      };
    }

    return null;
  }

  isBored(): boolean {
    return this.boredomLevel > 0.6;
  }

  private getVectorTo(target: Vector2): Vector2 {
    const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const pull = this.siteId === "spruked" ? 0.0012 : 0.001;

    return {
      x: (target.x - center.x) * pull,
      y: (target.y - center.y) * pull,
    };
  }

  private getRandomExplorationVector(): Vector2 {
    const angle = Math.random() * Math.PI * 2;
    return {
      x: Math.cos(angle) * 3,
      y: Math.sin(angle) * 3,
    };
  }
}
