# B491 — NEXA Main Roadmap Report

**Current candidate:** V6.1.45 B491 (build code 6310).

## Implemented
- M7121 partial hardening: Google sign-in authorization-code flow now uses cryptographically random PKCE verifiers and S256 challenges, stores the verifier with the short-lived state transaction, and sends the verifier to the token endpoint. Legacy transactions without a verifier fail closed.
- Added focused PKCE helper and contract coverage.
- Recorded OAuth readiness gaps and candidate-target mismatch in `docs/GOOGLE_OAUTH_READINESS.md` and the canonical roadmap.

## Verification
- `node --test server/googleAuth.contract.test.js`: 2/2 passed.
- Release identity check: passed after automated bump.
- `npm run verify:contract`: 930/930 passed.

## NOT TESTED / BLOCKED
- M7121 remains BLOCKED as a complete readiness milestone: live provider acceptance, production redirect configuration/evidence, independent security review and all remaining OAuth gates have not been verified.
- Full server suite, dependency-backed typecheck, browser/device acceptance, production database/provider integration and live shared-server integration are not claimed.
