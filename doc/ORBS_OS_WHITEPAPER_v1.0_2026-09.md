# ORBS OS WHITEPAPER — v1.0 (September 2026)
## Foundational Architecture, Vision, and Canonical Context

**ORBS** = Origin of Reasoning Bilateral Substrate

**Status:** Internal foundational document. This revision merges the original v0.9 vision with the current 2026 architecture, product direction, runtime conventions, Website ORB doctrine, Substrate design, cognition model, voice stack, memory model, Orb Weaver integration, and roadmap.

---

# 1. Executive Summary

ORBS is a local-first Life Operating System: a cognitive and continuity layer that sits above traditional operating systems and turns a collection of machines, applications, websites, files, services, and devices into a coherent human-facing environment.

ORBS does not replace Windows, Linux, macOS, Android, or iOS. Those remain machine operating systems. ORBS operates above them as the human layer.

**Windows becomes the machine layer. ORBS becomes the human layer.**

The cloud becomes optional rather than mandatory. The user's data, memory, identity, and models can live locally. CALI provides the canonical cognitive presence. The Substrate provides shared machine-level services and memory infrastructure. ORBs are the embodied interfaces through which CALI-derived cognition interacts with people, applications, websites, and devices.

ORBS is designed around personal ownership rather than enterprise tenancy: local-first data, portable identity, durable memory, embodied intelligence, visible action, and continuity across multiple embodiments.

The intended end state is not another assistant app. It is a persistent cognitive environment that can understand the user's world, remember what matters, operate across authorized tools, and remain available through multiple ORB embodiments without requiring the user to reorganize life around a cloud service.

# 2. Canonical Definitions

## 2.1 ORBS
ORBS is the overall Life OS architecture and product ecosystem. It includes the Substrate, CALI cognition, memory and knowledge systems, ORB embodiments, DockStation controls, tool layers, voice systems, synchronization and backup mechanisms, and optional physical hardware.

## 2.2 ORB
An ORB is an embodied interface to ORBS cognition. It is not merely an icon, chat bubble, animated decoration, or generic chatbot. An ORB has presence, voice, movement or visual behavior appropriate to its environment, awareness of its assigned context, access to authorized tools, and continuity with its underlying cognition and memory.

An ORB may be desktop-native, website-native, browser-native, mobile, home-server based, embedded in a vertical product, or eventually physical hardware.

## 2.3 CALI
CALI is the canonical cognitive identity and supervisory intelligence of the personal ORBS environment. The Desktop ORB is the authoritative personal embodiment. Other ORBs are instances or specialized embodiments that use CALI-derived cognition and the same architectural substrate patterns while remaining constrained to their assigned role and data scope.

The objective is one coherent identity with many bodies, not a collection of unrelated chatbots.

## 2.4 Substrate
The Substrate is the shared machine-level WSL/Linux infrastructure layer. It is not an application repository. It provides reusable local services such as LLM runtime, TTS, STT, CUDA/GPU integration, Redis, Docker, MCP servers, shared tools, configuration, logs, and local vault support.

Canonical current root:
`/home/bryan/substrate/`

## 2.5 DockStation
DockStation is the operator control surface for ORBs. It manages ORB registry information, settings, permissions, voice, skins, diagnostics, runtime status, and deployment-specific controls. Desktop DockStation and Website ORB configuration surfaces are related concepts but are not the same runtime. The public website ORB is not an Electron application.

## 2.6 Orb Weaver
Orb Weaver is the Website ORB intelligence factory. It scans, crawls, audits, verifies, and structures a website so that a site-specific ORB can be built from real site knowledge rather than a generic chatbot prompt. Orb Weaver converts website truth into ORB-ready context, lexicons, packs, analytics hooks, and deployment intelligence.

# 3. The Problem

Modern computing is fragmented:

