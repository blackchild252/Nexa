# B526 Report — Admin AAMI Scoped Access Receiver

**Identity:** NEXA Main V6.1.80 B526, build 6345. **State:** unsealed local checkpoint.

## Implemented

- Added `server/adminAamiAccess.js` as a separate Admin AAMI access boundary in the existing Main backend. It uses an independent `admin_aami_privileged_access` table and event ledger rather than Main's global `admin_users` table or the NEXA-only `central_privileged_access` table.
- Added the signed server-to-server endpoint `POST /central/v1/admin-aami/privileged-access/events`, with a separate `AAMI_CENTRAL_ADMIN_AAMI_ROLE_GRANT_KEYS` key map and audience. The envelope enforces HMAC-SHA256, exact fields, a five-minute freshness window, supported company/product scope, existing active email-verified target identity, idempotent event IDs, and monotonic per-application sequences.
- Admin AAMI is treated as an umbrella portal, not a company. Grant scope is limited to `companyId=nexa|lordgistics` and `productId=admin-aami`.
- `role.granted` stays `pending_activation`; a separate signed `role.activated` event is required before access becomes active. Revocation/suspension require an existing grant and invalidate active Main sessions. State transitions and restore behavior are checked.
- Added `createAdminAamiRoleGuard()` for future company-specific protected routes. It fails closed for invalid policy configuration, unauthenticated users, non-allowlisted roles, unsupported companies, and grants that are not active and activation-confirmed.
- Added authenticated `GET /api/admin-aami/access`, returning only the current user's scoped grant status.
- Added architecture decision documentation. No account-creation path, global administrator mutation, production integration, or deployment was added.

## Verification evidence

- Focused Main + Admin AAMI receiver/guard tests: **14/14 PASS**.
- `npm run verify:contract`: **1,209 passed, 0 failed, 1 skipped** (1,210 total). The skip is the pre-existing runtime HTTP/SQLite failure-injection test blocked by unavailable server dependencies.
- `npm run walk`: **CLEAN** — 903/903 JavaScript syntax checks, 227 TypeScript files syntax-scanned, 774/774 relative imports, 56/56 route targets; 22 advisories.
- `npm run roadmap:check`: **PASS** — ten sequential blocks, 250 milestone slots, M7516–M7765.
- `node scripts/release-identity.mjs check`: **PASS** — V6.1.80 B526, build 6345.

## Not tested / still blocked

- The role guard is not yet wired into actual Admin business-operation routes; the current Admin AAMI namespace exposes only the user's own access-status endpoint. Do not claim full Admin operations are authorized by this new grant table yet.
- AAMI Central sender wiring, live separate-process HTTP acceptance, deployed URLs/HTTPS/secrets, production database behavior, browser/device/native acceptance, deployment and launch are **NOT TESTED**.
- `npm run test:server` was attempted but did not complete within the execution window; no pass/fail totals are claimed.
- `npm run typecheck` is blocked by missing installed TypeScript/Expo definitions, including `expo/tsconfig.base` and multiple `@types` packages.
- Main M7527 remains BLOCKED because its real HTTP/SQLite failure-injection test is skipped when required runtime server dependencies are unavailable.

## Roadmap accounting

No milestone ID was assigned or retroactively completed. Main's active roadmap remains M7516–M7540 (backup retention); this cross-product prerequisite does not count as progress against that block. See the unallocated handoff note in `MASTER_ROADMAP.md`.

No seal, deployment, EAS build, store submission, or launch was performed.
