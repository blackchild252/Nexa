# V6.0.84 B430 — Main Block 03 authentication hardening

Product: NEXA Main App only. Admin remains an independent product and release lineage.

Roadmap: M6466–M6490 — CEO Global Readiness Block 03, Authentication, Recovery & Identity.

Implemented in this corrective slice:
- Added `/auth/recover` and `/auth/verify-email` to the canonical Expo Router inventory.
- Repaired stale historical contracts so they verify historical records/current source behavior rather than pinning retired signatures or the active temporary roadmap.
- Added explicit source contracts for login throttling and server-authoritative identity/account-state boundaries.
- Synchronized Main release notes and Main-only roadmap status; kept the CEO strategic register separate from each product's execution roadmap.

TESTED/PASSED:
- Main Block 03 and related focused contracts: 131 tests, 130 passed, 1 intentionally skipped historical identity check, 0 failed.
- Main full Devil's Walk with tests: 772/772 JS syntax, 216 TS syntax files, 713/713 relative imports, 52/52 route targets, 538 test files loaded, 5308/5380 test cases pass, 26 external-dependency failures parked, 46 skipped, 0 blockers. `npm run verify:contract`: 499/499 passed.
- Admin independent full regression suite: 407/407 passed for V1.0.56 B57, including request-wrapper acceptance tests.
- Main and Admin release identity checks run independently during their own release workflows.

NOT TESTED / excluded:
- The production `server/db.js`/`better-sqlite3` integration and live Express endpoint end-to-end tests. Core lifecycle behavior was tested against in-memory SQLite with mocked bcrypt and email delivery. `npm ci --offline` is blocked by an uncached `ws` package; online `npm ci` exited with an npm internal error.
- Main full TypeScript typecheck (root dependencies are absent).
- Real email delivery, deployed HTTPS/deep-link behavior, browser/device runtime, EAS, stores and production deployment.
- Live Main↔Admin server acceptance; source-level endpoint contracts pass, but no deployed service is available in this run.

Status: TESTED/PASSED — all 25 Main milestones have local implementation, contract or runtime evidence. Live production database integration, live email delivery, deployed cross-app/browser acceptance and full TypeScript typecheck remain NOT TESTED; this release is not production-launch certification.
