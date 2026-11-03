# NEXA MAIN APP — B470 Release Report

Release identity: V6.1.24 B470 (build code 6289)
Release purpose: repair current launch-gate regressions and reconcile active readiness pointers.

## Corrections delivered

- Updated the profile legal-readiness contract to validate the actual `Promise.all` tuple and state assignment without requiring an obsolete seven-result tuple.
- Updated the historical B213 metadata contract to assert that B213 remains preserved in `MASTER_ROADMAP.md` and `B213_REPORT.md`, while the current V2 queue remains the active priority.
- Updated the Sky Money plan-price contract to accept the current explicit-currency formatter while continuing to enforce a one-line, non-shrinking price layout.
- Raised onboarding's small explanatory text from 12px to 14px to meet the existing readability baseline.
- Added `/onboarding` to the canonical Expo route inventory.
- Corrected the Dami workflow contract to inspect the canonical action-confirmation validator.
- Corrected wallet readiness evidence to reflect the actual fail-closed state: configuration alone does not register a live provider adapter.
- Reconciled historical contracts that pinned old active roadmap/source strings to validate preserved history and current active authority instead.
- Synchronized Main's current pointer to the already-registered Block 29 (M7116–M7140) and explicitly avoided inventing a successor before Block 29 completes.

## TESTED/PASSED

- `npm run verify:contract`: 925/925 passed after the core contract repairs.
- Focused repaired contracts: profile identity/privacy, marketplace launch metadata, Sky Money layout, readability baseline, route inventory, wallet readiness, Yaayz search, current-state metadata and historical evidence were exercised in targeted tests.
- Additional historical-contract repairs were verified together: 103/103 passed across the selected world-interface, wallet-provider fail-closed, current-state, and retired B250 contract tests. They now verify current roadmap authority and actual fail-closed semantics rather than stale strings.
- `npm run release:audit` equivalent (`node scripts/release-audit.mjs`): PASS after correcting the handoff heading to the required active release identity.
- Admin `npm test`: 727/727 passed.
- Release identity bump/check confirms Main V6.1.24 B470 and build code 6289.

## NOT PASSED / NOT TESTED

- The full Main server suite is NOT PASSED in this workspace. The latest completed full run before the final historical-contract cleanups reported 5,857 tests: 5,779 passed, 32 failed, 46 skipped. Most remaining failures were test harness starts blocked by missing `dotenv` and `better-sqlite3`; additional stale historical assertions were repaired and their focused reruns passed. A subsequent full rerun hit the execution timeout after 4,672 reported tests and did not produce a final summary. Do not treat the full suite as passing.
- Dependency restoration was attempted, but the package registry was unreachable (`EAI_AGAIN`) and offline installation lacked cached packages. The full-suite runtime and typecheck therefore remain environment-blocked, not certified.
- `npm run typecheck` is BLOCKED: required Expo/React Native and ambient type packages are missing because dependency installation could not complete.
- `npm run launch:preflight` remains BLOCKED by three owner-supplied production HTTPS values: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_PRIVACY_POLICY_URL`, and `EXPO_PUBLIC_TERMS_URL`. Real domains were not fabricated.
- Production API/database deployment, live Main–Admin HTTP, payment/identity/email provider acceptance, browser/device acceptance, EAS/store submission, legal review and independent security review remain NOT TESTED / excluded from local release certification.

## Launch status

**NOT LAUNCH READY.** The three previous cumulative launch-gate contract failures were corrected, and the local cumulative contract suite passes. However, full server validation, complete dependency installation, production environment values and live acceptance are still required before a launch-ready declaration. Block 29 remains active and unfinished; its 25 source-evidence audits have not been claimed complete in this release.
