# B432 — Main Block 04 Admin security and WebAuthn authority

Release identity: V6.0.86 B432. Product: NEXA Main App only. Admin is a separate product with its own release and roadmap.

Roadmap: M6491–M6515 — Main identity/session authority support for CEO Global Readiness Block 04, Admin Security Center.

Implemented:
- Main-owned Admin TOTP MFA setup/login challenge, encrypted seed storage, session revocation/emergency logout, privacy-safe login history and owner-only privileged audit.
- One-use, five-minute step-up grants bound to Admin user, active session and sensitive action; server enforcement covers Admin account changes, verification, financial review, account deactivation, moderation and selected Staff actions.
- WebAuthn passkey registration using one-time challenges, canonical origin/RP validation, user presence/verification checks and `none` attestation only.
- Discoverable passkey sign-in with assertion signature verification, RP hash and origin checks, user verification, single-use challenges, attempt limits and counter-anomaly rejection. If TOTP is enabled, passkey sign-in continues through the TOTP challenge before a session is created.
- Main/Admin routes and current release docs updated separately; no credentials were added.

TESTED/PASSED:
- Admin Security Center/TOTP/step-up contracts: 7/7.
- WebAuthn CBOR, origin/challenge, registration, cryptographic assertion signature and RP config unit tests: 5/5.
- Targeted Main security/lifecycle/current-state/WebAuthn suite: 119/119 passed.
- Main cumulative contract suite with Block 04 and WebAuthn tests: 511/511 passed.
- Main Devil’s Walk: 777/777 JS syntax, 216 TS syntax files, 713/713 relative imports, 52/52 route targets; WALK CLEAN. Angels Duty: 0 blockers. God Hand verify: BLOCK WALK COMPLETE.

NOT TESTED / excluded / BLOCKED:
- Full Main server suite: latest run 5321/5392 passed, 25 failed due unavailable `dotenv`, `better-sqlite3` and related server dependencies, 46 skipped. The remaining failures are environment/dependency-backed payment and database tests. Database-backed Express integration is BLOCKED.
- Full Main TypeScript typecheck: blocked by missing `expo/tsconfig.base` and project dependencies.
- Live Admin/Main server acceptance and browser WebAuthn ceremony.
- MFA setup until a valid server-only encryption key is configured; WebAuthn requires canonical `NEXA_ADMIN_WEBAUTHN_ORIGIN` (or canonical `NEXA_PUBLIC_URL`) and a compatible RP ID.
- Production deployment, EAS, stores and launch activity were not performed.

Status: IN PROGRESS. WebAuthn code and cryptographic tests are implemented, but live browser/server acceptance and the dependency-backed Main suite remain open. This release is not production-launch certification.
