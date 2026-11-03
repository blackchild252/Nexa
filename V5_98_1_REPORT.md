# NEXA V5.98.1 / B139 — Devil's Walk fixes

Batch: **B139**
Milestones: none (patch release)
Status: **IMPLEMENTED / VALIDATED**

Patch release on batch B139. Source: the V5.98.0 Devil's Walk (see `DEVILS_WALK_REPORT.md`).

## Changes
- Removed superseded release zips V5.93–V5.97 and their checksums (archive 92 MB -> about 20 MB).
- Moved 78 unreferenced historical reports to `docs/archive/`.
- `src/GroupCallScreen.tsx`: guard for missing native WebRTC.
- B138/B139 release-contract tests accept any 5.98.x.
- Version synchronized: package.json, server/package.json, package-lock.json, app.json, src/theme.ts, VERSION.md, PROJECT_MEMORY.json.

## Owner actions still required
EAS `projectId` (`eas init`), real iOS AdMob app ID, deliberate `NEXA_WALLET_MODE` / `MARKET_DATA_MODE`, `expo-av` -> `expo-audio` migration (needs a networked install and a device test).
