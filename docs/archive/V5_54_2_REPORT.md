# NEXA V5.54.2 — governance sync

Patch on V5.54.1 (Batch B91, no new milestones). Contains every V5.54.1 fix (see `V5_54_1_REPORT.md`).

## Why
V5.54.1 was delivered before archive naming/versioning rules existed in the project, and the roadmaps still named V5.54.0 as current. A different assistant could have reused a wrong name or version. Re-issuing different contents under 5.54.1 would itself break the new rule, so this is a new version.

## Changes
1. `AGENTS.md`: "Archive naming and versioning (mandatory)" - `NEXA_V<major>_<minor>_<patch>.zip` only, complete cumulative project, SHA-256, version equals `package.json`, patch vs minor bumps, full list of files a bump must update, Node 22+.
2. `PROJECT_MEMORY.json`: `archiveNaming` rule; `currentVersion`, `latestRelease`, `lastReleaseAudit`, `lastValidatedSuite` updated.
3. `PRIORITY_ROADMAP.md`, `TEMPORARY_ROADMAP.md`, `MASTER_ROADMAP.md`, `VERSION.md`, `README.md`: current release is V5.54.2.
4. Version bumped to 5.54.2 in `package.json`, `package-lock.json`, `server/package.json`, `app.json`, `src/theme.ts`.
5. `server/v5_54_1.contract.test.js`: new drift test (memory, AGENTS rule, roadmaps, VERSION.md, report file all match `package.json`).

Android `versionCode` stays 1 until a store build is cut.
