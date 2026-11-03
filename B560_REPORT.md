# NEXA Main V6.2.14 B560 - priority block M7766-M7790

- New `server/staffLinkRoutes.js` + wiring in `server/index.js` (fail closed). 7 route tests (node:sqlite; fake express).
- Findings: (1) no 2FA marker on ordinary NEXA sessions, so the staff door cannot open yet; (2) old `/api/mall/vendor/staff/accounts` creates passworded staff accounts, which conflicts with the owner decision (M7784).
- NOT TESTED: real express server, better-sqlite3 runtime, full server suite, typecheck, live Admin/Central, browser/device, deployment. M7527 stays BLOCKED. Unsealed.
