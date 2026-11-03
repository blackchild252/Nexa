# NEXA Main — cross-app audit checkpoint

- **Product:** MAIN only; identity V6.1.71 B517 Build 6336.
- **Relevant routes:** Admin login challenge/verify routes in `server/index.js` + `server/adminSecurityCenter.js`; signed LORDGISTICS code receiver `POST /zeeza/v1/admin/login-code`; owner-scoped inbox `GET /api/zeeza/local-inbox`.
- **Data flow:** Admin-role password login → fresh challenge → Main Local inbox message → code verification → session. LORDGISTICS sends a signed event bound to `mainUserId`; Main validates HMAC/scope/expiry and stores the message for that user.
- **Fixes:** Admin login no longer requires TOTP for the login challenge; codes are short-lived, one-time and attempt-limited; consumed Admin codes are removed from inbox; local inbox API filters by authenticated owner and expiry; delivery response does not return the code.
- **TESTED/PASSED:** contract 1180/1180; static walk; local cross-app sender/receiver stand-in test.
- **BLOCKED/NOT TESTED:** full server suite 6031 pass/55 fail/46 skipped; local `better-sqlite3` missing; typecheck blocked by missing Expo base dependency; actual Main SQLite runtime, live running-app delivery and provisioning into Main/Admin not verified.
- **Risk:** TOTP remains for certain privileged step-up/security-center actions, separate from new-login Zeeza verification. Employee account provisioning still requires an authorized server-side contract.
