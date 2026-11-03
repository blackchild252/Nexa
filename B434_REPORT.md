# B434 — Main Block 04 Admin security and WebAuthn authority

Release identity: current identity is read from the locked release tooling. Product: NEXA Main App only. Admin remains a separate product with its own release and roadmap.

Roadmap: M6491–M6515 — Main identity/session authority support for CEO Global Readiness Block 04, Admin Security Center.

Implemented:
- Main-owned Admin TOTP MFA setup/login challenge, encrypted seed storage, per-session revocation, emergency logout, privacy-safe login history and owner-only privileged audit.
- One-use, five-minute step-up grants bound to Admin user, active session and sensitive action; server enforcement covers privileged Admin account changes, verification, financial review, account deactivation, moderation and selected Staff actions.
- WebAuthn passkey registration and discoverable sign-in with one-time challenges, origin/RP checks, user verification, cryptographic assertion signatures, bounded attempts and credential-counter anomaly rejection. TOTP-enabled accounts continue through TOTP before session creation.
- Main-owned security API contracts and Main-only roadmap/release documentation. No provider credentials or secrets were added.

TESTED/PASSED:
- Block 04 security, TOTP, step-up and WebAuthn targeted tests: 12/12.
- Main cumulative contract suite: 511/511.
- Main Devil’s Walk: 777/777 JavaScript syntax, 216 TypeScript syntax files, 713/713 relative imports and 52/52 route targets; WALK CLEAN.
- Main Angels Duty audit: 0 blockers; exact duplicate groups are review-only and were not destructively changed.
- Admin independent regression suite: 415/415; Admin route walk: 72/72 JavaScript syntax and 118 route targets; Admin roadmap check passed.
- Main release identity, seal and extracted archive verification are required and recorded by release:ship.

NOT TESTED:
- Full Main server/database-backed integration and full TypeScript typecheck. Dependency installation could not complete in this environment; the offline cache lacks at least one required package and registry access is unavailable.
- Live Main/Admin server acceptance, actual browser WebAuthn/passkey ceremony, and MFA enrollment with a configured server-only encryption key and canonical HTTPS origin/RP ID.
- Production deployment, EAS, app stores and launch activities were not performed or authorized.

Status: TESTED/PASSED for the local Block 04 implementation and available verification. Environment-dependent checks remain NOT TESTED; this release is not production-launch certification.
