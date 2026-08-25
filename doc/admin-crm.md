# Spruked Admin CRM + Operations Guide

This document defines Spruked's controlled integration with the separate Windows CALI CRM.

## 1. Architecture

- Spruked admin integration UI: `components/admin/CaliOperationsHub.tsx`
- Public/admin orb API orchestrator: `app/api/orb/route.ts`
- Standalone CRM application: `C:/dev/Desktop/PLATFORM/SPRUKED_CRM_MASTER_2026-05-05`
- CALI API routes: `source/cali_skg/api/cali_routes.py` in the standalone CRM
- CALI core CRM logic + storage: `source/cali_skg/core/cali_personal_skg.py` in the standalone CRM

Data storage is local SQLite under CALI memory path (`cali_personal.db`).

Current local runtime:

- Standalone CRM UI: `http://localhost:21010/`
- CALI API backend: `http://192.168.12.155:21000`
- Active CRM database: `R:/R_Drive_Substrate/crm/memory/cali_personal.db`
- Website proxy: `/api/cali/*`
- Website ORB support code: `/home/bryan/projects/spruked.com/Orb_Assistant` (not a second CRM service)

The CRM frontend is never proxied through Spruked. Navigation is link-only. Data crosses from Spruked to CALI only through authenticated API writes for approved customer, user, lead, and inquiry workflows.

## 2. Admin Tabs

- `overview`
- `leads`
- `contacts`
- `financial`
- `calendar`
- `verification`
- `tasks`

## 3. CRM Model

### Contact types

- `personal`
- `financial`
- `business`
- `family`
- `marketing`
- `promoter`
- `investor`

### CRM stages

- `prospect`
- `qualified`
- `contacted`
- `meeting_scheduled`
- `proposal`
- `won`
- `lost`

### CRM activity types (examples)

- `contact_created`
- `stage_change`
- `appointment_scheduled`
- `email_inbound`

## 4. Waitlist Lead Capture

Homepage waitlist submits to `POST /api/waitlist`.

Behavior:

- stores lead as contact in CALI
- assigns CRM stage `prospect`
- records lead source metadata
- categorizes by selected lead type

## 5. Appointment + Calendar Coupling

Scheduling an appointment through CRM does all of the following:

1. creates an `appointment` event in calendar
2. updates lead stage to `meeting_scheduled`
3. creates CRM activity entry
4. creates a follow-up CRM task

## 6. Email Connector + IMAP Poll

### Connector routes

- `POST /api/cali/crm/email/connect`
- `GET /api/cali/crm/email/status`

### Inbound poll route

- `POST /api/cali/crm/email/poll`

Poll behavior:

- connects to configured IMAP mailbox
- searches inbox window (`since_hours`, `unseen_only`, `limit`)
- parses sender and message metadata
- deduplicates via stored `message_id`
- matches existing contact by sender email
- auto-creates marketing lead contact if unknown
- logs CRM `email_inbound` activity

Password gate:

- requires `BUSINESS_EMAIL_APP_PASSWORD` or `EMAIL_APP_PASSWORD`

## 7. ORB Admin Assistant Integration

When request context is admin (`x-cali-context=admin`), ORB can route into CALI personal admin operations, including:

- CRM pipeline status
- email connector status
- mailbox polling intent path

The Orb Assistant also has access to:

- shared runtime/operator tools through `Orb_Assistant/tools`
- pointer resolution/recovery/escalation contracts through `Orb_Assistant/pointer_escalation`
- verified admin navigation awareness for Spruked `/admin`, CALI CRM `/admin`, and Orb Weaver authenticated admin-section scan seeds

These are safety boundaries, not free automation authority. Verified tools and pointer targets can support CALI's answer or guidance; uncertain route/pointer matches must fail closed.

The owner ORB has full admin awareness for Spruked/CALI operations: it can inspect verified admin routes, CRM status, import endpoints, pointer targets, and tool availability. It must still fail closed before movement if route identity or pointer verification is uncertain.

## 8. API Endpoint Inventory

- `GET /api/cali/crm/pipeline`
- `PATCH /api/cali/crm/leads/stage`
- `POST /api/cali/crm/activities`
- `GET /api/cali/crm/activities/{contact_id}`
- `POST /api/cali/crm/appointments`
- `POST /api/cali/crm/email/connect`
- `GET /api/cali/crm/email/status`
- `POST /api/cali/crm/email/poll`
- `POST /api/cali/imports/datasets`
- `POST /api/cali/imports/orb-weaver/customer-signup`

## 9. Environment Variables

Required for admin-protected CRM operations:

- `ADMIN_ACCESS_TOKEN` or `CALI_ADMIN_TOKEN`
- `CALI_API_URL`
- `CALI_CRM_SUBSTRATE_ROOT` for the CALI API service when using the R-drive CRM substrate

Required for live IMAP polling:

- `BUSINESS_EMAIL_APP_PASSWORD` (preferred)
- or `EMAIL_APP_PASSWORD`

## 10. Basic Verification Checklist

1. `GET /api/cali/crm/pipeline` returns stage counts.
2. `GET /api/cali/crm/email/status` returns connector metadata.
3. `POST /api/cali/crm/appointments` creates event + CRM side effects.
4. `POST /api/cali/crm/email/poll` returns:
   - `success=true` when mailbox auth is available
   - `400` with password guidance when mailbox password env is missing.
5. `GET http://127.0.0.1:21000/cali/status` with admin token reports the R-drive CRM contact count.
6. Invalid import payload to `POST /api/cali/imports/orb-weaver/customer-signup` returns validation errors rather than creating a fake contact.

## 11. Pointer + Tool Safety

The Spruked ORB must use verified website context before movement:

- product names must resolve to the exact approved route
- signup/account intent must resolve to a real signup/account route, not checkout or 404
- stale or ambiguous tool suggestions must be refused
- pointer guidance is allowed only for verified/stable targets with runtime policy allowing point behavior
- click/navigation authority is separate from pointer authority

Tool access is available through:

`Orb_Assistant/tools -> /home/bryan/projects/Orb_Weaver/tools`

Pointer escalation contracts are available through:

`Orb_Assistant/pointer_escalation/`

Electron is not the CRM or ORB brain. It is only an optional dock adapter when the Dock Station needs a desktop surface.
[Footer Navigation]
See the site footer (components/layout/Footer.tsx) for canonical navigation links and the current site map.
