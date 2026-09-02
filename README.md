# spruked.com

Truth with teeth.

A modern web application built with Next.js, featuring brand identity, ORB cognition routing, content management, and an integrated admin CRM and operations hub.

## Production Readiness Status

- Build status: `npm run build` passes
- Lint status: `npm run lint` passes (warnings only for `<img>` optimization)
- Core commerce routes live: `/cart`, `/checkout`
- Orb API routing active: `/api/orb` with admin-context routing support
- Founder and About content published under `/about`
- Admin CRM pipeline, appointment scheduling, and inbound mailbox poll integrated

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

## Admin System (Integrated)

The `/admin` route includes a full operations console with a token-protected backend.

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
6. Start production server:
   - `npm run start`

## Orb Provider Routing

The site orb UI/behavior can stay unchanged while cognition/voice is routed by API config.

- `SPRUKED_ORB_COGNITION_PROVIDER=kaygee_hybrid`
- `KAYGEE_API_BASE` (default `http://127.0.0.1:8011`)
- `KAYGEE_VOICE_ENABLED` (`1` or `0`)
- `KAYGEE_VOICE` (default `af_bella`)
- `CALI_API_URL` (default `http://127.0.0.1:8022`)
- `KAYGEE_HYBRID_RESPOND_PATH` (default `/cali/orb/respond`)
- `CALI_LLM_PROVIDER=llama_cpp` routes CALI hybrid cognition to local llama.cpp
- `LLAMA_CPP_API_BASE` (default `http://127.0.0.1:8080`)
- `CALI_LLAMA_CPP_MODEL_NAME` (default `local-llama-cpp`)
- `CALI_LOCAL_KOKORO_URL` (default `http://127.0.0.1:12000/api/kokoro/tts`)
- `CALI_QWEN_TTS_URL` (default `http://127.0.0.1:9880/speak`)
- `CALI_STT_API_URL` (default `http://127.0.0.1:13000`) for local faster-whisper voice recognition
- `ADMIN_ACCESS_TOKEN` or `CALI_ADMIN_TOKEN` for admin/CALI protected operations
- `BUSINESS_EMAIL_APP_PASSWORD` (or `EMAIL_APP_PASSWORD`) for IMAP mailbox polling

The provider switch is handled under `app/api/orb/route.ts`; orb visuals are not required to change.

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
