# B282 — V5.99.36 (checkpoint 11)

## Changed
- src/pushTapRouting.ts: Yaayz pushes pass ticketOrderId; vendor order pushes pass tab=orders.
- src/VendorDashboard.tsx takes an optional initialTab (invalid values fall back to Overview); src/app/marketplace/vendor.tsx reads ?tab and passes it.
- Older test v5_21_0 market block follows the optional initialTab. New guard v5_99_36_b282_block_guards (3 checks), registered in the release gate.

## Checked
- Routing: 24 cases run outside the repo, all pass. Related tests that read the changed files all pass.
- God Hand plan on the real source: one blocker (the release-notes test that fails until notes exist).

## NOT tested
Phone (a real tap, both themes), full typecheck (no node_modules), EAS, Playwright, the dotenv and better-sqlite3 files.

## Known limits
The vendor Orders tab does not highlight the specific order yet; it reads no order id.
