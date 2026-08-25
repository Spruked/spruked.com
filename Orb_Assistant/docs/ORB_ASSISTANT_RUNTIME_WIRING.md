# Spruked Orb Assistant Runtime Wiring

This document records the active Spruked ORB/CALI wiring after the July 19 cleanup.

## Runtime authority

Spruked's ORB is not a standalone Electron app. It is a website ORB backed by CALI SKG, CRM storage, verified tools, and verified pointer context.

| Capability | Owner |
| --- | --- |
| Public website ORB API | `/home/bryan/projects/spruked.com/app/api/orb/route.ts` |
| CALI API routes | `/home/bryan/projects/spruked.com/Orb_Assistant/cali_skg/api/cali_routes.py` |
| CALI CRM logic | `/home/bryan/projects/spruked.com/Orb_Assistant/cali_skg/core/cali_personal_skg.py` |
| CALI CRM memory | `/mnt/c/mnt/r/R_Drive_Substrate/crm/memory/cali_personal.db` |
| Admin CRM UI | `http://localhost:21010/admin` |
| Existing local Spruked site | `http://localhost:3001/` |
| Optional Dock Station adapter | `Orb_Assistant/electron_dock_adapter/` |
| Pointer escalation contracts | `Orb_Assistant/pointer_escalation/` |
| Canonical tools | `Orb_Assistant/tools -> /home/bryan/projects/Orb_Weaver/tools` |
| Admin navigation/scan awareness | Verified Spruked `/admin` route plus Orb Weaver authenticated admin seeds |

## Services

```text
spruked-cali-api.service
  WorkingDirectory=/home/bryan/projects/spruked.com/Orb_Assistant
  Serves CALI API on 127.0.0.1:8022
  Uses CALI_CRM_SUBSTRATE_ROOT=/mnt/c/mnt/r/R_Drive_Substrate/crm

spruked-cali-crm-frontend.service
  WorkingDirectory=/home/bryan/projects/spruked.com
  Serves local CRM/admin frontend on 21010
  Proxies /api/cali/* to 127.0.0.1:8022

spruked-site.service
  WorkingDirectory=/home/bryan/projects/spruked.com
  Serves the existing local site on 3001
```

## Tool access

`Orb_Assistant/tools` is a symlink to Orb Weaver's canonical tools folder.

The Spruked ORB may use these tools when explicitly configured by the runtime or operator:

- Kokoro TTS launcher/server
- Desktop MCP host relay
- MCP test pad
- Weaver runtime checker

Rules:

1. Tools are adapters and diagnostics, not memory owners.
2. Tool-generated durable data must go into the canonical vault/substrate.
3. Browser ORB code must not call local OCR/desktop tools directly.
4. Desktop/MCP tools are advanced adapter capabilities and should fail offline gracefully.

## Admin awareness

The owner ORB has admin/operator awareness for Spruked and CALI:

- Spruked admin surface: `/admin`
- CALI CRM frontend/admin surface: `http://localhost:21010/admin`
- CALI API surface: `http://127.0.0.1:8022`
- Orb Weaver authenticated admin scan seed: `/admin`

Orb Weaver may scan configured admin sections during authenticated owner crawls and records those pages as admin-section provenance. Public/free preflight scans stay public-only.

Full admin access means the owner ORB can inspect and reason over the admin section, route map, pointer map, CRM status, and import endpoints. It does not mean unverified clicks are allowed. CALI must fail closed when route identity is uncertain.

Validation:

```bash
cd /home/bryan/projects/spruked.com/Orb_Assistant
bash -n tools/*.sh
python3.12 -m py_compile tools/*.py
```

## Pointer escalation access

`Orb_Assistant/pointer_escalation/` holds the shared pointer runtime and escalation contracts. It gives the Spruked Orb Assistant the same doctrinal folder set used by Orb Weaver for:

- pointer plot schemas
- pointer resolution
- pointer runtime lifecycle
- recovery/promotion gates
- human escalation state

The Spruked ORB must use pointer escalation as a safety boundary:

```text
visitor intent
  -> approved route/tool context
  -> deterministic pointer resolution
  -> live DOM verification
  -> point/ping only if allowed
  -> refuse/handoff if uncertain
```

Never substitute a vaguely related route or DOM target. If CALI cannot verify the destination, CALI must not move.

## Electron dock adapter

`Orb_Assistant/electron_dock_adapter/` is copied byte-for-byte from Orb Weaver's canonical adapter.

The adapter's job is only to dock the ORB into a desktop/Dock Station surface. It must not become the source of:

- cognition
- memory
- CRM data
- voice policy
- route authority
- pointer authority

If the adapter needs a behavior change, change the Orb Weaver canonical adapter first, then resync Spruked.

## CRM import routes

CALI exposes admin-protected import endpoints for external app datasets:

```text
POST /cali/imports/datasets
POST /cali/imports/orb-weaver/customer-signup
```

Via the Spruked website proxy:

```text
POST /api/cali/imports/datasets
POST /api/cali/imports/orb-weaver/customer-signup
```

These import routes upsert contacts, record source links, and log import activities in the R-drive CRM substrate.

## Cleanup/archive locations

Legacy clutter was moved under:

`/home/bryan/projects/spruked.com/Orb_Assistant/archive/`

Important archives:

- `root_home_spruked_com_legacy_20260719T115451/`
- `electron_dock_adapter_spruked_before_orb_weaver_sync_20260719T113420/`
- `orb-assistant-profile-legacy-20260719T1116/`
- `electron_legacy_20260719T113237/`
- `electron_legacy_20260719T113311/`

The active website repo remains:

`/home/bryan/projects/spruked.com`
