# Backup retention and data lifecycle — execution evidence

**Product:** NEXA Main App only  
**Identity:** established by `npm run session:start` and `npm run release:bump` (V6.1.72 B518, build 6337)  
**Roadmap block:** M7516–M7540  
**Status:** 25/25 checklist milestones TESTED/PASSED at source/contract level; runtime database-failure injection remains NOT TESTED.

## Changes

- Retention windows treat blank configuration as the documented fallback rather than silently converting blank text to a one-day retention period.
- Invalid reference timestamps and empty/oversized user IDs fail before database mutation.
- Notification-delivery child cleanup now fails closed: if it fails, the parent notification rows are not deleted in a partially applied purge.
- Repeated purges are tested as idempotent; owner scoping and count-only return shape remain covered.
- Added `server/dataRetention.test.js` to the canonical `npm run verify:contract` suite.

## Verification

- Focused retention + error-response source-contract suite: 7/7 PASS.
- `npm run verify:contract`: 1187/1187 PASS; route-level generic-error behavior has source-contract coverage, but a live database-failure HTTP injection remains NOT TESTED.
- `npm run godhand` and `npm run godhand -- verify`: PASS for product traversal only; these do not prove all roadmap milestones.
- `node --check server/dataRetention.js`: pending final run for this checkpoint.

## NOT TESTED / BLOCKED

- M7527: generic 503 response is source-contract tested; end-to-end HTTP error sanitization when the backing database throws remains NOT TESTED.
- Real production database retention scheduling, production restore, device/browser/native acceptance and live provider integrations were not tested in this run.
- The full `npm run test:server` suite was not rerun after the focused change; historical full-suite failures remain known and are not represented as fixed.

## Next

Verify and add a focused route-level test for generic database failure responses (M7527) before closing this block. Continue only from the independent Main roadmap.

## Runtime HTTP failure injection follow-up

- Added `server/v6_1_73_retention_http_failure.test.js` to the canonical contract command. When the required server dependencies are installed, it starts the real server against a throwaway SQLite database, injects a SQLite trigger failure during child delivery cleanup, and checks the generic HTTP 503, absence of internal diagnostics, and preservation of both parent and child rows.
- In this workspace the test is **SKIPPED**, not passed: `bcryptjs`, `better-sqlite3`, `cors`, `dotenv`, `express`, and `multer` are not resolvable, and the real HTTP harness cannot start. Runtime database-failure acceptance remains **NOT TESTED / BLOCKED** until dependencies can be restored and the test runs rather than skips.


## Follow-up checkpoint — V6.2.1 B547

- Fixed an unrelated Node 22 test-loader incompatibility in the activation-code UI contract tests; focused tests now pass 4/4.
- Canonical contract suite: 1225 passed, 0 failed, 1 skipped. The skipped test remains the M7527 runtime HTTP/SQLite failure-injection acceptance test.
- Runtime dependency installation was attempted but did not complete. The required Express/SQLite and supporting server packages remain unavailable, so M7527 is still **BLOCKED / NOT TESTED**. No milestone closure is claimed.

## B596 local hardening follow-up

- Strengthened the dependency-free M7527 route contract to assert authentication middleware is applied before the handler, the retention purge is inside the guarded path, the catch response is the fixed generic 503, and catch handling does not log or serialize error messages, stacks, database details, or tokens.
- Focused retention/error suite: 9 passed, 0 failed, 1 skipped. The skipped test is still the real HTTP/SQLite injection test; no runtime acceptance is claimed.
- Full canonical contract suite: 1,543 passed, 0 failed, 1 skipped.
- Devil's Walk: clean; JavaScript 950/950, TypeScript syntax 239 files, relative imports 802/802, route targets 59/59. Typecheck not run because dependencies are not installed.
- `roadmap:check`, God Hand traversal/verification and release identity passed.


## B600 follow-up — scalar-only retention configuration

- `boundedDays` now accepts only primitive numbers and numeric strings. Blank/null values keep the documented default; booleans, arrays, objects, boxed numbers and symbols also use the fallback rather than being coerced into day counts. Numeric values remain floored and clamped to the existing retention bounds.
- Added regression coverage for numeric strings, fractional numbers, booleans, arrays, plain objects, boxed numbers and symbols.
- Focused command: `node --test server/dataRetention.test.js server/v6_1_72_notification_retention_error.contract.test.js server/v6_1_73_retention_http_failure.test.js` — 10 passed, 0 failed, 1 skipped. The skip is the existing real HTTP/SQLite failure-injection acceptance test.
- Full `verify:contract` was attempted with `NODE_OPTIONS=--experimental-strip-types CI=true` but exceeded the available command window after tests 1–645; it is NOT recorded as a pass. A first invocation without the required Node type-stripping option produced expected `.ts` loader errors and is not valid suite evidence.
- This is a local configuration-validation improvement only; it does not change the status of M7527 or claim runtime HTTP/SQLite acceptance.
