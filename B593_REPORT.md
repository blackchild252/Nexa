# B593 report

V6.2.47 B593, build 6412. Internal checkpoint.

- Added Director decision over HTTP (M7780/M7786, PARTIAL): `GET /api/staff-links/pending` and `POST /api/staff-links/:id/decision` for an Administrative Director.
- The Director is resolved in Main from an active, activation-confirmed Admin AAMI grant (company nexa, role administrative_director). General Manager and Group Director do not count. No grant table or an unreadable one resolves to nobody.
- 8 new HTTP tests in `server/staffDirectorDecision.contract.test.js`; 7 deliberate breakages, all caught (one test was too weak at first and was fixed).
- Route pin raised from 8 to 9 staff-link routes on purpose; every route still sits behind the login check.
- NOT tested: test:server, typecheck, release:gate (no node_modules, network off); better-sqlite3; Admin/Central; screens; devices.
- NOT built: Director appointment routes (no Manager can be appointed over HTTP yet), Admin screen, step-up confirmation for decisions, events to Admin/Central, Blaca staff screen, sign-in screens.
