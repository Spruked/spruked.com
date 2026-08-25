# Spruked Orb Assistant

Spruked's Orb Assistant is the local CALI/ORB support layer for the Spruked website and admin CRM.

The active runtime is website-first:

- cognition lives in `cali_skg/`
- CRM memory lives in the R-drive substrate
- public/admin ORB requests enter through the Spruked Next.js routes
- voice is served by the local Kokoro runtime
- Electron is only an optional Dock Station adapter, synced from Orb Weaver

## Current active topology

| Layer | Active path / service | Role |
| --- | --- | --- |
| Website repo | `/home/bryan/projects/spruked.com` | Next.js site, `/admin`, `/api/orb`, `/api/cali/*` proxy |
| CALI API service | `spruked-cali-api.service` on `127.0.0.1:8022` | FastAPI CALI CRM/cognition routes |
| CALI CRM frontend | `spruked-cali-crm-frontend.service` on `http://localhost:21010/` | Local admin/CRM UI |
| Existing Spruked site service | `spruked-site.service` on `http://localhost:3001/` | Existing local Spruked site runtime |
| CRM substrate | `/mnt/c/mnt/r/R_Drive_Substrate/crm` | Authoritative CALI CRM SQLite/vault storage |
| Optional Electron dock | `electron_dock_adapter/` | Dock Station adapter only |
| Pointer escalation | `pointer_escalation/` | Shared pointer recovery/escalation contracts |
| Runtime tools | `tools -> /home/bryan/projects/Orb_Weaver/tools` | Canonical Orb Weaver operator/runtime tools |
| Admin awareness | Spruked `/admin`, CALI CRM on `21010`, CALI API on `8022` | Owner ORB navigation and operator scan surface |

## Non-negotiable ownership rules

1. Electron does not own cognition, memory, voice, routing, CRM data, or tool authority.
2. Electron may exist only as a Dock Station adapter surface.
3. CALI cognition and CRM APIs live in `cali_skg/`.
4. The website ORB uses verified route/tool/pointer context before movement.
5. If a destination or pointer cannot be verified, the ORB must fail closed and refuse movement.
6. Generated state belongs in the configured vault/substrate, not in loose WSL-home folders.
7. The owner ORB is allowed to inspect Spruked admin/CRM sections, but only through verified admin routes, authenticated operator context, and logged tool/pointer authority.

## Important folders

```text
Orb_Assistant/
├── cali_skg/                 # CALI API, CRM, cognition, route handlers
├── CALI_System/              # Local CALI system assets/state used by this service copy
├── electron_dock_adapter/    # Byte-for-byte sync from Orb Weaver adapter
├── pointer_escalation/       # Pointer runtime + human escalation contracts
├── tools -> .../Orb_Weaver/tools
├── docs/                     # Local continuity/reference docs
└── archive/                  # Preserved legacy folders and old runtime clutter
```

Archived clutter includes:

- old WSL-home `/home/bryan/spruked.com`
- old root `CALI_SKG_DB`
- old `.orb-assistant` Electron profile
- old Spruked-specific dock adapter replaced by the Orb Weaver adapter
- dead full-Electron launch/API stubs

## Pointer escalation

Spruked now has the shared pointer escalation folder:

`Orb_Assistant/pointer_escalation/`

It contains the same core contracts used by Orb Weaver:

- `pointerPlotTypes.ts`
- `pointerResolution.ts`
- `pointerRuntime.ts`
- `orbEscalation.ts`
- `orbState.ts`
- `pointer_plot_schema.py`
- `promotion.py`
- `scan_extraction.py`

Purpose:

- resolve visitor intent against verified pointer targets
- recover uncertain/stale pointers without fabricating guidance
- enforce the point → ping → ploop lifecycle
- open human escalation only through explicit/confirmed escalation paths

Pointer policy:

- `VERIFIED` and `STABLE` targets may point only when `runtime_policy.may_point === true`
- uncertain, missing, stale, hidden, conflicting, or invalid targets must halt safely
- owner verification may grant pointer guidance, but not click/navigation authority by default

## Tools

Spruked Orb Assistant has access to the canonical Orb Weaver tools through:

`Orb_Assistant/tools -> /home/bryan/projects/Orb_Weaver/tools`

Current tool set:

- `check_weaver_runtime.sh`
- `kokoro_openai_tts_server.py`
- `start_kokoro_tts.sh`
- `orb_mcp_host_relay.py`
- `start_orb_mcp_host_relay.sh`
- `orb_mcp_test_pad.py`

These tools are support/adapter tools. They do not own persistent data. Logs, memory, scan results, pointer maps, and generated state must go through the canonical vault/substrate.

## Admin navigation and awareness

The owner/admin ORB must be able to:

- navigate verified Spruked admin routes such as `/admin`
- inspect CALI CRM/admin status through `http://localhost:21010/`
- use the CALI API behind the CRM frontend on `127.0.0.1:8022`
- hand admin/customer/contact datasets into CALI CRM import routes
- let Orb Weaver scan configured admin sections during authenticated owner crawls

This does not permit blind movement. The rule remains: if CALI cannot verify the route identity or pointer target, she must not navigate.

## Electron dock adapter

`electron_dock_adapter/` is intentionally synced byte-for-byte from:

`/home/bryan/projects/Orb_Weaver/Orb_Assistant/electron_dock_adapter`

Do not make Spruked-specific behavior changes inside this adapter unless the canonical Orb Weaver adapter is changed first and then re-synced.

Run the adapter:

```bash
cd /home/bryan/projects/spruked.com/Orb_Assistant
npm run dock
```

The root `package.json` maps:

```json
{
  "start": "npm run dock",
  "dock": "electron electron_dock_adapter"
}
```

## CRM bridge

Orb Weaver signup/customer imports can land in CALI CRM through:

- `POST /cali/imports/datasets`
- `POST /cali/imports/orb-weaver/customer-signup`

Through the website proxy:

- `POST /api/cali/imports/datasets`
- `POST /api/cali/imports/orb-weaver/customer-signup`

Admin token required:

- `ADMIN_ACCESS_TOKEN`
- or `CALI_ADMIN_TOKEN`

## Health checks

```bash
systemctl --user is-active spruked-cali-api.service
systemctl --user is-active spruked-cali-crm-frontend.service
systemctl --user is-active spruked-site.service

curl -H 'Authorization: Bearer spruked-admin-local' \
  http://127.0.0.1:21010/api/cali/status

curl http://127.0.0.1:21010/admin
curl http://127.0.0.1:3001/
```

Expected live CRM signal:

- `status: active`
- `contacts: 10` from the R-drive CRM substrate

## More detail

See:

- [`docs/ORB_ASSISTANT_RUNTIME_WIRING.md`](docs/ORB_ASSISTANT_RUNTIME_WIRING.md)
- [`pointer_escalation/README.md`](pointer_escalation/README.md)
- [`../doc/admin-crm.md`](../doc/admin-crm.md)