- Applications are siloed.
- Personal and business data is scattered across devices and services.
- Identity is fractured across accounts.
- Most assistants are stateless or shallowly stateful.
- Cloud services often make access to personal information dependent on continuing subscriptions.
- Productivity requires constant context switching among dozens of tools.
- AI is usually disembodied, detached from the user's actual environment, and unaware of the state of local systems.
- Website assistants are typically isolated chat widgets with weak knowledge, no durable operational memory, and no true relationship to the site.
- Personal automation is usually app-centric rather than person-centric.

Users do not have a Life OS. They have an app soup.

# 4. The ORBS Solution

ORBS introduces a new computing layer:

**A local-first cognitive substrate that unifies memory, identity, tasks, communication, knowledge, authorized action, and embodied reasoning across devices and contexts.**

The system is designed around six persistent ideas:

1. The person is the center of the architecture.
2. Memory and identity should remain durable and user-owned.
3. Cognition should be embodied rather than trapped in a text box.
4. Applications and devices should become tools available to the cognitive layer, not isolated destinations.
5. Cloud capability may be used when useful, but local operation is the architectural default.
6. Every embodiment should preserve continuity without being granted unnecessary access to unrelated personal information.

# 5. What ORBS Is — and Is Not

## ORBS is:
- A cognitive layer above host operating systems.
- A local-first shared runtime and memory architecture.
- A multi-embodiment assistant environment.
- A tool-using system with visible and auditable execution.
- A framework for site-specific, device-specific, and product-specific ORBs.
- A continuity layer for identity, memory, voice, preferences, and authorized capability.

## ORBS is not:
- A replacement kernel for Windows, Linux, macOS, Android, or iOS.
- A cloud-only SaaS assistant.
- A single chat window.
- A browser `speechSynthesis` wrapper.
- A set of canned prompt responses.
- A global unrestricted agent with access to every piece of data.
- A requirement that all embodiments share all personal information.
- Dependent on a physical device; physical hardware is optional.

# 6. Architecture Overview

[ Human Life Layer ]
Relationships, goals, time, work, family, memory, obligations, projects, purchases, communication

[ ORBS Life OS Layer ]
Personal Connection Management / Tasks / Calendar / Communications / Documents / Automation / Knowledge / Analytics

[ CALI Cognitive Layer ]
Core reasoning / intent / memory routing / planning / articulation / tool selection / cognition state / doctrine

[ ORB Embodiment Layer ]
Desktop ORB / Website ORB / Browser ORB / Mobile ORB / Home ORB / Vertical Product ORBs / Optional Physical ORB

[ DockStation Control Layer ]
ORB registry / settings / permissions / voice / skins / status / diagnostics / deployment controls

[ Local Substrate Layer ]
Shared WSL infrastructure / LLM / TTS / STT / Redis / CUDA / Docker / MCP / logs / configuration / vaults

[ Host OS Layer ]
Windows / Linux / macOS / Android / iOS

[ Hardware Layer ]
PC / GPU / storage / LAN / NAS / phone / home server / peripherals / optional ORB device

# 7. Current Reference Implementation — September 2026

The present reference environment is Windows 11 with Ubuntu 26.04.1 LTS under WSL2. Windows remains the machine/user desktop layer; WSL is the primary local ORBS service environment.

## Active or established service conventions

- Website: `http://127.0.0.1:3001`
- CALI API: `http://127.0.0.1:8022`
- llama.cpp: `http://127.0.0.1:8080`
- Current llama.cpp model: `/home/bryan/substrate/llm/models/qwen2-1.5b-instruct-q4_k_m.gguf`
- Kokoro TTS primary: `http://127.0.0.1:12000/api/kokoro/tts`
- Qwen3-TTS backup contract: `http://127.0.0.1:9880/speak` (configured; service restoration still separate from the primary Kokoro path)
- Faster-Whisper STT convention: configurable local service. The Orb Weaver gold-master reference used port `9000`; the active Spruked website runtime uses `CALI_STT_API_URL=http://127.0.0.1:13000`.
- Redis: local Substrate service convention on `6379`
- Ollama remains an available local model runtime pattern on `11434` where used.

The normal Website ORB response path is designed to be:

