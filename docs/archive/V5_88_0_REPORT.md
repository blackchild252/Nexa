# NEXA V5.88.0 / B129 — External Identity / Authentication Lifecycle Integrity

B129 hardens the external Google authentication lifecycle at account closure. The repair retires pre-closure Google provider handoff codes, clears the external provider subject from the anonymized closed account, and places an open-account guard at both password login and the canonical session-creation boundary.

## Milestones
M1550–M1574: **25/25 IMPLEMENTED / VALIDATED**.

## Repair
- Account closure now deletes outstanding `google_auth_codes` for the closing user.
- Google auth-code issuance rejects closed accounts.
- Google auth-code consumption rechecks the target account state and retires a code instead of creating authentication for a closed account.
- Canonical provider session creation rejects closed/nonexistent accounts, closing a race/path around provider authentication.
- Password login explicitly rejects closed accounts.
- Account closure clears `authProviderSubject`, resets `authProvider` to the password baseline, and resets `emailVerified`.
- Existing OAuth state TTL cleanup, hashed code storage, session revocation, closed-account middleware rejection, and Google provider conflict protections are preserved.

## Verification
- Focused B129 contract: **25/25 PASS**.
- Cumulative B112–B129 contract tests: **398/398 PASS**.
- JS/MJS/CJS syntax: **461/461 PASS**.
- Release consistency: **3/3 PASS**.
- Static release suite: **40/40 PASS**.
- Release audit: **PASS — V5.88.0**.
- Full server suite: **ATTEMPTED / BLOCKED after 36 observed tests by authoring-session execution ceiling**; no full-suite PASS claimed.
- Dependency-backed release gate: **BLOCKED — `node_modules` absent in the authoring environment**.

## Release
B129 is sealed as `NEXA-V5.88.0-B129.zip`.
