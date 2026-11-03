# B274 — V5.99.28 (checkpoint 4 of M4250–M4274, closes the block)

## Changed
- No app or server code changed. Tests only.
- v5_98_45 and v5_99_0 compile src/marketplaceStoreUtils.ts with `tsc`. TypeScript 6 refuses file arguments next to a tsconfig.json (error TS5112), so both failed here. They now try the normal command first and retry with `--ignoreConfig` only if that fails, so TypeScript 5.9 (the project's version) is unchanged. 25 and 11 checks pass.
- New: server/v5_99_28_b274_block_guards.contract.test.js (4 checks), registered in scripts/release-gate.mjs.

## Checked and left alone
- Root `app/_layout.tsx` imports `expo-splash-screen`, which is not in package.json. The active route surface is `src/app` (package main is expo-router/entry; ARCHITECTURE_RECONCILIATION_V3_60_41.md calls `app/` recovery-only), and `src/app/_layout.tsx` does not import it. So the import cannot break the running app. Not deleted (the architecture note says no deletion without a route audit). Decision: leave it.
- b91_repair1 is slow because one check really parses all 184 src files with TypeScript (about 5 s alone). It is not a bug; it can pass the 20 s limit only when the machine is busy.
- v5_71_0 passes with CI=true (28 of 28).

## Result (per-file, 20 s limit, 8 at a time)
Start of B274: 422 pass of 433 files. Now: 426 pass of 434 (v5_98_45, v5_99_0, v5_99_8 and the new guard now pass). The 8 that still fail here: b144 (5 files) and v5_98_48 need dotenv or better-sqlite3; v5_71_0 needs node_modules (passes with CI=true); b91_repair1 passes alone (about 5 s) but hit the 20 s limit when 8 files ran together. Guard: 4 of 4 pass.

## Still open
M4147 (device sweep), M4233–M4236 (need your OK to remove), b144 (5 files) and v5_98_48 (need dotenv or better-sqlite3; cannot be installed here, no network).

## Not tested
Phone, typecheck, EAS, Playwright, anything needing node_modules, the dotenv and better-sqlite3 files.
