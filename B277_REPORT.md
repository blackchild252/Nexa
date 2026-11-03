# B277 — V5.99.31 (checkpoint 6)

## Changed (4 one-line imports; no other code changed)
A TypeScript check of src (standalone config, no node_modules) listed 18 "Cannot find name" errors. 14 were real: a name used but never imported or defined, which throws a ReferenceError the moment that line renders. The other 4 are `__DEV__`, a React Native global, and are expected.
- src/app/leisure/ball-house/index.tsx: NexaPressable used 10 times, not imported. The Ball House screen would have crashed on render. Now imported from motion.
- src/YaayzNativeAd.tsx: NexaPressable used in the "Try again" button of the ad error state, not imported. Now imported from motion.
- src/MarketplaceScreen.tsx: ratingLabel used in the seller rating line (shops that have reviews), not imported. Now imported from marketplaceStoreUtils.
- src/MoneyDashboard.tsx: `<Subscription />` rendered by the "subscription" view, not imported. Now imported from ./Subscription (checked: no import cycle). Nothing currently opens that view, so this was a latent crash.
- Result: TS2304 errors 18 to 4. Eight extra "children is missing" and prop-type messages now appear on the newly resolved NexaPressable lines; they are the same environment noise as the ~340 already in the baseline (React types are not installed here), not new defects.
- New: server/v5_99_31_b277_block_guards.contract.test.js (4 checks), registered in scripts/release-gate.mjs.

## Checked and left alone
- `UPLOAD_TIMEOUT_MS` in src/api.ts is unused, but it is a duplicate: the real value (90 s) comes from nexaNetworkPolicy.js through timeoutFor, and two guard tests pin the api.ts line. Harmless; not changed.
- `ambient` in src/NexaDamiRobot.tsx is read from the motion settings and never used. It may be an unfinished ambient animation, so it is not removed without your OK.

## Result (per-file, 20 s limit, 8 at a time)
Start of B277: 427 pass of 435 files. Now: 427 pass of 436 plus v5_99_8, which passes once these notes exist (checked on its own: see below); the new guard passes. The 8 others that still fail here are unchanged: b144 (5 files) and v5_98_48 need dotenv or better-sqlite3; v5_71_0 needs node_modules (passes with CI=true); b91_repair1 passes alone (about 5 s) but hits the 20 s limit under load.

## Not tested
Phone (none of the four screens was opened; the fixes are source-level), full typecheck, EAS, Playwright, anything needing node_modules, the dotenv and better-sqlite3 files.
