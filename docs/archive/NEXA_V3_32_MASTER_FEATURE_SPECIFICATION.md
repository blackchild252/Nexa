# NEXA V3.32 — Security & Privacy Feature Specification

## Purpose
Introduce user-visible session oversight and session revocation while preserving the V3.31 baseline.

## Implemented in this build
1. `GET /api/auth/sessions` lists active, unexpired sessions for the authenticated user with creation/expiry timestamps and a current-session flag. It never returns session tokens.
2. `DELETE /api/auth/sessions/others` revokes all other sessions for the authenticated user while preserving the caller's current session.
3. Version metadata and active roadmap updated to 3.32.0.

## Security notes
- Existing bearer-token authentication and session storage format are unchanged for compatibility.
- These endpoints do not constitute a full security audit or comprehensive privacy implementation.
- Session records are identified as current by the bearer token supplied to the authenticated request; raw tokens are not included in response payloads.

## Acceptance checks
- [ ] Authenticated session list contains only the caller's sessions.
- [ ] Session list does not expose bearer tokens.
- [ ] Revoking other sessions removes other sessions and preserves the current session.
- [ ] Unauthenticated requests receive 401.
- [ ] Full API regression, dependency audit, mobile testing, and deployment security review pass.

## Rollback
Remove the two session endpoints and `listSessions` / `logoutOtherSessions` helpers, then restore version metadata to 3.31.0. No database migration is introduced.
