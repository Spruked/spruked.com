import { MotionGovernor } from '../../core/MotionGovernor';
import type { OrbSnapshot } from '../../core/types';

export class TrueMarkOrb {
  private governor: MotionGovernor;

  constructor(onState?: (snapshot: OrbSnapshot) => void) {
    this.governor = new MotionGovernor({
      siteId: 'truemark',
      onState,
    });
  }

  start(): void {
    this.governor.start();
  }

  stop(): void {
    this.governor.stop();
  }

  destroy(): void {
    this.governor.destroy();
  }
}