**Website ORB -> CALI cognition -> configured local LLM/runtime -> response -> server-side TTS -> ORB playback**

The architecture explicitly rejects browser-generated speech and local canned-response shortcuts as authoritative answers.

# 8. Local Substrate Architecture

Canonical root:
`/home/bryan/substrate/`

Current top-level structure:

- `cloudflared_tunnel/` — public tunnel support and references
- `config/` — shared configuration
- `cuda/` — CUDA/GPU integration references and support
- `docker/` — Docker and Compose infrastructure
- `llm/` — llama.cpp, Ollama support, local model storage
- `logs/` — shared infrastructure logs
- `mcp_Servers/` — common MCP server implementations and support
- `orb_vision/` — OCR and shared vision services
- `python/` — shared Python runtime support
- `redis/` — Redis service support
- `services/` — service launchers and systemd definitions
- `stt/` — Faster-Whisper and future STT services
- `tools/` — FFmpeg, Gradio and other shared tooling
- `tts/` — Kokoro, Qwen3-TTS, and shared voice runtime support
- `wsl_root_Vault/` — WSL-root recovery/preservation vault

The Substrate is deliberately separate from `/home/bryan/projects/`, where individual applications and Git repositories live. A project may consume Substrate services, but the Substrate itself is shared machine infrastructure and must not be mistaken for an application repo.

# 9. Key Principles

## 9.1 Local-first
Your life lives with you. Cloud services are optional enhancements, not mandatory custodians of identity and memory.

## 9.2 Embodied cognition
Cognition should have presence. CALI is experienced through ORBs that can move, speak, point, guide, and react appropriately to their environment.

## 9.3 Sovereign identity
Identity is local, portable, recoverable, and user-owned.

## 9.4 Human-tempo action
Actions should occur at a tempo a person can understand. Important actions must be visible, attributable, and reversible where technically possible.

## 9.5 Multi-embodiment continuity
One canonical cognitive identity can have many embodiments. Continuity does not mean every embodiment receives every permission or every memory.

## 9.6 No mandatory SaaS dependency
The product model is built around ownership: one-time purchase where practical, optional maintenance/services, and no requirement that the core Life OS stop functioning because a subscription ends.

## 9.7 Site and role specificity
A Website ORB must become deeply specific to its website. A vertical-product ORB must become deeply specific to its role. Intelligence comes from cultivated context, memory, doctrine, tools, and environment—not from a generic persona prompt.

# 10. CALI Cognitive Architecture

CALI is not a thin routing label for an LLM. The intended architecture is a cultivated cognition stack combining deterministic structure, learned context, memory, and local model capability.

Core concepts include:

- Core-4 cognition based on Kant / Locke / Hume / Spinoza reasoning perspectives.
- Harmonization rather than simple philosopher selection.
- Structured Knowledge Graph (SKG).
- Memory Matrix and durable empirical memory.
- A priori and a posteriori knowledge separation.
- True-form TPC/packaging and inculcation layers for role-specific intelligence.
- Short-term cache for active session state.
- Local LLM runtime for language generation and model-assisted reasoning.
- MCP/tool layers for authorized action.

The Core-4 is cognition, not a reference advisory menu. If a runtime merely chooses which philosopher is “best used for” an ordinary query, it has been reduced from cognition into a selector and is wired incorrectly.

## 10.1 No cognition bypass
Normal ORB response generation must traverse the configured CALI cognition path. Primitive caches, regex-generated replies, prompt-specific hard-coded answers, browser-side answer manufacture, or fake “tool required” responses must not masquerade as cognition.

Fast paths may exist only for non-cognitive infrastructure operations such as health checks or direct TTS warm-up. They must not generate substantive user answers.

## 10.2 Tool use
Removing local answer manufacture does not mean removing tools. Legitimate tool invocation remains part of cognition. CALI may determine that a task requires a browser, calendar, mail system, MCP tool, local application, or other authorized service.

# 11. Memory, Knowledge, and Continuity

ORBS memory is not one database. It is a layered system.

