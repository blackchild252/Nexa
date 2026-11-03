# B413 REPORT — Vendor Staff credential-backed accounts

## Scope
M6116–M6140. Main-only functional implementation. No Admin roadmap changes.

## Implemented
- Owner-only `/api/mall/vendor/staff/accounts` creates a permanent NEXA user and active `vendor_staff` relationship.
- Server validates name, email, password length and role.
- Passwords use the existing server-side NEXA bcrypt authority.
- Existing NEXA emails are refused by the new credential-creation path; the legacy invite path remains available for existing users.
- Staff/Manager role selection remains vendor-scoped and manager creation remains owner-only.
- API creation response contains staff metadata only; plaintext credentials are never returned.
- Vendor Staff continues using `requireVendorAccess` for product/order operations and cannot cross vendors.
- Removing staff access removes the vendor relationship but does not delete the underlying NEXA user.
- Vendor Staff creation UI includes email/password/confirmation and show/hide password controls.
- Authenticated active Vendor Staff are routed to `/staff` after login/session restoration.

## TESTED/PASSED
- Focused Vendor Staff contract suite: 4/4 PASS.
- Server syntax: `server/staff.js` PASS.
- Devil's Walk: CLEAN — 760/760 JavaScript syntax, 210 TypeScript syntax files, 680/680 relative imports, 45/45 route targets; 22 inherited non-blocking border advisories.
- Angels Duty: 0 safe-junk blockers; 5 historical exact-duplicate groups remain review-only.
- God Hand: PASS; verification PASS.
- Release identity: V6.0.67 B413 / build 6232.

## NOT TESTED
- Full dependency-backed server suite to completion. `npm run test:server` started successfully and progressed through thousands of contracts but the execution window expired before a final suite summary.
- Dependency-backed TypeScript typecheck because the repository has no installed `node_modules` dependency tree.
- Browser/device runtime.
- Live provider integrations, EAS, stores and production deployment.

## BLOCKED / DEFERRED
No internal B413 blocker was found. Existing production launch environment/legal inputs remain outside this build.
