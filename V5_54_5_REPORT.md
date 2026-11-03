# NEXA V5.54.5 — Web Authentication Continuity Repair

## Scope
Cumulative patch directly on V5.54.4 / B91. No new milestone batch. No server authentication authority, cookie model, payment path, database schema, AdMob scope, or native SecureStore behavior was changed.

## Verified finding repaired
### HIGH — Web authentication token was memory-only
**Location:** `src/auth.tsx`

**Evidence:** The web branch stored the bearer token only in `webRuntimeToken`, so a browser reload discarded the credential and forced a sign-in again.

**Repair:** Web token persistence now uses guarded `sessionStorage` under `nexa.auth.web.token.v1`, with the existing in-memory value retained as a fallback when browser storage is unavailable. Native platforms continue using Expo SecureStore unchanged.

## Regression coverage
Added `server/v5_54_5.contract.test.js` to verify the web storage key, sessionStorage read/write/remove wiring, native SecureStore preservation, and no localStorage usage in the auth token path.

## Test results
- Focused V5.54.5 contract: **PASS**
- B91 V5.54.4 contract: **5/5 PASS**
- JavaScript/MJS syntax: **PASS**
- JSON metadata validation: **PASS**
- Full dependency-backed runtime suite: **BLOCKED — node_modules absent**
- Frontend typecheck/runtime/device: **NOT RUN — dependencies/device environment unavailable**

## Versioning
- Version: **V5.54.5**
- Batch: **B91** (patch; no new milestones)
- Archive naming remains version-only: `NEXA_V5_54_5.zip`
