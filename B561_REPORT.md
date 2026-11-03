# NEXA Main V6.2.15 B561 - priority block M7766-M7790

- Owner decision: a new session field for direct 2FA. Added `sessions.twoFactorVerifiedAt` (db.js), `req.user.twoFactorVerified` and rotation carry-over plus `markSessionTwoFactorVerified` (auth.js); staff door reads it (index.js). Admin checks never read it.
- Tests: `server/staffSessionTwoFactor.contract.test.js` (4, source-level) and updated route test. NOT WIRED: no live sign-in step calls the setter, so the door still refuses everyone.
- NOT TESTED: better-sqlite3 runtime, real express server, full server suite, typecheck, live Admin/Central, browser/device, deployment. M7527 stays BLOCKED.
