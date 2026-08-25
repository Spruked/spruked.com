import type { CursorIntent, OrbState, SiteId, Vector2 } from '../core/types';

interface PredictResponse extends Vector2 {
  confidence?: number;
}

export class KayGeeHybridAdapter {
  private endpoint = 'http://127.0.0.1:7000/kaygee/predict';

  async predictOptimalPosition(cursorIntent: CursorIntent, state: OrbState, siteId: SiteId): Promise<PredictResponse> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'orbital_position',
          cursor: cursorIntent,
          current: state,
          site: siteId,
        }),
      });

      if (!response.ok) {
        throw new Error(`KayGee hybrid request failed (${response.status})`);
      }

      const data = (await response.json()) as Partial<PredictResponse>;
      if (typeof data?.x !== 'number' || typeof data?.y !== 'number') {
        throw new Error('KayGee hybrid response missing coordinates');
      }

      return {
        x: data.x,
        y: data.y,
        confidence: data.confidence,
      };
    } catch (_error) {
      return { x: state.position.x, y: state.position.y, confidence: 0 };
    }
  }
}
