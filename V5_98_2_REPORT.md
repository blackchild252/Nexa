# NEXA V5.98.2 / B140 — Devil's Walk fixes

Batch: **B140**
Milestones: none (patch release)
Status: **IMPLEMENTED / VALIDATED**

Patch release following the V5.98.0 Devil's Walk (see `DEVILS_WALK_REPORT.md`). Supersedes V5.98.1, which carried the same fixes but left the Batch at B139; AGENTS.md requires every successful release run to advance the Batch by exactly +1, and a shipped version is never re-issued with different contents.

## Changes
- Removed superseded release zips V5.93-V5.97 and their checksums (archive 92 MB -> about 11 MB).
- Moved unreferenced historical reports to `docs/archive/`; anything linked from README, AGENTS or the roadmaps stays at the root.
- `src/GroupCallScreen.tsx`: guard for missing native WebRTC.
- B138/B139 release-contract tests accept later 5.98.x patches and later batches.
- Version synchronized: package.json, package-lock.json (both entries), server/package.json, app.json, src/theme.ts, VERSION.md, PROJECT_MEMORY.json, the three roadmaps.

## Owner actions still required
EAS `projectId` (`eas init`), real iOS AdMob app ID, deliberate `NEXA_WALLET_MODE` / `MARKET_DATA_MODE`, `expo-av` -> `expo-audio` (needs a networked install and a device test).