## 11.1 Durable knowledge
The SKG, Memory Matrix, site packs, empirical vaults, user-approved records, and authoritative running totals provide durable knowledge.

## 11.2 Short-term memory
Session state and frequently accessed runtime information can live in cache/Redis for speed, but authoritative data that must survive a restart cannot exist only in ephemeral memory.

## 11.3 Website knowledge
Website ORBs are cultivated from verified website data: crawl results, page content, structured data, lexicons, navigation relationships, analytics, product/service information, policies, and owner-approved doctrine.

## 11.4 Returning-user continuity
Where appropriate and authorized, Website ORBs may recognize a returning visitor by name and use basic relationship history such as prior purchases or prior service interactions to improve continuity. More sensitive personal information and financial/payment credentials remain outside the conversational memory boundary.

# 12. Core Life OS Components

## 12.1 Personal Connection Management (PCM)
A reimagined CRM for personal and business life: people, relationships, interactions, commitments, follow-ups, and context.

## 12.2 Calendar and Time Substrate
Unified scheduling, routines, time blocks, appointments, commitments, and temporal context.

## 12.3 Reminders and Tasks
Life orchestration: commitments, follow-ups, recurring activity, deadlines, and delegated work.

## 12.4 Email and Communications Ingestion
Authorized ingestion of email and communications into activity history, relationship context, follow-ups, and task creation. Local-first storage and user-defined retention remain preferred.

## 12.5 Knowledge Graph and Document Memory
Local semantic indexing, structured entities, relationships, document memory, site knowledge, and retrieval.

## 12.6 Automations
“If this happens in my life, do that.” Automations should be inspectable, attributable, and scoped to explicit authority.

## 12.7 ORB Registry
A record of known ORB instances, deployment identity, capabilities, permissions, voice, configuration, and health.

## 12.8 Analytics and operational memory
Every production Website ORB must maintain owner-reportable analytics. Live/session metrics may use short-term cache for performance, but authoritative running totals must periodically persist so they survive process restarts and can be audited.

# 13. ORB Embodiments

## 13.1 Desktop ORB
The prime personal embodiment. It provides local cognition, voice, movement, DockStation integration, desktop awareness, and access to authorized machine capabilities.

The Desktop ORB is intended to feel present rather than pinned to a corner. Movement is autonomous, cursor position is a weak signal rather than a leash, and the ORB may acknowledge, glide, point, or reposition without impersonating direct user control.

## 13.2 Website ORB
A site-native concierge, guide, customer-service presence, and navigation assistant. It is not primarily a chat widget.

A Website ORB should:
- know the website deeply;
- help visitors navigate and find answers;
- recognize relevant returning-user context when authorized;
- explain products, services, policies, and processes;
- help complete site tasks without pretending to be checkout/payment infrastructure;
- maintain owner-reportable analytics;
- speak through server-side TTS;
- preserve the visual and behavioral character of an ORB rather than becoming a generic chat bubble.

## 13.3 Browser ORB
A research and web-awareness embodiment capable of understanding the current page, assisting with research, and coordinating authorized browser actions.

## 13.4 Mobile ORB
A companion embodiment for notifications, voice interaction, lightweight cognition, location/time-sensitive assistance, and continuity when away from the primary machine.

## 13.5 Home Server ORB
An always-on local hub for household continuity, shared services, backup, local automation, model serving, and home-network integrations.

## 13.6 Optional Physical ORB
Physical hardware is an optional embodiment, not a requirement for ORBS. The physical direction is a compact spherical device approximately in the class of a small smart speaker, with a high-quality microphone and speaker, local Linux compute, Raspberry Pi-class board or equivalent, SSD storage, Bluetooth/network integration, and local ORBS software.

Potential functions include:
- room voice interface;
- local storage and backup target;
- message taking;
- call initiation through paired devices/services;
- music and Bluetooth audio;
- household ORB presence;
- optional always-on node for ORBS.

The physical ORB can be sold or funded as a distinct product while the software ORBS environment remains fully functional without it.

