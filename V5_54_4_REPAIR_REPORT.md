# NEXA V5.54.4 — Repair Pass

## Scope
Cumulative repair pass performed directly against the V5.54.4 / B91 project archive. No rebuild and no completed B91 functionality was replaced.

## Verified finding repaired
### HIGH — Signup abuse protection was only per-IP
**Location:** `server/index.js`, `/api/auth/signup`

**Evidence:** The route previously used only the shared `authLimiter`, while the B91 login route already had account-scoped controls.

**Repair:** Added two bounded signup-specific limits while preserving the existing per-IP limit:
- 5 attempts per email + IP per 15 minutes.
- 100 attempts per email across IPs per 15 minutes.

The existing 30-attempt per-IP limiter remains in force.

## Regression coverage
Extended `server/v5_54_4.contract.test.js` with explicit signup limiter wiring checks.

## Test results
- B91 repair contract: **5/5 PASS**
- JavaScript/MJS syntax: **393/393 PASS**
- JSON metadata validation: **PASS**
- Full dependency-backed server suite: **BLOCKED — node_modules absent**
- Frontend typecheck/runtime/device: **NOT RUN — dependencies/device environment unavailable**

## Not changed
No changes to payment authority, session architecture, database schema, WebRTC implementation, UI navigation, AdMob, credentials, production deployment, or destructive data paths.
