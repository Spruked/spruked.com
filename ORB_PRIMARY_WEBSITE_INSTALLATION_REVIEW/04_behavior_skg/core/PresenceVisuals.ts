import type { OrbIntent, OrbState, SiteId } from "./types";

type IntentColorMap = Record<OrbIntent, string>;

const SPRUKED_COLORS: IntentColorMap = {
  observing: "#4ECDC4",
  offering: "#FFE66D",
  retreating: "#95E1D3",
  curious: "#F38181",
  alert: "#FF6B6B",
};

const TRUEMARK_COLORS: IntentColorMap = {
  observing: "#667eea",
  offering: "#f093fb",
  retreating: "#4facfe",
  curious: "#43e97b",
  alert: "#fa709a",
};

export class PresenceVisuals {
  private colorMap: IntentColorMap;

  constructor(siteId: SiteId) {
    this.colorMap = siteId === "spruked" ? SPRUKED_COLORS : TRUEMARK_COLORS;
  }

  getIntentColor(intent: OrbIntent): string {
    return this.colorMap[intent];
  }

  getGlowStyle(state: OrbState): { color: string; strength: number } {
    return {
      color: this.getIntentColor(state.intent),
      strength: 0.4 + state.energy * 0.6,
    };
  }
}
