# Spruked ORB crawl 7 bundle

This server-only bundle is copied from Orb Weaver's completed Spruked crawl 7
(`2026-09-25T11:52:39.507787`). It contains the source crawl, current snapshot,
compiled Website ORB context, pointer plot map, retrieval and lexical indexes,
route/source validation, scan-stage data, commercial catalog, and ORB learning
artifacts.

The runtime loader reads `history/crawl_7.json` by default. Override with
`SPRUKED_ORB_CRAWL_PATH` when running a different crawl artifact.

LiDAR geometry remains runtime evidence: the crawl supplies pointer identities,
locators, and LiDAR candidate metadata, while the browser measures current DOM
coordinates and rechecks live targets before guidance.
