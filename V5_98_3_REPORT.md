# NEXA V5.98.3 / B141 — Devil's Walk follow-up

Batch: **B141**
Milestones: none (patch release)
Status: **IMPLEMENTED / VALIDATED**

Follows V5.98.2 / B140 (see `DEVILS_WALK_REPORT.md`).

## Changes
- `server/v5_76_0_audio_upload_lifecycle.contract.test.js` (M1262): the test asserted `files === 0` immediately after the upload error callback. `createWriteStream` opens asynchronously and `_handleFile` deliberately retries its cleanup on the stream's `open` and `close` events, so the directory briefly still held the file. The test now waits (up to 1 s) for that cleanup to settle. Production code is unchanged. Before: about 1 in 4 isolated runs failed (also on the untouched V5.98.1 copy). After: 0 failures in 30 isolated runs.
- Version synchronized: package.json, package-lock.json (both entries), server/package.json, app.json, src/theme.ts, VERSION.md, PROJECT_MEMORY.json, the three roadmaps.

## Re-verified, no change needed [READ]
- Rate limiting: the AI (minute and day), realtime, auth, signup (email and account) and login (email and account) limiters are persistent and DB-backed (`persistent: true`). Only minor feature limiters are in-memory.
- Schema versioning: startup schema certification checks a version label (`NEXA_SCHEMA_VERSION`), an optional fingerprint, integrity and foreign keys. The version is a contract constant, not stored in `PRAGMA user_version`.

## Still open
Owner: EAS `projectId` (`eas init`), real iOS AdMob app ID, deliberate `NEXA_WALLET_MODE` / `MARKET_DATA_MODE`. Environment: `expo-av` -> `expo-audio` (needs a networked install and a device test). Structural: monolithic `server/index.js`.
