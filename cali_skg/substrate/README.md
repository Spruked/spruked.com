# CALI Unified Substrate

This directory is CALI's low-latency operational substrate inside the Spruked.com WSL runtime.

The canonical legacy archive remains read-only at:

`/home/bryan/projects/spruked.com/Spruked_Vault_System/cali_legacy/spruk_legacy_orb`

`CALI_LEGACY_SOURCE_DIR` may override that source path.

## Runtime semantics

- `memory/legacy_conversations/` — CALI's inherited prior conversations with Bryan. These records establish autobiographical continuity. Historical assistant statements are remembered as prior conversation and are **not** automatically treated as present-day truth.
- `substrate/apriori/seeds/` — SeedVault reasoning/knowledge frameworks. New reasoning seeds such as paradox and non-monotonic logic can be dropped into the canonical archive and added to the asset set without changing the memory schema.
- `substrate/behavioral/` — inherited CALI behavioral/tone anchors.
- `substrate/domain_knowledge/` — structured domain knowledge and cross-domain routing data.
- `substrate/evidence/` — governed claims and MORB execution evidence with provenance.
- `substrate/legacy_state/` — historical operational/state records.
- `assets/voice/cali_voice.pt` — CALI's canonical voice identity asset.
- `substrate/tool_manifests/` — live research/tool manifests. These are capabilities, not memories.

## Import

The running service boots through `cali_skg.api.cali_routes_memory:app`. On first use, the wrapper initializes the unified substrate when `CALI_UNIFIED_MEMORY_BOOTSTRAP` is enabled (default).

Manual import/status commands:

```bash
python -m cali_skg.scripts.import_legacy_substrate
python -m cali_skg.scripts.import_legacy_substrate --status
```

Use `--overwrite` only when intentionally refreshing a changed local mirror from the canonical archive. The importer never modifies the source archive.

## Retrieval contract

CALI receives bounded retrieval results rather than entire vault files. The 7B model gets:

1. relevant prior-conversation records,
2. matching SeedVault reasoning options,
3. matching approved research/tool-manifest entries when available,
4. existing live site/runtime/SKG context.

Current verified runtime/site evidence outranks stale historical statements when they conflict.
