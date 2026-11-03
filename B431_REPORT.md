# B431 — Main Block 04 security authority support

Release identity: V6.0.85 B431.

Product: NEXA Main App only. Admin remains a separate product with its own roadmap, version, Batch and release identity.

Roadmap: M6491–M6515 — Main identity/session authority support for CEO Global Readiness Block 04, Admin Security Center.

Implemented:
- Added a Main-owned Admin Security Center module with encrypted TOTP seed storage, RFC 6238 verification, expiring one-time login challenges and bounded MFA attempt controls.
- Admin login does not create a session for an MFA-enabled Admin until the challenge succeeds.
- Added Admin session revocation, emergency logout, sanitized login history, owner-only security audit, passkey/WebAuthn preparation status and five-minute action/session-bound step-up grants.
- Enforced step-up checks on Admin creation/removal, verification, financial, account deactivation and selected moderation/Staff operations.
- Audited Admin password changes/resets, MFA changes and session-security actions. Main continues to own the shared identity/session database.
- Updated Main-only roadmap, configuration and architecture records; no real credentials were added.

TESTED/PASSED:
- Focused Main Block 04 tests: 7/7.
- Targeted security/lifecycle/current-state suite: 114/114 passed.
- Cumulative Main contract suite: 499/499 passed.
- Main Devil’s Walk: clean — 775 JS syntax checks, 216 TS syntax files, 713/713 relative imports and 52/52 route targets. Angels Duty: 0 blockers. Main God Hand verify: BLOCK WALK COMPLETE.
- RFC 6238 six-digit TOTP vector and invalid-code check.
- MFA encryption-key validation fails closed when no approved server secret is available.
- Source/route contracts cover MFA challenge, session revocation, step-up grant consumption, role/permission boundary and passkey readiness state.
- Changed server files pass `node --check`.

NOT TESTED / excluded / BLOCKED:
- Full Main server suite: 5316/5387 passed, 25 failed because `dotenv`, `better-sqlite3` and related server dependencies are unavailable, and 46 skipped. Full database-backed Express integration remains BLOCKED.
- Full Main TypeScript typecheck.
- Live Main/Admin server acceptance and browser behavior.
- TOTP enrollment in a running server until a valid server-only encryption key is configured.
- WebAuthn/passkey registration and signature verification; only storage/challenge architecture is prepared, not enabled.
- Production deployment, EAS, stores and launch activity were not performed.

Status: IN PROGRESS. The local security authority is implemented, but environment-dependent integration and passkey work remain open. This release is not production-launch certification.
