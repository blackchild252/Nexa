# B538 — Admin AAMI Director read-only slice (V6.1.92 B538)

Scope: NEXA Main only (paired with AAMI Admin v1.1.50). Local/project testing only; no launch activity. Unsealed checkpoint.

Owner decision (this session): open the Customer Care queue, Financial Operations (read-only) and the Audit log to the Administrative Director role; LORDGISTICS stays on its separate relay (no dual grant).

## Changed
- `server/adminAccess.js`: `administrative_director` in `ADMIN_AAMI_PERMISSIONS` gains `staff_work`, `payments`, `audit`. General Manager and Group Director are unchanged.
- `server/adminAamiAccess.js`: read-only allowlist entries only: `GET /api/admin/customer-care` (queue list), `GET /api/admin/financial-operations/{summary,exceptions,transactions}` and `.../transactions/:id/timeline`, `GET /api/admin/audit`.
- Still NOT bridged: reconcile, assignees, assign, review, customer-care thread/message/assign/escalate/close/my, security, operations, approvals, admins, removal.
- Tests updated: the old assertion that a Director cannot use `audit`/`payments` now matches the owner decision; added negative cases for write routes, thread/message routes and the two other roles.

## TESTED/PASSED
- Focused Admin AAMI/privileged-access/identity/activation tests: 36/36.
- `npm run verify:contract` with `CI=true`: 1212 pass, 0 fail, 1 skip. Walk CLEAN. Roadmap check and release identity PASS.

## Notes
- Without `CI=true`, contract test M1130 (install-state) fails only because `node_modules` is absent in this workspace.
- The audit log is Main's NEXA admin audit table; it is not company-filtered and shows all NEXA admin actions to the Director. This is the owner-approved scope.
- Customer Care queue rows include customer name/email in the API response; the Admin UI shows the name only.

## NOT TESTED / BLOCKED
- Real HTTP/SQLite run of these routes (BLOCKED: `better-sqlite3` missing). Main full server suite, typecheck, browser, deployment, launch.
- M7527 remains BLOCKED. This work is unallocated cross-product work and consumes no milestone.
