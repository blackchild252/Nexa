# B533 — Release contract drift repair

## Implemented

- Updated a historical contract assertion to check the current active Main roadmap block (M7516–M7540) instead of an obsolete M7191–M7215 pointer.
- Fixed the release enforcement fixture so pre-existing historical placeholders are normalized before it tests a newly inserted placeholder, preserving the production ship guard.
- Updated the session-start contract to assert delegation to the authoritative release identity script instead of duplicating the archive naming pattern in another script.
- B532 changes remain included: Admin AAMI scoped grant context fails closed, and the Zeeza referral activation test queries after the activation event.

## Verification

- Focused release-contract tests: 11/11 PASS.
- `npm run verify:contract`: 1212 passed, 0 failed, 1 skipped.
- `npm run walk`: CLEAN (904/904 JavaScript syntax, 227 TypeScript files syntax-scanned, 774/774 relative imports, 56/56 route targets).
- `npm run release:identity`, `npm run release-audit` (direct script), `npm run roadmap:check`, and `npm run godhand -- verify`: PASS.
- Curated release gate was rerun; the three previously failing contracts now pass. Permanent seal is intentionally absent while the active roadmap block is open.

## NOT TESTED / BLOCKED

- `npm run test:server`: 6063 passed, 54 failed, 47 skipped. This remains a failed suite, not a pass.
- `npm run deps:preflight`: BLOCKED by missing root/server packages. `npm ci` did not complete because npm registry fetches repeatedly failed with `EAI_AGAIN`.
- M7527 real HTTP/SQLite failure-injection acceptance remains blocked; complete 36-tile Admin AAMI API migration; browser activation/login/revocation and Vendor→Staff acceptance; dependency-backed typecheck; live Central/Main/Admin endpoints; production credentials/URLs; device/native acceptance; deployment and launch.

No release seal or cumulative archive is issued while the active M7516–M7540 roadmap block remains open.
