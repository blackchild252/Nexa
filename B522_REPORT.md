# B522 Report — Main-to-Central Signed Reporting Adapter

**Identity:** NEXA Main V6.1.76 B522, build 6341. Unsealed local development checkpoint.

## Built

- Added a server-side HMAC-SHA256 client for Central's source-specific `/central/v1/report-intake` and `/central/v1/report-intake/status` endpoints.
- Adapter requires `AAMI_CENTRAL_REPORT_BASE_URL` and a server-only `AAMI_CENTRAL_REPORT_SECRET` of at least 32 characters. HTTPS is required except for localhost test development; redirects are rejected and requests time out safely.
- Main maps its role-allowed categories to Central categories and sends summary, bounded description/details and safe source identifiers without copying source-record contents.
- Central report receipt is acknowledged only after a valid Central report reference and status are returned. The existing Main ledger stores only an opaque owner-scoped request hash and expiry metadata; retries use the same key so Central's content fingerprint governs duplicate handling.
- Added owner-scoped signed status lookup by Central report reference. The source-scoped report list/history endpoint remains unavailable because Central has not defined one.
- Updated `docs/AAMI_CENTRAL_REPORTING_CONTRACT.md`, `docs/CENTRAL_REPORTING_CONTRACT.md`, the M7191–M7215 roadmap status, and this release handoff.

## Evidence

- `npm run verify:contract`: **1195 passed, 0 failed, 1 skipped** (1196 total). The skip is the existing runtime HTTP/SQLite failure-injection test; missing server dependencies prevent it from running.
- `node --test server/centralReporting.contract.test.js`: **41/41 PASS**.
- `npm run walk`: **CLEAN** — 899/899 JavaScript syntax checks, 227 TypeScript files syntax-scanned, 774/774 relative imports, 56/56 route targets; 22 non-blocking advisories.
- `npm run roadmap:check`: **PASS** — ten sequential blocks, 250 milestone slots.
- `node scripts/release-identity.mjs check`: **PASS** — V6.1.76 B522, build 6341.
- Central `npm test`: **157/157 PASS**; focused Central report case + HTTP tests **25/25 PASS**.
- `node integration/main-central-reporting.local-test.mjs`: **PASS** — real localhost HTTP between Main's adapter and Central's signed report endpoint; HMAC, source scope, report details/source references, idempotent retry, minimized Main response and owner-only status lookup.

## Not tested / blocked

- Production URL/keys/HTTPS, deployed or separate-process integration, live data and production delivery.
- Main server runtime with actual SQLite and all server dependencies, full `npm run test:server`, dependency-backed TypeScript typecheck, browser/device/native acceptance, and production deployment/launch.
- Central report list/history and Central-originated notification events. Main M7204/M7206 remain parked; M7208 is partial. Main M7527 remains blocked pending runtime HTTP/SQLite failure-injection execution.
- No production service, email provider, device, store or deployment was contacted or changed.
