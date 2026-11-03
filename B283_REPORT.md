# B283 — V5.99.37 (checkpoint 12)

## Changed
- src/pushTapRouting.ts: a vendor order push now passes orderId along with tab=orders.
- src/app/marketplace/vendor.tsx reads ?orderId and passes it as initialOrderId.
- src/VendorDashboard.tsx takes an optional initialOrderId. On the Orders tab the opened order is listed first, has a gold border (theme.colors.royalGold, so both themes follow) and is marked "opened from notification". Without an id the tab looks exactly as before.
- Older tests follow the optional values: v5_99_36 guard (optional orderId) and v5_21_0 market block (optional initialOrderId). New guard v5_99_37_b283_block_guards (3 checks), registered in the release gate.

## Checked
- Routing: vendor order push gives /marketplace/vendor?tab=orders&orderId=...; a vendor push with no order id, the Yaayz push and the staff push are unchanged. Run outside the repo.
- Every param the push routing sends (view, groupId, section, threadId, roomId, callId, media, orderId, ticketOrderId) is read by its target screen (static check).
- Related tests that read the changed files all pass.

## NOT tested
Phone (a real tap, both themes), full typecheck (no node_modules), EAS, Playwright, the dotenv and better-sqlite3 files.

## Known limits
None open inside the app. M4147 and the environment-only files stay parked.