# 14. Website ORB Doctrine

The Website ORB is one of the clearest demonstrations of ORBS architecture because it turns a static website into an intelligent environment.

## 14.1 Customer service + hospitality + concierge
The desired behavioral model combines customer service, hospitality, and concierge behavior. The ORB should welcome, remember relevant context, anticipate needs, guide visitors, and remain polished and useful within the site's role.

## 14.2 Navigation as intelligence
The ORB should understand site structure well enough to guide a visitor to the right page, product, policy, form, or next action. The objective is not merely answering questions; it is reducing friction between intention and the site's capability.

## 14.3 Movement and presence
The website ORB is intentionally mobile. It may move within the viewport, acknowledge the user, orient toward relevant content, or visually indicate destinations. It should not appear mechanically tethered to the cursor.

## 14.4 Server-side voice only
Browser voice is not a production fallback. Voice is generated by the ORBS server-side TTS stack so the ORB has a controlled, consistent voice asset and predictable audio behavior.

## 14.5 Voice warm-up at splash/startup
The splash animation is useful compute time. At splash or ORB mount, the configured TTS engine should warm in parallel so model load, CUDA initialization, and voice loading occur before the first real response.

Warm-up must be non-blocking and non-cognitive. It must not create a fake conversation turn, write to memory, increment conversational analytics, or invoke the LLM. Readiness and warm-up latency should be observable.

# 15. Orb Weaver — Website Intelligence Factory

Orb Weaver is the system that creates the knowledge foundation for Website ORBs.

Current capability areas include:
- free preflight scans;
- authenticated crawling;
- sitemap and URL discovery;
- robots/crawl-control analysis;
- page fetching and JavaScript rendering decisions;
- content scanning;
- meta/status/load/schema/link/alt/SSL/indexability/mobile/entity/template analysis;
- audit scoring and issue reporting;
- browser review and browser truth verification;
- GA4 import and analytics integration;
- lexicon and Website ORB context generation;
- TPC/pack generation and validation.

Orb Weaver is not the Website ORB itself. It is the intelligence factory that observes the site, structures what it learns, validates deployment conditions, and produces the context from which the ORB becomes site-specific.

# 16. DockStation Control Layer

DockStation provides control without turning every ORB into a settings panel.

Core functions include:
- ORB registry and instance identification;
- voice selection and behavior settings;
- visual skins and presentation settings;
- permissions and capability controls;
- diagnostics and runtime health;
- model/service connectivity status;
- deployment-specific configuration;
- optional swarm/mesh visibility;
- logging and troubleshooting.

Website configuration surfaces may expose a subset of DockStation concepts, but the Website ORB runtime itself remains web-native. Electron belongs only where a desktop adapter is required.

# 17. Voice and Speech Architecture

Voice is a first-class embodiment capability.

## 17.1 STT
Faster-Whisper is the preferred local STT path before cognition. ACP and the older cochlear-processing path are deprecated from the current live Website ORB architecture unless explicitly reintroduced for a separate experiment.

Canonical service convention: configurable local Faster-Whisper service. The Orb Weaver gold-master reference used `9000`; the active Spruked website runtime uses `13000` through `CALI_STT_API_URL` so the contract can move without code changes.

## 17.2 Kokoro
Kokoro is the current primary local TTS path in the September 2026 Website ORB reference runtime.

Canonical local assets:
- model root: `/home/bryan/substrate/tts/Kokoro_tts/models/Kokoro-82M/`
- model weight: `kokoro-v1_0.pth`
- local voice tensors under `voices/`
- service contract: `/api/kokoro/tts` on port `12000`

## 17.3 Qwen3-TTS
Qwen3-TTS is a second local TTS engine and backup/high-quality voice path.

Canonical root:
`/home/bryan/substrate/tts/qwen_3_tts/`

Established service contract:
`http://127.0.0.1:9880/speak`

## 17.4 Voice assets
Live speech should use fixed, prepared voices. Per-utterance voice cloning is not appropriate for the low-latency live path. Voice cloning and voice design belong in a separate Voice Asset Studio workflow.

