# NEXA Main — B498 Report

**Version:** V6.1.52 B498 (build code 6317), established by `npm run release:bump`.

## Completed
- Revalidated the active Main-only M7116–M7140 stabilization block. Its local evidence remains documented, but M7121 (OAuth readiness) is BLOCKED on external provider/redirect/live-acceptance evidence. The existing M7141–M7165 payment-reconciliation slice remains a registered future block, not the active roadmap.
- Existing local contracts cover appeal/moderation evidence, financial operations, provider adapter readiness, references, sandbox separation and review-only reconciliation.
- `npm run verify:contract`: **944/944 passed**.
- Targeted appeal/identity, moderation/financial/provider and reconciliation tests: **65/65 passed**.
- `npm run godhand`: ordered product traversal complete; `npm run godhand -- verify`: PASS.

## NEXT-16 local implementation
- Hardened `server/providerReconciliationDiff.js` so missing, boolean, malformed, over-precision, and unsafe monetary values cannot be rounded into a false reconciliation match.
- Fixed the marketplace administrator-denial back control's accessibility label to match its accessible-control contract.
- Updated the historical responsive-navigation contract to validate the current release heading generically instead of requiring a retired V5 release line.
- Focused tests: provider reconciliation + responsive navigation + B189 interaction contract: **56/56 passed**. Expanded focused current-state/release metadata run: **68 passed, 1 historical skip, 0 failed**.
- `VERSION.md` now has an explicit current-version field so current release metadata checks agree with the canonical identity.
- `npm run verify:contract`: **945/945 passed**.
- `npm run godhand -- verify`: **PASS**.

## Release blocker
The last full `npm run test:server` run, before the NEXT-16 edits, reported **5,765 passed, 50 failed, 46 skipped** (5,861 total). The failures included missing runtime packages (`dotenv`, `better-sqlite3`, and others), dependency-backed TypeScript compilation failure, stale historical release assertions, and additional existing contract failures. The full suite was not rerun after NEXT-16 because the required packages remain unavailable; `npm ci --ignore-scripts` failed with an npm CLI exit-handler error. Therefore **B498 is NOT SHIPPED** and this artifact is a local-only checkpoint, not a release.

## Not tested / blocked
Live payment/provider acceptance, Sky Money credentials/provider approval, production settlement feed, dependency-backed typecheck, browser/device acceptance and OAuth production readiness remain NOT TESTED / excluded from local contract certification. OAuth readiness remains BLOCKED on external provider/redirect evidence. No production certification is claimed.


## NEXT-12 local-only fixes
- Fixed Google sign-in one-time-code race by requiring the conditional consume update to affect exactly one unexpired, unconsumed row before session creation.
- Corrected dependency preflight so an empty `node_modules` directory no longer counts as installed dependencies; it now lists missing root and server package manifests.
- Added regression coverage for the atomic consume guard and dependency preflight behavior.
- Focused tests: `server/googleAuth.contract.test.js` + `server/dependencyPreflight.contract.test.js`: **4/4 passed**.
- `npm run verify:contract`: **944/944 passed**.
- `npm run deps:preflight`: correctly reports missing installed package manifests and exits **2**.
- Full server suite remains blocked by absent runtime packages and the failures listed above. V6.1.52 B498 remains unsealed.

## Local suite continuation — 2026-10-10
- Reconciled current-status documentation with the locked V6.1.52 B498 identity (`README.md`, `VERSION.md`).
- Repaired the Marketplace pure-helper compile test so unrelated incomplete ambient type packages do not block that isolated compilation.
- `npm run verify:contract`: 945/945 PASS; `npm run godhand -- verify`: PASS; `npm run walk`: CLEAN.
- Full `npm run test:server` remains NOT COMPLETE: local runtime dependencies are absent and the runner timed out before its summary. Do not treat contract tests as a substitute for the full server suite.


## NEXT-18 — Expanded test runtime and cross-suite repair (2026-10-10)

**Implemented locally:** `scripts/run-server-suite.mjs` now supports configurable per-test timeout (`NEXA_TEST_TIMEOUT_MS`, default 120000 ms), configurable test-file concurrency (`NEXA_TEST_CONCURRENCY`, default 2), TAP log capture and concise failure summaries. The root `test:server` command now calls the runner directly instead of nesting npm invocations. Fixed `server/b144_wip9_variants.contract.test.js` to compile the pure TypeScript helper into a temporary directory before loading it; this removes a local `Unexpected token 'export'` test-harness failure.

**TESTED/PASSED:** `npm run verify:contract` — 945/945; `node --test server/b144_wip9_variants.contract.test.js` — 22/22; `npm run godhand -- verify` — PASS; `npm run walk` — CLEAN (850/850 JS syntax, 223 TS syntax files, 759/759 relative imports, 54/54 route targets).

**FULL SERVER SUITE — NOT PASSING:** 589 test files, 5907 tests: **5837 passed, 24 failed, 46 skipped**. All 24 failures are dependency-load failures caused by missing local runtime packages, principally `dotenv` and `better-sqlite3`; package-registry access was unavailable during dependency restoration. `npm run deps:preflight` correctly exits 2 and lists missing root/server packages. Do not claim the full server suite or release gate is complete. OAuth provider/redirect acceptance, live financial providers, production database, browser/device acceptance and dependency-backed typecheck remain NOT TESTED. B498 remains unsealed and NOT SHIPPED.


## NEXT-19 — Runner exit reliability and dependency failure diagnostics (2026-10-10)

- Fixed the suite wrapper to exit explicitly after the child runner closes and the TAP log is flushed; this prevents unrelated lingering handles from leaving `npm run test:server` open after the final summary.
- Added grouped missing-module diagnostics to the concise output.
- `npm run verify:contract`: 945/945 PASS; `npm run test:server`: completed and returned non-zero as expected with 5,907 tests (5,837 pass / 24 fail / 46 skipped). The failure summary identifies `dotenv` (22 load failures) and `better-sqlite3` (2 load failures). No suite-level timeout is imposed; each test retains a configurable 120-second timeout and file concurrency defaults to 2.
- `npm run godhand -- verify`: PASS; `npm run walk`: CLEAN.
- Missing runtime packages, three production URL configuration values, dependency-backed typecheck, production database, live payment/OAuth providers and browser/device acceptance remain NOT TESTED. B498 remains NOT SHIPPED.
