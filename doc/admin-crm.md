# Spruked Admin CRM + Operations Guide

This document defines the integrated admin CRM system now running in this project.

## 1. Architecture

- Frontend admin UI: `components/admin/CaliOperationsHub.tsx`
- Public/admin orb API orchestrator: `app/api/orb/route.ts`
- CALI API routes: `cali_skg/api/cali_routes.py`
- CALI core CRM logic + storage: `cali_skg/core/cali_personal_skg.py`

Data storage is local SQLite under CALI memory path (`cali_personal.db`).

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

## 8. API Endpoint Inventory

- `GET /api/cali/crm/pipeline`
- `PATCH /api/cali/crm/leads/stage`
- `POST /api/cali/crm/activities`
- `GET /api/cali/crm/activities/{contact_id}`
- `POST /api/cali/crm/appointments`
- `POST /api/cali/crm/email/connect`
- `GET /api/cali/crm/email/status`
- `POST /api/cali/crm/email/poll`

## 9. Environment Variables

Required for admin-protected CRM operations:

- `ADMIN_ACCESS_TOKEN` or `CALI_ADMIN_TOKEN`
- `CALI_API_URL`

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
