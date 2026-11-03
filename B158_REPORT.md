# NEXA V5.98.10 B158

EAS link run (the V5.98.9 release seal is one-way and cannot be overwritten, so the changed build is sealed as V5.98.10; Batch advances by 1).

## Changed
- `app.json`: added `expo.owner` = `primenexas-team` and `expo.extra.eas.projectId` = `07042204-0808-455d-a149-7ca2ff45b2a9` (both copied from the Expo dashboard "Project details" screen; slug `nexa` matches). Version fields advanced to 5.98.10. `android.versionCode` and `ios.buildNumber` (5981) unchanged (pinned by existing tests).
- `package.json`, `server/package.json`, `package-lock.json`, `src/theme.ts`, `README.md`, `AGENTS.md`, `LAUNCH_HANDOFF.md`, `VERSION.md`, `PROJECT_MEMORY.json`: current state synchronized to B158.
- `server/b155_launch_config.contract.test.js`: README header expectation moved to V5.98.10 B158.

## Effect
`npm run launch:preflight` no longer reports the missing EAS projectId or owner.

## Not done
Running `eas build` (needs your Expo login), the full server suite and `npm ci` (no network here).
