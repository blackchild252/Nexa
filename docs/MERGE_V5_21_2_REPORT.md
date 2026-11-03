# Merge: NEXA_V5_21_1_B57_CP26_SECURITY + NEXA_V5_21_2_FIXES_CHECKPOINT

Base = FIXES checkpoint (it already contained all CP26 security work plus CP27 ticker and CP28 tidy; only 10 files differed from CP26).
Restored from CP26 zip: 239 root reports/logs -> `docs/archive/` (byte-identical), 29 files in `assets/design/`.
Dropped (generated/local, gitignored): `.expo/`, `expo-env.d.ts`, `server/nexa.db`, `-shm`, `-wal`.
Only edit made on top of the two zips: `server/v3_83_1_uiAudit.test.js` Sentry pin 8.28.0 -> ~7.2.0 (matches package.json + lockfile).
Tests (node:sqlite shim, no better-sqlite3 here): 1016/1016 pass. Not run: typecheck, device, real better-sqlite3.
