# M7191–M7215 Execution Follow-up — 2026-10-11

**Project identity:** NEXA MAIN V6.1.76 B522 / Build 6341 (unsealed development checkpoint).

## Change

- Implemented a server-side Central report client configured only by `AAMI_CENTRAL_REPORT_BASE_URL` and `AAMI_CENTRAL_REPORT_SECRET`; non-HTTPS URLs are rejected except localhost for local development.
- Main signs canonical JSON with HMAC-SHA256 and timestamp freshness is enforced by Central. Main category values map to Central’s own report taxonomy. Report description and safe source identifiers are carried as a separate bounded details field; source record contents are never copied.
- Main returns success only after Central returns a valid report reference and status. The local owner-scoped opaque request-key ledger is reserved only when the provider is configured. Retries reuse the same key, allowing Central to return the existing case or reject changed content.
- Added signed status lookup by report reference. Central list/history and Central-originated notification feed remain unavailable, so M7208 is PARTIAL and M7204/M7206 remain PARKED.

## Evidence

- `npm run verify:contract`: 1195 passed, 0 failed, 1 skipped. The skip is the existing HTTP/SQLite failure-injection test, which cannot execute because server dependencies are absent.
- `node --test server/centralReporting.contract.test.js`: 41/41 PASS.
- Central `npm test`: 157/157 PASS.
- Central report-case + signed HTTP tests: 25/25 PASS.
- `node integration/main-central-reporting.local-test.mjs`: PASS — HMAC authentication, exact source scope, details/source references, same-key retry, minimized response and owner-only status.

## Not tested

Production URL/keys/HTTPS, deployed service behavior, separate-process acceptance, real Main SQLite runtime, Central list/history, Central notification events, full Main server suite, dependency-backed typecheck, browser/device/native acceptance, deployment and launch remain NOT TESTED. Localhost integration with test-only keys is not production acceptance.
