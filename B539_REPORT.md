# B539 report — V6.1.93 B539

Fixes Finding A (admin first-login deadlock) and Finding B (Admin staff had no sign-in code) from the account-creation and login sweep.

## What changed
- `sessions.adminVerifiedAt` (new column, `db.js`). Set only when a session is created by the Zeeza code verification (`/api/auth/admin-mfa/verify`). Kept through session rotation. Exposed as `req.user.adminSessionVerified`.
- `mallAdmin.isConfiguredAdmin` and `adminAccess.roleOf` return no admin or owner power for a session with `adminSessionVerified === false`. This covers the direct owner checks in `index.js` and the permission middleware at once.
- Staff guards in `adminStaffWork.js`, `customerCare.js` and `adminAi.js` refuse an unverified session (`ADMIN_SESSION_UNVERIFIED`).
- `adminSecurityCenter.createLoginChallenge` now also covers active Admin staff (Finding B). A missing `admin_staff` table is treated as no staff.
- `/api/auth/login` (Finding A): when a challenge is required, a client that names itself `AAMI Admin web` gets the challenge only. Any other client, such as the NEXA app, also gets an ordinary session with no admin power plus `adminVerificationRequired: true`. The person opens Zeeza, reads the code, and enters it where it is asked. The Admin app header is only a hint: spoofing it removes the session, never adds power.
- Google sign-in sessions are now also unverified, so a provider sign-in can no longer reach admin power without the code.

## Behaviour to know about
- Existing admin and staff sessions have no verified mark. Each admin and staff user signs in once more and enters the code. Admins can now do that because the NEXA app session can read the inbox.
- An admin or staff user who signs into the NEXA app has normal user features only until the code is verified. The NEXA app has no screen for entering that code, so staff who work inside the NEXA app need that screen (client work, not done here). The Admin app already has it.

## Tests
- `server/v6_1_93_admin_session_verification.test.js`: 9 of 9. Staff and admin challenge, one-time verify, wrong-code count, missing staff table, unverified owner and role, run against real SQLite (Node built-in). Session column, rotation, single verified path, login route and staff guards are contract checks.
- Updated for the new code shape: `adminZeezaLogin.test.js`, `v6_0_85_admin_security_center.contract.test.js`, `v5_88_0_external_identity_lifecycle.contract.test.js`, `v5_98_65_b213_identity_privacy.contract.test.js`.
- Full contract suite compared with the V6.1.92 baseline: no new failures (see checkpoint).

## Not tested
Real HTTP login, real bcrypt login, NEXA app screens, the 28 suites that need `better-sqlite3`.
