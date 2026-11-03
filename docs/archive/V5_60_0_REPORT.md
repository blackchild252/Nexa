# NEXA V5.60.0 / B101 — API, Trust Boundary & Data-Exposure Hardening

## Milestones
M850–M874 — 25/25 IMPLEMENTED / VALIDATED.

## Major controls
- Production CORS fail-closed policy.
- Request-target and query-parameter bounds.
- Header/content-type boundary contracts.
- Safe internal-error envelopes and sensitive-header scrubbing.
- Pagination/cursor bounds.
- Bounded admin rate/step-up policy.
- Hashed authentication-attempt envelope.
- Session count/idle/revocation controls.
- Password-change session revocation contract.
- Atomic OAuth exchange-consumption contract.
- Webhook freshness/body-binding contracts.
- Provider circuit-state control.
- HTTPS external URL allowlist.
- Upload filename/MIME/pixel resource boundaries.
- Active HTTP integration of production CORS fail-closed and request-target/query bounds.

## Validation
- B101 focused contract: 25/25 PASS.
- Operational readiness regression: 5/5 PASS.
- Combined focused gate: 30/30 PASS.
- JS/MJS syntax sweep: 408/408 PASS.
- Release identity: PASS — package/server/Expo/lock/theme/project-memory all V5.60.0; Batch B101.
- Roadmap synchronization: PASS — MASTER_ROADMAP, PRIORITY_ROADMAP, TEMPORARY_ROADMAP contain M850–M874 and B101 certification.
- Full `node --test server/*.test.js`: ATTEMPTED / BLOCKED by authoring-environment execution timeout. No full-suite pass is claimed.

## Release
Archive: `NEXA-V5.60.0-B101.zip`
