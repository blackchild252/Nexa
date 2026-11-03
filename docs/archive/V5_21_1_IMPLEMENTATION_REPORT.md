# NEXA V5.21.1 / B57 — Checkpoint 22 (Access screens: Subscription · Login/Signup · Staff · Admin Disputes)

Sidebar sweep (Home → Developer Console, 16 entries) was already sealed in CP2–CP21 and was not redone. This checkpoint covers the four screens outside the directory, in BOTH interfaces, kept light.

## What changed
- **Worlds** (`nexaWorlds.ts`): `subscription`, `auth`, `staff`, `disputes`. No poster, own prompt each, so nothing leaks between them or into other blocks. Royal Dark keeps a plain black base + a thin gold native layer (same approach as Extensions / Developer).
- **Royal Dark layer** `src/NexaDarkAccess.tsx` (new, one looping value): subscription = four thin gold tier steps lit in turn + a breathing gold ring; auth = thin gold padlock with breathing keyhole + two blinking dots; staff = three thin gold person outlines lit in turn; disputes = thin gold balance scale tilting. VIP a little brighter.
- **Earth Light layers** `src/NexaEarthAccess.tsx` (new, one loop per layer): subscription = four tier steps in the sky (blue, deep blue, green, gold) + three lamp buoys on the water; auth = white-glass padlock with glowing keyhole + small lighthouse; staff = three little people in the sky + a boat with three crew; disputes = tilting gold scale + a small seesaw plank with a gold and a blue ball. VIP: soft halo / gold spark.
- **Wiring**: `NexaEarth.tsx` (4 variants, sky + water mounts, 0.18 wash), `NexaWorldBackground.tsx` (`isAccess`, readability wash, dark layer only in Royal Dark).
- **Screens**:
  - `Subscription.tsx`: both returns sit in the `subscription` world; 20 plain object styles go through `ds()`.
  - `app/auth/login.tsx`, `app/auth/signup.tsx`: `RoyalBackground world="auth"`, scene is full-bleed (page padding moved inside the world), form centred as before.
  - `app/staff.tsx`: standalone route sits in the `staff` world. `StaffScreen.tsx` itself is NOT wrapped (the vendor dashboard embeds it inside Dream Marketplace); its 4 plain styles go through `ds()`.
  - `AdminDisputesScreen.tsx`: sits in the `disputes` world; 2 plain styles through `ds()`.
- Wrapper-only proof: reversing the `ds()` / world wrappers on `StaffScreen.tsx` and `AdminDisputesScreen.tsx` gives byte-for-byte the previous files; `Subscription.tsx` differs only by one `ds()` I added inside the loading-state style array.
- **Version bumped to 5.21.1** (per standing packaging rule): `package.json`, `server/package.json`, `app.json` (5 fields), `src/theme.ts` release, `VERSION.md`.
- Tests: `server/v5_21_0_access_block.contract.test.js` (9 tests). Older pins loosened only to allow the new branch: 15 B57 wiring tests (type unions, dim chain, wash line) and 3 version pins (`v5_20_0`, `v5_21_0_dual_theme`).

## Verification
- New tests 9/9; all B57 tests 200/200; B56 + release-consistency suites pass (211/211 together).
- Full `node --test server/*.test.js`: 997 tests. Untouched-zip baseline run the same way: 988 tests, 957 pass, 31 fail. After the loosened version pin the new run has the same 31 baseline failing names plus none new (one interim new failure, the B56 version check, was fixed).
- Syntax check (`tsc` transpile) of all 11 edited/new source files: clean.
- NOT verified: full type check, any device run (no `node_modules` here), and how any of the four screens look or move in either interface.

## Watch on device
- Auth: Royal Dark login/signup used to sit on the app gradient; it is now plain black plus the padlock layer. Padlock is at 66% across, 8% down; check it does not touch the title.
- Subscription / Staff / Disputes: symbols are upper right (66% across, 8% down) and low left on the water; check they stay behind the cards and stay readable.
- **Admin Disputes has no route.** `AdminDisputesScreen` is not mounted anywhere in `src` (the vendor dashboard has its own disputes tab), so it cannot be seen on a device until it is wired to an admin entry. I did not add a route (not requested).
- Staff route (`/staff`) hard-codes `isVendorOwner` and shop name "Dream Marketplace" (pre-existing, untouched).

## B57 checkpoint 23 — open items closed
- Admin Disputes route added at `/marketplace/disputes` (admin-only entry from Dream Marketplace; server `requireMallAdmin` unchanged). ADR-020.
- Duplicate `src/app/leisure.tsx`: already removed in checkpoint 18; nothing left to delete. `/leisure` is served by `src/app/(tabs)/leisure.tsx`.
- Server tests: 31 failing -> 0 code failures. 1 remaining is BLOCKED, not failed: `v4_19_foundation.test.js` needs `better-sqlite3` (no `node_modules` in the zip). Result without dependencies: 1003 pass / 1 blocked. Old version-pinned tests now assert "at least" (ADR-019); moved-code tests read the current files; `PROJECT_MEMORY.json` currentVersion corrected from 4.98.0 to 5.21.1. New test: `v5_21_1_admin_disputes_route.contract.test.js`.
- Launch config added: `eas.json` (development / preview / production), `Dockerfile`, `.dockerignore`, `.github/workflows/nexa-server-deploy.yml` (builds and pushes the image; rollout reports NOT CONFIGURED until `DEPLOY_HOOK_URL` is set).
- Still BLOCKED / NOT CONFIGURED: full `npm run typecheck` (needs `npm install`), `package-lock.json` (the quality workflow runs `npm ci`), EAS `projectId`, iOS `bundleIdentifier` and Android `package` in `app.json`, EAS environment variables (`EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SENTRY_DSN`), and a real hosting target.