# 18. Local Model Runtime

ORBS should be model-agnostic at the architecture layer. Models are replaceable engines, not the identity of CALI.

Current patterns include:
- llama.cpp for efficient local GGUF serving;
- Ollama for local model management where useful;
- small models for fast website and voice-adjacent interactions;
- larger or remote models only when a task justifies the cost, latency, or capability.

The reference Website ORB runtime currently uses llama.cpp on port `8080` with a local Qwen2 1.5B instruct GGUF. This is an implementation choice, not a permanent definition of ORBS cognition.

# 19. MCP and Tool Architecture

Each shippable ORB or product should carry the MCP/tool layer required for its assigned capabilities. There should not be one unrestricted ecosystem-wide MCP server that automatically grants every embodiment access to every tool.

The shared Substrate may host common MCP server implementations and services. An ORB receives only the tools appropriate to its deployment and authorization.

This allows:
- Desktop ORB tools for local machine interaction;
- Website ORB tools for site navigation, content, analytics, or customer-service functions;
- POPS tools for evidence handling;
- business-specific tools for vertical ORBs;
- future mobile/home tools without collapsing all authority into one agent.

# 20. Privacy, Identity, and Protected Boundaries

The primary protected boundaries are personal/private data and financial/payment data.

ORBS should preserve useful memory while preventing payment credentials, checkout secrets, passwords, and unrelated sensitive records from becoming casually available to conversational contexts.

Key rules:
- user memory and product intelligence are not a data resale asset;
- payment and checkout data remain isolated from ordinary ORB memory;
- personal/private records are scoped by role and authorization;
- a Website ORB receives only the customer/site context needed to perform its service role;
- backups are user-controlled;
- cloud synchronization is optional and must not be the sole location of authoritative memory.

# 21. Human-Tempo Execution, Observability, and Recovery

ORBS should make consequential actions understandable to the person using it.

Important execution properties include:
- visible action state;
- source attribution where appropriate;
- logs and operational traces;
- reversible actions when technically possible;
- explicit service errors rather than fabricated success;
- durable checkpoints for memory and analytics;
- recoverable local assets and configuration.

A broken cognition service should fail visibly rather than generate a local canned answer and pretend CALI succeeded.

# 22. Data Sovereignty, Backup, and Sync

Local-first does not mean single-disk-only.

ORBS should support:
- local primary storage;
- user-selected backups;
- NAS or home-server backup;
- removable/offline backup;
- optional encrypted cloud backup;
- cross-device synchronization where the user chooses it.

The user is responsible for the backup strategy they select; ORBS should make local backup practical and transparent rather than locking data into one vendor service.

# 23. Product and Commercial Model

The foundational commercial doctrine is ownership rather than perpetual rental.

Preferred model:
- one-time purchase for core products where practical;
- optional maintenance/support and upgrades;
- optional paid services that do not disable locally owned functionality when declined;
- hardware as an optional add-on rather than a mandatory gateway to the software;
- cloud services as optional enhancements rather than the foundation of the architecture.

This does not prohibit recurring services where a real recurring external cost exists. It means the core ORBS value proposition should not be “rent access to your own memory.”

# 24. ORBS Product Ecosystem

ORBS is a platform architecture that can support multiple products without forcing them to become one monolithic application.

Examples of adjacent or vertical product families include:
- Website ORBs produced through Orb Weaver;
- Desktop ORBs and DockStation;
- Web Weaver for future ORB-native website construction;
- POPS as a specialized evidence/timeline and court-packet environment;
- TrueMark / certificate and provenance products;
- GOAT and other specialized ORB-enabled applications;
- voice asset tooling;
- optional physical ORB hardware.

These products may share Substrate services, patterns, and cognition components while retaining their own repositories, data boundaries, tool layers, and product identities.

# 25. Why Now?

The technical and market conditions that make ORBS practical are converging:

