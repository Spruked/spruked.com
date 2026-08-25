# Website Dev Log - 2026-06-12

## ORB Voice/Bridge Work
- Fixed stale server-side ORB Python default by resolving a valid Python path in `lib/orb-server.ts`.
- Added `ORB_PYTHON_PATH=/home/bryan/venv312/bin/python` locally.
- Added `ORB_REALTIME_TTS_*` precedence in `app/api/orb/route.ts`.
- Preserved `QWEN_TTS_*` settings for Dandy/show-quality generation.
- Disabled intentional browser speech fallback in `Orb_Assistant/api/OrbService.js`.
- Added `/api/orb/audio` route, guarded so it only serves actual WAV files from voice cache.

## Important Finding
Native CALISKG `speak()` currently writes metadata JSON with an intended WAV path but does not synthesize a playable WAV. Treat server voice as incomplete until a real streaming TTS service is connected.

## Verification
- Targeted lint passed for `app/api/orb/route.ts`.
- `node --check Orb_Assistant/api/OrbService.js` passed.
- Full production builds passed during the session before the final cleanup/logging pass.

## Cleanup Policy
This repo has a heavily dirty worktree with many pre-existing changes. Cleanup should avoid reverting or deleting user work. Safe cleanup only:
- remove generated Python cache files,
- ignore runtime logs/scratch files,
- document untracked artifacts rather than moving them blindly.
