export { MotionGovernor } from './core/MotionGovernor';
export { OrbitalDynamics } from './core/OrbitalDynamics';
export { PresenceVisuals } from './core/PresenceVisuals';
export { IntentPredictor } from './core/IntentPredictor';
export { DesireEngine } from './core/DesireEngine';
export { SelfPruner } from './core/SelfPruner';
export { BrowserContext } from './bridges/BrowserContext';
export { KayGeeHybridAdapter } from './bridges/KayGeeHybridAdapter';
export { QwenIntentPlugin } from './bridges/QwenIntentPlugin';
export { SprukedOrb } from './deployments/spruked/SprukedOrb';
export { TrueMarkOrb } from './deployments/truemark/TrueMarkOrb';
export type {
  CursorIntent,
  CursorSample,
  DesireUrge,
  MotionRecord,
  OrbIntent,
  OrbSnapshot,
  OrbState,
  PageContext,
  SiteId,
  Vector2,
  ViewportState,
} from './core/types';