- terabyte-scale storage is inexpensive;
- consumer GPUs can run useful local models;
- compact GGUF models can deliver interactive local inference;
- speech recognition and TTS can run locally;
- WSL and local container tooling make mixed Windows/Linux deployments practical;
- home servers and NAS devices are increasingly accessible;
- subscription fatigue creates demand for ownership-oriented software;
- users increasingly expect AI to remember context and act across tools;
- website owners need assistants that understand the actual site rather than generic chatbot scripts.

# 26. Updated Roadmap

## 26.1 One-Year Roadmap — Foundational Era
**Goal:** Establish the durable Substrate, canonical CALI runtime, production Website ORB, Desktop ORB, and multi-ORB continuity.

### Current / immediate foundation
- Finish rebuilding shared WSL Substrate under `/home/bryan/substrate/`.
- Restore and service-manage local LLM, Kokoro, Qwen3-TTS, Faster-Whisper, Redis, Docker, MCP, CUDA, and supporting tools.
- Keep project repositories under `/home/bryan/projects/` and consume shared Substrate services through explicit contracts.
- Preserve CALI cognition without local response bypasses.
- Complete server-side voice with non-blocking startup warm-up.
- Preserve and validate Website ORB movement, navigation, presence, and analytics.
- Continue Orb Weaver crawl/audit/pack generation as the Website ORB intelligence factory.

### Q1-Q2 objectives
- Substrate v1: PCM, calendar, reminders, communication ingestion.
- Desktop ORB v1 with DockStation.
- Website ORB v1 production packaging.
- ORB registry.
- Local embeddings and semantic search.
- Role/permission controls and deployment identity.
- Persistent analytics and restart-safe operational memory.

### Q3-Q4 objectives
- Browser ORB v1.
- Mobile ORB prototype.
- Automations v1.
- Swarm/mesh cognition experiments.
- Local backup and user-controlled sync.
- Home-server Substrate option.
- Developer API and pack interfaces for third-party/specialized ORBs.
- Optional physical ORB prototype as a separate hardware embodiment.

**Outcome:** A fully functional local-first Life OS prototype with multiple ORB embodiments using a shared architectural foundation.

## 26.2 Three-Year Roadmap — Expansion Era
**Goal:** ORBS becomes a practical personal computing layer beyond the initial power-user environment.

### Year 2
- Home ORB and smart-home integration.
- Multi-user Substrate support.
- Family Substrate mode.
- Expanded local LLM runtime and model selection.
- Offline-first research engine.
- PCM v2 relationship intelligence.
- Calendar v2 with routines and time-blocking.
- Automations v2 with multi-step workflows.
- Mature backup, migration, and recovery tooling.

### Year 3
- ORBS local app/extension ecosystem.
- ORBS Mesh for LAN multi-device cognition and shared services.
- ORBS Identity portable identity vault.
- ORBS Presence cross-device continuity.
- ORBS for Education.
- ORBS for Creators and project-centric environments.
- Mature physical/home hardware options where they add real value.

**Outcome:** ORBS becomes a credible default Life OS layer for power users, families, students, creators, and small businesses.

## 26.3 Ten-Year Roadmap — Human-Layer Era
**Goal:** ORBS becomes a broadly usable human-facing computing layer independent of any one host OS.

### Years 4-6
- ORBS Home Server appliance.
- Deep NAS integration.
- Network/router-level ORBS services where useful.
- Vehicle ORB.
- Wearable ORB.
- Health and finance substrates with strict domain-specific data boundaries.
- Mature household and family identity models.

### Years 7-10
- ORBS becomes a primary interface for personal computing.
- Host operating systems recede into the machine layer for ordinary users.
- ORBS becomes a portable sovereign identity and continuity layer.
- ORBS provides a universal cognitive substrate pattern across personal devices.
- CALI/ORBS becomes the “Paragon of cognition”: one coherent cognitive environment expressed through many authorized embodiments.

**Outcome:** ORBS becomes a candidate human-facing operating system model for the 2030s.

# 27. Strategic Risks and Engineering Tradeoffs

ORBS is ambitious. The architecture must explicitly solve several practical problems:

