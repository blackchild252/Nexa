# NEXA Main V6.2.12 B558 - priority block M7766-M7790

- `server/staffLinks.js`: added `staffDoorSignIn` (Business Hub door, vendor-boss staff only, uniform failure, server-resolved landing, first-activation timestamp). 6 new tests; file total 18/18 on a real SQLite engine (node:sqlite).
- M7772-M7774 PARTIAL (module logic only). No HTTP route, no client UI, no hook to the live sign-in/Zeeza 2FA yet.
- NOT TESTED: better-sqlite3 runtime, full server suite, typecheck, live Admin/Central, browser/device, deployment. M7527 stays BLOCKED. Unsealed.
