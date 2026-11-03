# NEXA V3.31 — Quality & Reliability Feature Specification

## Purpose
Improve the consistency and safety of server error handling while preserving the V3.30 feature baseline.

## Scope delivered
1. Centralized status and safe-message normalization in `server/httpErrors.js`.
2. Stable JSON error shape: `error`, `code`, and `requestId`.
3. Safe handling for malformed JSON (400), oversized body/upload (413), and blocked CORS origins (403).
4. Generic client-facing 500 response; detailed exception message is logged with request ID for server-side investigation.
5. Focused built-in Node test suite in `server/httpErrors.test.js`.
6. Version metadata updated to 3.31.0.

## Out of scope
- Broad refactors of route handlers or database schema.
- New product features.
- Claiming production readiness without full regression and operational evidence.

## Acceptance checks
- [ ] `cd server && npm test` passes.
- [ ] `npm run typecheck` passes from project root.
- [ ] API smoke tests cover health, authentication, malformed JSON, CORS, and upload-size behavior.
- [ ] Regression tests cover chat, groups, social, marketplace, staff, payments, and AI action confirmation.
- [ ] Security and deployment checks are recorded.

## Rollback
Revert the `server/httpErrors.js` addition and corresponding `server/index.js` middleware import/block, then restore version metadata to 3.30.0. No database migration is introduced.
