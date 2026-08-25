# spruked.com

Truth with teeth.

A modern web application built with Next.js, featuring brand identity, ORB cognition routing, content management, and an explicit write integration with the separate CALI CRM.

## Current Local Runtime

- Main website repo: `/home/bryan/projects/spruked.com`
- Existing local site: `http://localhost:3001/`
- Standalone Windows CALI CRM frontend: `http://localhost:21010/`
- Standalone Windows CALI API backend: `http://192.168.12.155:21000`
- Authoritative CALI CRM substrate: `R:/R_Drive_Substrate/crm`
- Orb Assistant runtime/docs: `Orb_Assistant/`

The website and CRM are separate applications. Their shared surface is limited to explicit navigation links and authenticated writes for customer-account data, user data, waitlist leads, and contact inquiries. Spruked does not proxy or host the CRM frontend.

The old WSL-home `/home/bryan/spruked.com` runtime clutter has been archived under `Orb_Assistant/archive/`. The active website remains this repo.

## Production Readiness Status

- Build status: `npm run build` passes
- Lint status: `npm run lint` passes (warnings only for `<img>` optimization)
- Core commerce routes live: `/cart`, `/checkout`
- Orb API routing active: `/api/orb` with admin-context routing support
- Founder and About content published under `/about`
- Admin CRM pipeline, appointment scheduling, and inbound mailbox poll integrated
- Orb Assistant has access to shared tools via `Orb_Assistant/tools -> /home/bryan/projects/Orb_Weaver/tools`
- Orb Assistant has local pointer escalation contracts in `Orb_Assistant/pointer_escalation/`

## Features

- **Brand Identity System**: Comprehensive brand guidelines and assets
- **Content Management**: Dynamic content powered by Supabase
- **Admin CRM Hub**: Lead pipeline, stage tracking, activity logging, appointments, and mail connector
- **Inbound Email Ingestion**: IMAP mailbox poll that auto-creates CRM activities and lead contacts
- **Modern UI**: Built with Tailwind CSS and React
- **Type-Safe**: Full TypeScript implementation
- **Responsive Design**: Mobile-first approach

## Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase
- **Icons**: Lucide React
- **Deployment**: Vercel (recommended)

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/spruked.com.git
   cd spruked.com
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Supabase credentials and other required environment variables.

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open [http://localhost:3001](http://localhost:3001) in your browser**

## Project Structure

```
├── app/                 # Next.js app directory
├── components/          # Reusable React components
├── lib/                 # Utility functions and configurations
├── data/                # Static data and types
├── public/              # Static assets
├── Orb_Assistant/       # CALI SKG, CRM API, dock adapter, pointer escalation, tools link
└── styles/              # Global styles
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Route Map (Current)

- `/` - Home
- `/about` - About + founder statement
- `/products` - Product index
- `/products/alpha-certsig`
- `/products/truemark-mint`
- `/products/truemark-mint/objects`
- `/products/truemark-mint/object-types`
- `/goat`
- `/orb`
- `/orb-skin-studio`
- `/artifacts`
- `/cart`
- `/checkout`
- `/admin`

## Website Admin And CRM Integration

The Spruked `/admin` route is the website administration surface. The standalone CALI CRM owns its UI and R-drive records; approved Spruked actions write to it through the token-protected Windows API.

### Tabs

- `overview`
- `leads`
- `contacts`
- `financial`
- `calendar`
- `verification`
- `tasks`

### CRM Features

- Lead categories: `promoter`, `investor`, `marketing`, `business`
- CRM stages: `prospect`, `qualified`, `contacted`, `meeting_scheduled`, `proposal`, `won`, `lost`
- Stage update controls (owner, follow-up timestamp, notes)
- CRM activity logging per contact
- Appointment scheduler connected to calendar + CRM follow-up tasking
- Waitlist capture wired into CRM contact creation

### Email + Mailbox Features

- Business email connector settings in admin
- Connector status endpoint and readiness checks
- Inbound IMAP poll endpoint and UI trigger
- Automatic inbound email ingestion:
   - dedupe by `message-id`
   - match/create contact by sender email
   - create CRM `email_inbound` activities

### ORB Admin Assistant Capabilities

In admin context (`x-cali-context=admin`), ORB can actively query and operate CRM-aware CALI routes, including:

- CRM pipeline status
- Email connector status
- Mailbox poll intent path

### Orb Assistant support folders

Spruked's `Orb_Assistant/` includes:

- `cali_skg/` — active CALI CRM/cognition API implementation
- `electron_dock_adapter/` — byte-for-byte synced from Orb Weaver's canonical dock adapter
- `pointer_escalation/` — shared pointer resolution, recovery, and human-escalation contracts
- `tools` — symlink to Orb Weaver's canonical runtime/operator tools
- verified admin navigation awareness for Spruked `/admin`, CALI CRM `/admin`, and authenticated Orb Weaver admin-section scans

Electron is an optional Dock Station adapter only. It must not own cognition, memory, voice, route authority, or pointer authority.

## Production Checklist

Run this before each release:

1. `npm ci`
2. `npm run lint`
3. `npm run build`
4. Validate env values (`.env.local`) for:
   - `CALI_API_URL`
   - `SPRUKED_ORB_COGNITION_PROVIDER`
   - `SPRUKED_ORB_PROVIDER_TIMEOUT_MS`
   - `ADMIN_ACCESS_TOKEN` or `CALI_ADMIN_TOKEN`
   - `BUSINESS_EMAIL_APP_PASSWORD` (required for live IMAP poll)
   - Supabase keys
5. Smoke test:
   - `GET /`
   - `POST /api/orb`
   - `GET /api/cali/crm/pipeline` (admin token)
   - `GET /api/cali/crm/email/status` (admin token)
   - `POST /api/cali/crm/email/poll` (admin token + mailbox password env)
   - `/cart` and `/checkout` render
   - `GET http://127.0.0.1:21010/`
   - `GET http://127.0.0.1:21000/health`
6. Start production server:
   - `npm run start`

## Orb Provider Routing

The website ORB routes one-click microphone turns through faster-whisper STT,
CALI SKG cognition, Qwen TTS with Cali's voice profile, and Kokoro only when
Qwen is unavailable. The browser records and plays audio; it never synthesizes speech.

- `SPRUKED_ORB_COGNITION_PROVIDER=cali_skg|calixone` (default `cali_skg`)
- `SPRUKED_ORB_PROVIDER_TIMEOUT_MS` (default `120000`) for CALI SKG cognition
- `SPRUKED_ORB_VOICE_PROVIDER_TIMEOUT_MS` (default `30000`) for public website voice turns; the voice route uses the larger cognition timeout when needed
- `SPRUKED_ORB_PROVIDER_FALLBACK=0` keeps fabricated local provider fallback disabled for live ORB speech
- `FAST_WHISPER_URL` or `FASTER_WHISPER_STT_URL` (default `http://127.0.0.1:9000/stt`)
- `CALI_OLLAMA_MODEL_NAME` (default `llama3.2:1b`)
- `OLLAMA_BASE_URL` (default `http://127.0.0.1:11434`)
- `CALI_HYBRID_USE_LOCAL_LLM` (default `1`)
- `ORB_TTS_KOKORO_URL` (default `http://127.0.0.1:8880/speak`)
- `ORB_TTS_KOKORO_HEALTH_URL` (default `http://127.0.0.1:8880/health`)
- `ORB_TTS_KOKORO_MODEL` (default `kokoro`)
- `ORB_TTS_KOKORO_VOICE` (default `af_heart`)
- `ORB_TTS_KOKORO_FORMAT` (default `wav`)
- `ORB_TTS_KOKORO_SPEED` (default `1.05`)

## Pointer and Tool Policy

The website ORB may use approved site intelligence, verified pointer maps, and the local `Orb_Assistant/pointer_escalation/` contracts for guidance. If a route or target is uncertain, missing, stale, invalid, hidden, conflicting, or unverified, CALI must refuse movement instead of navigating.

Runtime/operator tools are available through `Orb_Assistant/tools`, which points to Orb Weaver's canonical tools folder. These tools are adapters and diagnostics; persistent state belongs in the configured vault/substrate, not in tool folders.

See:

- `Orb_Assistant/README.md`
- `Orb_Assistant/docs/ORB_ASSISTANT_RUNTIME_WIRING.md`
- `doc/admin-crm.md`
- `ORB_TTS_KOKORO_TIMEOUT_MS` (default `45000`)
- `QWEN_TTS_ENGINE` (default `qwen3-tts-06b-base`)
- `QWEN_TTS_BASE_URL` (default `http://127.0.0.1:9880/speak`)
- `QWEN_TTS_HEALTH_URL` (default `http://127.0.0.1:9880/health`)
- `QWEN_TTS_VOICE` (default `cali_voice_profile`)
- `QWEN_TTS_TIMEOUT_MS` (default `220000`)
- `CALIXONE_API_BASE` (default `http://127.0.0.1:8021`)
- `CALIXONE_INTERACT_PATH` (default `/api/interact`)
- `CALI_API_URL` (Windows CRM API, currently `http://192.168.12.155:21000`)
- `CALI_SKG_RESPOND_PATH` (default `/cali/orb/respond`)
- `ADMIN_ACCESS_TOKEN` or `CALI_ADMIN_TOKEN` for admin/CALI protected operations
- `BUSINESS_EMAIL_APP_PASSWORD` (or `EMAIL_APP_PASSWORD`) for IMAP mailbox polling

The provider switch is handled under `app/api/orb/route.ts`; orb visuals are not required to change.

### Live ORB Voice

Live ORB speech uses server-generated Qwen WAV output with Cali's saved voice profile. Kokoro is the server-side fallback. Browser speech synthesis is prohibited.

The public floating ORB response bubble auto-closes after audio playback unless
the visitor clicks the bubble to pin it.

## Core Admin/CRM Endpoints

All `/api/cali/*` admin endpoints require bearer admin token.

- `GET /api/cali/crm/pipeline`
- `PATCH /api/cali/crm/leads/stage`
- `POST /api/cali/crm/activities`
- `GET /api/cali/crm/activities/{contact_id}`
- `POST /api/cali/crm/appointments`
- `POST /api/cali/crm/email/connect`
- `GET /api/cali/crm/email/status`
- `POST /api/cali/crm/email/poll`

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

Bryan - bryan@spruked.com

Project Link: [https://github.com/yourusername/spruked.com](https://github.com/yourusername/spruked.com)
