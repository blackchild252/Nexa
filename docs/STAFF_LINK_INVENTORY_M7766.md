# Main staff inventory (M7766) — read-only inventory, no behavior change

Source inspected: `server/staff.js` (284 lines), `server/vendorStaffAccounts.contract.test.js` (4 tests), `server/adminStaffWork.js`, `db.js` table `vendor_staff`.

## What exists today
- Roles: `staff` (products + orders) and `manager` (plus list/invite/remove plain staff). Only the vendor owner can create or remove a manager.
- Routes: GET `/api/mall/vendor/staff`, POST `/accounts`, POST `/invite`, POST `/join` (rate-limited), DELETE `/:id`, GET `/api/mall/staff/me`.
- Access is granted two ways: direct add of an existing NEXA user (`/accounts`) or a 7-day invite code claimed by the person (`/invite` + `/join`). Max 20 staff per vendor.
- Table `vendor_staff` has a unique index on (vendorId, userId) for live rows, so one account can be staff at several vendors.

## What will change (by milestone)
- One link per NEXA account across all tiers (M7768): the current per-vendor index is not enough.
- Nothing active until approved (M7769-M7771): today a vendor owner or manager activates staff immediately with no Administrative Director approval.
- Invite-code join (M7772): retire in favor of linking an existing NEXA account with direct 2FA; Main creates no new account or password.
- Roles `staff`/`manager` migrate into staff links (M7784), dry-run and rollback first.
- Not covered by `vendor_staff` today: CEO, Administrative Director, Kitchen, Blaca Essentials units.

## Owner decision recorded 2026-10-14 (from the owner, this run)
All staff, top to bottom including vendor staff, live in one shared database owned by Main. Each person has their own individual link. Admin staff and CEO staff receive their links from their own bosses.

## Status
DOCUMENTED. No code changed. Tests for this milestone: none required; NOT TESTED beyond reading the source.
