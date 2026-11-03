# Staff link lifecycle — execution evidence (V6.2.41 B587)

Code: `server/staffLinks.js`. Tests: `server/staffLinksLifecycle.contract.test.js` (22 tests, real SQLite engine `node:sqlite`; the production `better-sqlite3` runtime is NOT TESTED here). No HTTP route was added or changed.

## What was added
- **Audit** (`staff_link_audit`): one row per request, approval, rejection, suspension, resume, removal, boss action, upload decision and migration step. Columns hold no credential, code or 2FA field. A change and its audit row are written in one savepoint; if the audit write fails the change rolls back.
- **Holds** (`staff_boss_holds`): suspending a boss pauses all their staff without rewriting any link. Lifting the hold restores them exactly.
- **Who may act:** a link's own boss (same tier and boss ID) or the tier that approves that boss's staff may suspend or remove a link; only the approver tier may resume. Only the approving tier may hold, restore or remove a whole boss. Nobody acts on themselves.
- **Unit permissions:** kitchen = uploads, kitchen_sales, sales_view. Blaca Essentials = products, uploads, stock, sales_view. Business Hub = products, orders, uploads, stock, sales_view. Central and Admin units are not restricted yet.
- **Migration** of existing vendor staff: `planVendorStaffMigration()` (writes nothing), `applyVendorStaffMigration({confirm:"MIGRATE_VENDOR_STAFF"})`, `rollbackVendorStaffMigration({confirm:"ROLLBACK_VENDOR_STAFF_MIGRATION"})`. Nothing calls them automatically.

## Migration procedure (not run on any real database)
1. Run the plan and read it. Conflicts (staff of two vendors, or already linked elsewhere) are never migrated; the owner decides each one.
2. Apply with the confirm word. Each active vendor staff row becomes an approved link (Business Hub, orders + products), tagged `system:migration`. `vendor_staff` is not changed, so access keeps working through the old table.
3. Rollback removes only migrated links nobody has changed since. Anything a boss or approver touched is left alone and counted.
4. The old Manager-tier powers (list, invite, remove staff) are not part of a link and still run through `vendor_staff`.

## Owner questions (nothing built until answered)
1. **M7780:** who approves a Manager appointment, and where does the Manager's unit come from? As written, the CEO would approve each Manager.
2. **M7778/M7779:** which sign-in door do Kitchen and Blaca Essentials staff use? Only the Business Hub door exists, for vendor staff.
3. **M7781:** should suspending a staff member also end their normal NEXA login, or only their staff authority? Built: only staff authority, checked on every request.
4. **M7784:** retire or convert `POST /api/mall/vendor/staff/accounts` (it creates a staff account with a password).

## NOT TESTED
Live HTTP for any new function (none are routed), `better-sqlite3`, a real database, multi-process concurrency, Admin/Central bridges, devices, typecheck, `npm run test:server`, `release:gate`.
