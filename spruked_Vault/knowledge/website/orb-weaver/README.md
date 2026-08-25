# Orb Weaver website knowledge

This directory is the imported, crawl-derived website context for `spruked.com`.
The source is `/home/bryan/projects/Orb_Weaver/vault_system/clients/spruked.com`.

These artifacts are used as website knowledge and live pointer guidance. They
are not the protected `Orb_Assistant/CALI_System` vault and must not replace or
modify that vault.

Import policy:

- Include only website crawl, route, catalog, retrieval, source-validation,
  knowledge-graph, and pointer-map artifacts.
- Exclude Orb Weaver mail, CRM, sponsor, local-index, and other client-private
  context from the website runtime.
- Treat `latest_crawl.json` as the source snapshot and the derived JSON files as
  crawl products generated from that snapshot.
