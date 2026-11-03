# B429 — CEO Global Readiness Block 03 report (IN PROGRESS)

- App: NEXA Main V6.0.83 B429; build identity 6248.
- Roadmap: M6466–M6490 — Authentication, Recovery & Identity.
- Implemented: email verification request/confirm; password recovery request/confirm; hash-only action-token persistence; 24-hour verification and 30-minute recovery expiry; prior-token invalidation and single-use consumption; password reset/change session revocation; current-password confirmation and password-reuse rejection; persistent auth-action rate limiting; hashed-context login anomaly signals; user-scoped security history; in-app security notifications; Main recovery/verification screens and profile password-change/security-history controls; Admin recovery/verification request UI and API wrappers using Main's identity authority.
- TESTED/PASSED: Main focused auth/session contracts 38/38; Admin full suite 406/406; changed JavaScript files pass `node --check`.
- NOT TESTED: Main database-backed integration/full server suite (offline dependency installation blocked by uncached `ws` package); TypeScript typecheck; live email delivery; deployed HTTPS/deep-link flow; browser/device; EAS; stores; production deployment.
- Open: account-lock policy (M6480/M7815), identity-state synchronization integration tests (M6483/M7818), and actual delivery/deployment verification.
- Email delivery boundary: optional server-side webhook adapter is ready for configuration. Production never returns raw tokens to clients. No provider credentials were embedded.
- Block 03 remains open; do not start Block 04 until remaining milestones and integration checks are completed.