- local hardware capability varies widely;
- GPU memory is finite and multiple voice/model services can contend for VRAM;
- startup latency must be hidden through warm-up and service persistence;
- cross-device sync must not compromise the local-first model;
- memory quality requires structure, not indiscriminate accumulation;
- Website ORBs must stay site-specific and must not drift into generic chatbot behavior;
- model replacement must not erase identity or doctrine;
- long-running coding agents can lose context unless canonical architecture is written down and re-read;
- recovery and migration must be treated as first-class features rather than emergency work.

# 28. Canonical Coding-Agent Context Contract

This section exists specifically so Codex, Copilot, or another coding agent can re-establish project context after compaction or a new session.

## 28.1 Non-negotiable definitions
- ORBS is the overall Life OS architecture.
- An ORB is an embodied cognitive interface, not a chat bubble or static icon.
- CALI is the canonical personal cognition identity; other ORBs are scoped embodiments/instances.
- The Substrate is shared WSL infrastructure under `/home/bryan/substrate/`, not a Git repo.
- Individual projects live under `/home/bryan/projects/`.
- Orb Weaver is the Website ORB intelligence factory, not the ORB itself.
- DockStation is a control surface; the Website ORB is web-native and is not Electron.

## 28.2 Current service conventions
- Website: 3001
- CALI: 8022
- llama.cpp: 8080
- Kokoro: 12000 `/api/kokoro/tts`
- Qwen3-TTS: 9880 `/speak`
- Faster-Whisper: configurable; active Spruked website runtime uses 13000 via `CALI_STT_API_URL`
- Ollama where used: 11434
- Redis: 6379

## 28.3 Runtime rules
- No browser speech in production.
- No local canned-answer bypass around CALI cognition.
- Legitimate tools remain available inside cognition.
- TTS engine fallback is allowed after cognition.
- TTS warm-up must be non-blocking and non-cognitive.
- Website ORBs are mobile/present, not stationary chat widgets.
- Website ORBs maintain persistent owner-reportable analytics.
- Personal/private and payment/checkout boundaries remain explicit.
- Do not remove Core-4 merely because a current wiring bug makes it look like a selector.
- Do not reintroduce deprecated ACP into the live Website ORB voice path unless explicitly requested.

## 28.4 Preservation rules
When extracting, rebuilding, or moving an ORB, preserve:
- empirical vaults;
- learned behavior;
- movement/presence patterns;
- voice/audio behavior;
- cognition files;
- Memory Matrix/SKG knowledge;
- mesh results;
- site packs and analytics state;
- configuration and service contracts.

# 29. The Future

ORBS becomes:

- the Life OS;
- the personal cognitive environment;
- the sovereign identity and continuity layer;
- the assistant that lives across authorized devices;
- the bridge between human intention and machine capability;
- the environment in which local models, tools, applications, websites, and devices become parts of one coherent human-facing system.

Windows becomes the engine room. ORBS becomes the cockpit.

# Appendix A — Original Product-Roadmap Intent Preserved

The original v0.9 roadmap intent is preserved in the updated roadmap above: substrate, CALI, multi-ORB ecosystem, Browser ORB, Mobile ORB, automations, swarm cognition, backup/sync, home server, developer API, family mode, local LLMs, offline research, PCM, calendar, app ecosystem, mesh, identity, presence, education, creators, home server appliance, NAS, router, car, wearable, health, finance, and long-range Life OS adoption.

# Appendix B — Derived Deliverables

The original “next step” outputs remain valid as separate artifacts that can be generated from this canonical whitepaper:

A. Full external/public ORBS OS Whitepaper (investor/customer edition)
B. ORBS Investor Deck
C. ORBS Substrate Technical Specification
D. ORBS Branding and Naming System
E. ORBS Launch Strategy

# Closing Principle

ORBS should make computing feel less like managing software and more like working with a persistent, capable environment that knows what it is, knows what it is allowed to do, remembers what matters, and remains with the person across machines, sites, products, and time.
