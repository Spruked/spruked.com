export type SiteId = 'spruked' | 'truemark';

export type OrbIntent = 'observing' | 'offering' | 'retreating' | 'curious' | 'alert';

export interface Vector2 {
  x: number;
  y: number;
}

export interface OrbState {
  position: Vector2;
  velocity: Vector2;
  intent: OrbIntent;
  energy: number;
  cursorAffinity: number;
  desireVector: Vector2;
}

export interface CursorSample {
  t: number;
  x: number;
  y: number;
}

export interface CursorIntent {
  direction: Vector2;
  speed: number;
  reading: boolean;
  searching: boolean;
  urgency: number;
}

export interface ViewportState {
  width: number;
  height: number;
}

export interface PageContext {
  hasForm: boolean;
  formPosition: Vector2;
  inactiveTime: number;
  lastActivity: number;
}

export interface OrbSnapshot {
  position: Vector2;
  velocity: Vector2;
  intent: OrbIntent;
  energy: number;
  isIdle: boolean;
}

export interface MotionRecord {
  t: number;
  pos: Vector2;
  intent: OrbIntent;
  energy: number;
}

export interface DesireUrge {
  intent: OrbIntent;
  intensity: number;
  vector: Vector2;
}
