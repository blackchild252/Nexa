# B525 Report — Central Privileged-Access Guard Contract Hardening

**Identity:** NEXA Main V6.1.79 B525, build 6344. Unsealed local development checkpoint.

## Changes

- Corrected stale tests that incorrectly treated a signed `role.granted` event as immediately active. Approval now remains `pending_activation` until the separate signed `role.activated` event confirms target activation.
- Added `createCentralRoleGuard()` as a reusable Express middleware for Main routes that explicitly require a Central-governed role. It fails closed unless the scope is exactly `nexa` / `nexa-main`, the authenticated user has an allowlisted role, and the stored grant is both `active` and `activationConfirmed=1`.
- Guard responses deny unauthenticated requests (401), missing/pending/revoked/suspended grants (403), and invalid policy configuration or storage errors (503). The guard does not consult or mutate Main's global `admin_users` table.
- Expanded regression tests for the pending → active lifecycle, session revocation, role guard acceptance, and fail-closed scope/status handling.
- Updated the Central privileged-access contract and the historical M7220 status to PARTIAL. The active Main roadmap pointer remains M7516–M7540; this cross-product integration work does not count as progress against that backup-retention block.

## Evidence

- Focused `server/centralPrivilegedAccess.test.js`: **7/7 passed**.
- `npm run verify:contract`: **1202 passed, 0 failed, 1 skipped** (1203 total). The skip is the existing real HTTP/SQLite failure-injection test for M7527 because required runtime dependencies are unavailable.
- `npm run walk`: **CLEAN** — 901/901 JavaScript syntax checks, 227 TypeScript files syntax-scanned, 774/774 relative imports, 56/56 route targets; 22 advisories.
- `npm run roadmap:check`: **PASS** — ten sequential blocks, 250 milestone slots (M7516–M7765).
- `node scripts/release-identity.mjs check`: **PASS** — V6.1.79 B525, build 6344.

## Not tested / still blocked

- The reusable guard is tested in isolation but is **not wired into existing privileged business routes**. Do not claim operational role-based access until each intended route uses it and route-level tests prove access denial/allowance.
- Central sender integration, production URLs/secrets, separate-process/live cross-host delivery, real Main HTTP/SQLite failure injection, full `npm run test:server`, dependency-backed typecheck, browser/device/native acceptance, deployment and launch were NOT TESTED.
- Main M7527 remains BLOCKED: the runtime test skips because `bcryptjs`, `better-sqlite3`, `cors`, `dotenv`, `express`, and `multer` are unavailable in this workspace.
- No release seal was created; no production services, EAS, stores or physical devices were used.

## Next authorized work

1. Wire the Central role guard only into clearly identified NEXA/Main privileged routes after checking their existing authorization semantics; add route-level allow/deny tests.
2. Keep Central sender wiring and AAMI Admin receiver work separate and blocked until their matching contracts are implemented and tested.
3. Resolve M7527 only when the runtime dependencies can be restored locally and the actual HTTP/SQLite failure-injection test executes rather than skips.
