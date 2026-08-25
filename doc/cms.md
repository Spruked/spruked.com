# Spruked Content Backend

This project now ships with a lightweight content backend powered by Supabase. You can edit landing-page copy without redeploying by updating the records stored inside a single `page_content` table.

## Scope note

This document covers content CMS only (`/api/page-content`).
Admin CRM and operations workflows are documented in `doc/admin-crm.md`.

## 1. Environment variables

Copy `.env.example` to `.env.local` and provide Supabase credentials plus an admin token used for API writes:

```
SUPABASE_URL=your-project-url
SUPABASE_ANON_KEY=public-anon-key
SUPABASE_SERVICE_ROLE_KEY=service-role-key
ADMIN_ACCESS_TOKEN=choose-a-long-random-token
```

> Keep the service role key and admin token private. Never expose them in client bundles.

## 2. Database schema

Run the following SQL snippet inside the Supabase dashboard:

```sql
create table if not exists page_content (
  slug text primary key,
  content jsonb not null,
  updated_at timestamptz default now()
);
```

Seed the table with the default payloads from `data/page-content.ts` if you want the UI to source data before any edits occur.

## 3. API workflow

- `GET /api/page-content?slug=true-mark-mint` — Returns the merged (remote or default) JSON payload.
- `PUT /api/page-content?slug=true-mark-mint` — Updates the record. Requires `Authorization: Bearer <ADMIN_ACCESS_TOKEN>`.

## 4. Admin editor

Visit `/admin` while running `npm run dev`. The page lets you:

1. Select a slug (`true-mark-mint` or `goat`).
2. Fetch the current JSON payload.
3. Paste an admin token and push updates via the API.

For production, gate the route behind authentication or protected hosting (e.g., password-protected preview, Supabase Auth, Clerk, etc.).

## 5. Consuming content

Server components call `getPageContent(slug)` to pull data. If Supabase credentials are missing, the helper automatically falls back to the defaults declared in `data/page-content.ts`, so local development remains zero-config.

## 6. Admin coexistence


Happy editing.
[Footer Navigation]
See the site footer (components/layout/Footer.tsx) for canonical navigation links and the current site map.
