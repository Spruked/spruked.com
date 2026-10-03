import type { CursorIntent, CursorSample, MotionRecord, Vector2 } from './types';

export class IntentPredictor {
  private cursorHistory: CursorSample[] = [];

  private readonly historyLimit = 50;

  private patterns = new Map<string, number>();

  analyze(cursor: { x: number; y: number }, _motionHistory: MotionRecord[]): CursorIntent {
    const now = Date.now();
    this.cursorHistory.push({ t: now, x: cursor.x, y: cursor.y });
    if (this.cursorHistory.length > this.historyLimit) {
      this.cursorHistory.shift();
    }

    const velocity = this.getCursorVelocity();
    const acceleration = this.getCursorAcceleration();

    return {
      direction: velocity,
      speed: Math.hypot(velocity.x, velocity.y),
      reading: this.detectReadingPattern(),
      searching: this.detectSearchingPattern(),
      urgency: this.calculateUrgency(acceleration),
    };
  }

  learn(): void {
    const recent = this.cursorHistory.slice(-20);
    if (recent.length < 10) return;

    let directionChanges = 0;
    for (let idx = 2; idx < recent.length; idx += 1) {
      const d1 = { x: recent[idx - 1].x - recent[idx - 2].x, y: recent[idx - 1].y - recent[idx - 2].y };
      const d2 = { x: recent[idx].x - recent[idx - 1].x, y: recent[idx].y - recent[idx - 1].y };
      const dot = d1.x * d2.x + d1.y * d2.y;
      if (dot < 0) directionChanges += 1;
    }

    if (directionChanges > 5) {
      const key = 'confusion_detected';
      this.patterns.set(key, (this.patterns.get(key) || 0) + 1);
    }

    if (this.patterns.size > 100) {
      const low = Array.from(this.patterns.entries()).sort((a, b) => a[1] - b[1]).slice(0, 20);
      low.forEach(([key]) => this.patterns.delete(key));
    }
  }

  getCursorVelocity(): Vector2 {
    if (this.cursorHistory.length < 2) return { x: 0, y: 0 };
    const last = this.cursorHistory[this.cursorHistory.length - 1];
    const prev = this.cursorHistory[this.cursorHistory.length - 2];
    const dt = last.t - prev.t;
    if (dt <= 0) return { x: 0, y: 0 };

    return {
      x: ((last.x - prev.x) / dt) * 16,
      y: ((last.y - prev.y) / dt) * 16,
    };
  }

  private getCursorAcceleration(): number {
    if (this.cursorHistory.length < 3) return 0;
    const v1 = this.getVelocityAt(-2);
    const v2 = this.getVelocityAt(-1);
    const last = this.cursorHistory[this.cursorHistory.length - 1];
    const prev = this.cursorHistory[this.cursorHistory.length - 2];
    const dt = Math.max(1, last.t - prev.t);

    return Math.abs(Math.hypot(v2.x, v2.y) - Math.hypot(v1.x, v1.y)) / dt;
  }

  private getVelocityAt(offset: number): Vector2 {
    const idx = this.cursorHistory.length + offset;
    if (idx < 1) return { x: 0, y: 0 };

    const current = this.cursorHistory[idx];
    const prev = this.cursorHistory[idx - 1];
    const dt = current.t - prev.t;
    if (dt <= 0) return { x: 0, y: 0 };

    return {
      x: (current.x - prev.x) / dt,
      y: (current.y - prev.y) / dt,
    };
  }

  private detectReadingPattern(): boolean {
    const vel = this.getCursorVelocity();
    const speed = Math.hypot(vel.x, vel.y);
    return speed < 2 && Math.abs(vel.y) > Math.abs(vel.x);
  }

  private detectSearchingPattern(): boolean {
    const vel = this.getCursorVelocity();
    return Math.abs(vel.x) > 10 && Math.abs(vel.y) < 5;
  }

  private calculateUrgency(acceleration: number): number {
    return Math.min(1, acceleration / 5);
  }
}
