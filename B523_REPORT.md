# B523 Report — Signed Central Privileged-Access Receiver (Main)

**Identity:** NEXA Main V6.1.77 B523, build 6342. Unsealed local development checkpoint.

## Built

- Added `POST /central/v1/privileged-access/events`, a server-to-server receiver protected by key-ID-selected HMAC-SHA256 and exact envelope/data allowlists.
- Enforced a fixed Central issuer/audience and NEXA Main company/product scope, five-minute freshness, target identity verification, positive per-application sequence numbers, event-ID fingerprinting and idempotency.
- Added explicit grant/revoke/suspend/restore state transitions in a separate company-scoped ledger. Revocation/suspension revoke all active Main sessions for the target user.
- Kept this state separate from Main's global `admin_users` table; no account creation or direct global admin privilege assignment occurs.
- Added the focused suite to `npm run verify:contract` and documented the contract/limitations in `docs/CENTRAL_PRIVILEGED_ACCESS_CONTRACT.md` and the architecture decision record.

## Evidence

- Focused privileged-access + identity resolver + activation delivery tests: **22/22 PASS** using Node's built-in SQLite engine.
- `npm run verify:contract`: **1201 passed, 0 failed, 1 skipped** (1202 total). The skip is the existing runtime HTTP/SQLite failure-injection test because runtime dependencies are unavailable.
- `npm run walk`: **CLEAN** — 901/901 JavaScript syntax checks, 227 TypeScript files syntax-scanned, 774/774 relative imports, 56/56 route targets; 22 advisories.
- `npm run roadmap:check`: **PASS** — ten sequential blocks, 250 milestone slots (M7516–M7765).
- `node scripts/release-identity.mjs check`: **PASS** — V6.1.77 B523, build 6342.
- Full `npm run test:server`: **NOT COMPLETED** — the command exceeded the execution window while the repository's larger test runner was still running; no full-suite pass is claimed.
- `npm run typecheck`: **BLOCKED** — installed type metadata is incomplete and `expo/tsconfig.base` is missing (`TS2688`/`TS6053`).

## Not tested / still blocked

- Central event producer/client is not wired to Main's new receiver; deployed URLs/secrets, live cross-host delivery and production acceptance are NOT TESTED.
- Downstream Main authorization guards do not yet consume the new ledger as a complete access-control system. This receiver does not grant Main's global admin role. Operational privileged access must not be claimed until enforcement and Central delivery are integrated and verified.
- AAMI Admin's separate target receiver remains incomplete. Browser/device/native acceptance, full runtime suite with all dependencies, production deployment and launch were not performed.
