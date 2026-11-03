# B271 — V5.99.25 (checkpoint 1 of M4250–M4274)

## Devil's walk result (V5.99.24)
Passed: identity, seal, release audit; syntax of all JS/MJS/CJS and TS/TSX; every client /api path has a server route; the 22 routes without auth are meant to be public; SQL with interpolated parts uses allowlisted names; no real secrets; no undeclared imports in src/ or server/.
Found: one real bug (11px headings), many stale tests, one legacy-shell import.

## Changed
- APP EDIT: src/Subscription.tsx — seven headings fontSize 11 -> 12.
- Tests follow code: v5_19_0, v5_47_0, v5_48_0, v5_55_0, v5_98_27, v5_98_28, v5_98_72, v5_98_73, v5_98_74, v5_98_79 (nav labels / provider key); v5_98_61, v5_98_81, v5_98_82, v5_98_84, v5_98_86 (Subscription); yaayz_b64, yaayz_discovery_feed (switch state).
- New: server/v5_99_25_b271_block_guards.contract.test.js (4 checks), registered in scripts/release-gate.mjs.

## Result (per-file, 20 s limit, no node_modules)
Before: 375 of 430 pass. After: 386 of 431 pass. 11 files fixed, 1 new guard file, 0 new real failures.

## For owner review
- Root app/_layout.tsx imports expo-splash-screen, not in package.json (legacy shell; not touched).
- 12px Subscription headings have not been seen on a phone.

## Still failing / not done
Old-version and release-gate-registration checks in historical tests, 6 files needing dotenv/better-sqlite3, 7 slow-diff time-outs, M4147, M4233–M4236, M4257–M4274.

## Not tested
Phone, typecheck, EAS, Playwright, anything needing node_modules.
