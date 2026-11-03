# B544 report — V6.1.98

**Product:** NEXA MAIN only.

**Goal (one):** prove Main's own receiver creates the pending Admin AAMI grant that the activation code depends on.

**Bug found and fixed (my B542 error):** the challenge route looked for the pending grant in `central_privileged_access`. Central's Admin AAMI grants are stored by `server/adminAamiAccess.js` in `admin_aami_privileged_access`. So no real applicant could ever get a code (403 every time). B542 tests passed only because they seeded the wrong table. The route now reads `admin_aami_privileged_access` (product `admin-aami`, status `pending_activation`) and creates that table if missing.

**TESTED/PASSED:** `server/centralFactorVerify.test.js` 9/9 on real SQLite. Tests now seed the real Admin AAMI table, and a new test proves a pending NEXA Main privileged-access grant gives no code. End-to-end (one-off, outside the repo): real Central, real Admin relay, Main's real grant receiver and real challenge/verify routes over HTTP. Central's real client sent `role.granted`, Main recorded `pending_activation` (nothing seeded), the right code activated, Main recorded `active` + confirmed, and a new code could no longer be requested. 11/11 checks.

**NOT TESTED:** Main's real `express` server and `better-sqlite3`, real browser or device, HTTPS, production keys, restarts.

**BLOCKED:** email 2FA still has no provider.

**Next (one goal):** start Main's real server with its real dependencies and repeat the check (needs `node_modules`).
