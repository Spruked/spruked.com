import type { MotionRecord } from "./types";

export class SelfPruner {
  constructor(private siteId: string) {}

  pruneMotionHistory(history: MotionRecord[]): MotionRecord[] {
    if (history.length < 100) return history;

    const recent = history.slice(-50);
    const significant = history
      .filter((entry, idx) => {
        if (idx === 0) return false;
        const prev = history[idx - 1];
        return entry.intent !== prev.intent || this.distance(entry.pos, prev.pos) > 100;
      })
      .slice(-30);

    const merged = [...significant, ...recent].sort((a, b) => a.t - b.t);
    const deduped = merged.filter((item, index, all) => index === all.findIndex((ref) => ref.t === item.t));

    this.persistHistory(deduped);
    return deduped;
  }

  pruneBehaviorPatterns(patterns: Map<string, number>): Map<string, number> {
    const next = new Map(patterns);
    next.forEach((weight, key) => {
      const decayed = weight * 0.95;
      if (decayed < 0.1) {
        next.delete(key);
      } else {
        next.set(key, decayed);
      }
    });

    this.persistPatterns(next);
    return next;
  }

  private persistHistory(history: MotionRecord[]): void {
    if (typeof window === "undefined") return;
    const key = `orbital_behavior:${this.siteId}:motion_memory`;
    const serialized = history.map((row) => JSON.stringify(row)).join("\n");
    window.localStorage.setItem(key, serialized);
  }

  private persistPatterns(patterns: Map<string, number>): void {
    if (typeof window === "undefined") return;
    const key = `orbital_behavior:${this.siteId}:behavior_patterns`;
    const asObject: Record<string, number> = {};
    patterns.forEach((value, pattern) => {
      asObject[pattern] = value;
    });
    window.localStorage.setItem(key, JSON.stringify(asObject));
  }

  private distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
}
