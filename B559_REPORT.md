# NEXA Main V6.2.13 B559 - priority block M7766-M7790

- `server/staffLinks.js`: permission catalog and boss cap (fail closed), `authorizeStaffAction`, upload approval queue (`staff_uploads`). Tests 25/25 on a real SQLite engine (node:sqlite).
- M7775-M7777 PARTIAL. Not covered: vendor routes outside staff.js, HTTP routes, client UI, catalog publish of approved uploads.
- NOT TESTED: better-sqlite3 runtime, full server suite, typecheck, live Admin/Central, browser/device, deployment. M7527 stays BLOCKED. Unsealed.
