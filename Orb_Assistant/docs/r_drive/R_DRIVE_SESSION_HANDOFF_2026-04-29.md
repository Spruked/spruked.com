# R DRIVE Session Handoff — 2026-04-29

## Session Close
- Date: 2026-04-29
- Local timezone: America/Chicago
- User stop condition: pause for night, resume tomorrow

## What Was Completed Today
1. Diagnosed CALI fallback vs hybrid path behavior.
2. Brought CALI API back online on `:8022` and confirmed `/api/orb` hybrid metadata flow when available.
3. Added Kokoro-local TTS fallback path handling in CALI route logic and verified voice payload path.
4. Fixed audio URL normalization in web API route so `data:` audio is preserved.
5. Rebuilt/restarted `spruked.com` and recovered white-screen incident.
6. Refactored ORB UI to voice-first bubble mode:
   - click orb to talk
   - browser speech recognition input
   - right-side response bubble text
   - removed traditional chat input box
   - added back-comms toggle area
7. Ran Redis verify-only audit (no config edits in audit pass):
   - Redis client wiring exists in CALI code
   - Redis service not reachable on `127.0.0.1:6379`
   - no Redis container visible in active docker process list

## Current Runtime State At Stop
- `spruked.com` Next.js server: serving on `:3001`
- CALI API: expected on `:8022` (hybrid path target)
- `/api/orb` substrate route now returns deterministic substrate brief path when CALI reachable
- Redis substrate snapshot currently reports `redis_connected: false` and connection refused to `127.0.0.1:6379`

## Open Items
1. Redis is not live on this host path currently used by CALI substrate reader.
2. Final UX polish still pending for full desktop parity.

## Priority Task For Tomorrow
### Multi-Orb Tray Docking in Desktop Orb Dock Station
Goal:
- support multiple ORBs docking to system tray and managed in desktop dock station

Required implementation direction:
1. Add multi-orb docking model (not single-orb only).
2. Add tray-aware orb registry/list in desktop dock station.
3. Add per-orb dock/undock controls and active status.
4. Preserve current voice-first bubble behavior in web orb while adding desktop docking orchestration.

## Resume Checklist (First 20 Minutes)
1. Confirm `:3001` web orb loads and voice-first bubble behavior is intact.
2. Confirm `:8022` CALI route health and hybrid metadata path.
3. Review desktop dock station code path and define multi-orb registry contract.
4. Implement tray multi-orb docking controls.
5. Run end-to-end test: dock multiple orbs, reopen, and verify status persistence.

## Scope Guardrail
- Do not revert orb-first voice bubble interaction model.
- Keep changes additive for desktop multi-orb docking.
- Preserve continuity logs in this `docs/r_drive` location.
