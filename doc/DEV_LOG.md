# Spruked Website Dev Log

## 2026-09-01

- Restored local-only Website ORB runtime under Next dev server port `3001`.
- Fixed cross-shell dev command by changing `npm run dev` to `next dev -p 3001`.
- Preserved the single response-generation path through CALI cognition on `http://127.0.0.1:8022`.
- Kept local llama.cpp as CALI's LLM provider on `http://127.0.0.1:8080`; no OpenAI/API credit usage.
- Removed browser speech synthesis. Server-side Kokoro TTS is authoritative through `http://127.0.0.1:12000/api/kokoro/tts`; Qwen3-TTS remains the configured backup contract at `http://127.0.0.1:9880/speak`.
- Added non-blocking Kokoro voice warm-up from the mounted Website ORB startup path.
- Added local Faster-Whisper STT service under `/home/bryan/substrate/stt/faster_whisper` and the stable website proxy `/api/orb/stt`.
- Verified STT with local Kokoro-generated WAV input: faster-whisper returned `Take me to check out.` through both the direct service and website proxy.
- Reintroduced website voice input through `getUserMedia` + `MediaRecorder`; no Web Speech `SpeechRecognition` or `speechSynthesis` APIs are used.
- Rebuilt Spruked Website ORB visual presence around `/public/assets/redorbbluecenter1600.png`, with enlarged rendered size, blue core movement, green speaking pulse at active opacity, glow, pointer cursor, and orbiting ring nodes.
- Added Spruked pointer runtime registry, live DOM target verification, route-aware navigation, and MORB-style highlight overlay for key site targets including home, products, cart, checkout, waitlist, contact, and product cards.
- Added `data-orb-target` markers to the Spruked navigation, home CTA/waitlist, products, cart summary, checkout form, and checkout summary.
- Reviewed Orb Weaver guidance: current compiled crawl artifacts found in `/home/bryan/projects/Orb_Weaver/manufacturing/templates/Website_Orb_Final/compiled_orb` are for `orbweaver.spruked.com`, not this public `spruked.com` app. Spruked runtime targets are therefore derived from this app until a domain-specific Spruked crawl pack is present.
- Confirmed no TAMP implementation exists in the active Spruked website repo beyond documented Stage/CRM concepts; no local Stage Governor transition authority was added.
- Pulled from `origin/main`; local branch was already up to date before committing this cleanup.
- Removed ORB chat-style controls from the floating Website ORB: no text input, no send button, no stop/send button, and no settings buttons remain in `GlobalOrb`.
- Restored ORB click as a quiet click-to-talk backup only; primary interaction remains voice-first through local Faster-Whisper STT.
- Reworked the ORB speech bubble so it is only CALI's spoken caption and is positioned independently from the ORB, keeping both the caption and ORB inside browser bounds.
- Removed the old `/orb` page prompt/submit demo and replaced it with a voice-presence page so historical UI does not imply a text-chat contract.
- Restarted Kokoro after finding a stuck/duplicated uvicorn generation process; verified direct Kokoro synthesis and the website `/api/orb` `speak` action return Kokoro audio again.
