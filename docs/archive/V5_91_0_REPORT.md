# NEXA V5.91.0 / B132 — Retained Yaayz Seller Commerce Lifecycle Integrity

## Milestones
M1625–M1649: **25/25 IMPLEMENTED / VALIDATED**.

## Major issue
Account closure deactivated the vendor lifecycle, but standalone Yaayz ticket listings are owned directly by `sellerId` and could remain active after the seller account closed. Pending payment reservations could also remain in-flight against that seller inventory.

## Repair
- Added an explicit retained-seller cleanup helper.
- Deactivates all active Yaayz listings owned by the closing account.
- Cancels pending-payment reservations owned through those listings.
- Restores reserved ticket quantity before cancellation.
- Preserves paid orders and financial history.
- Wires the repair into the canonical transactional account-closure path.

## Verification
- Focused B132 contract: **25/25 PASS**.
- Cumulative B112–B132 contract tests: **473/473 PASS**.
- JS/MJS/CJS syntax: **464/464 PASS**.
- Release consistency: **3/3 PASS**.
- Release audit: **PASS — V5.91.0**.
- Static release suite: **40/40 PASS**.
- Dependency preflight: **BLOCKED — node_modules absent**.
- Full server suite: **NOT RUN — dependency environment unavailable**.

## Release
- Archive: `NEXA-V5.91.0.zip`
- Batch: B132
- Next: M1650–M1674 / B133
