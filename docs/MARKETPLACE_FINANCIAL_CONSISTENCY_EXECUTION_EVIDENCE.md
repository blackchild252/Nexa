# Marketplace data consistency and financial lifecycle — execution evidence

**Product:** NEXA Main App only
**Roadmap block:** M7616–M7640 (run in B578)
**Status:** see the table in `MASTER_ROADMAP.md`. Data rules were checked on real SQLite (`node:sqlite`). The real route handlers were cut out of `server/index.js` and `server/marketplaceOrders.js` and run against that database. No express, no running server, no Paystack, no phone or browser was used.

## What was found and fixed

1. **Buyer cancel returned a 500 after it had already cancelled the order.** In `POST /api/mall/orders/:orderId/cancel` the result was declared with `const` inside `try {}` and read after it. Every successful cancel committed, then threw `ReferenceError`. The buyer saw an error, and the vendor was never told and the stock-change notice was never sent. Now `let cancelled = false;` sits above the `try`.
2. **Seller status change had the same fault.** In `PATCH /api/mall/vendor/orders/:orderId/status` the `changed` flag had the same scope mistake. Every confirm, ship, deliver or cancel by a seller committed, then threw. The buyer push and the delivery reward (`seller_order`) were skipped. Fixed the same way.
3. **Sellers received the buyer's payment reference.** `GET /api/marketplace/orders`, `GET /api/marketplace/orders/:id` and the status `PATCH` returned the full order row to the seller, including `paymentRef`, `feeChargeId`, `feePreviewId`, `feeStatus` and `providerVerified`. A new `orderForViewer` removes those fields for anyone who is not the buyer. The buyer still sees them.

## How it was proven

- New `server/marketplaceFinancialConsistency.contract.test.js` — 14 tests, in `npm run verify:contract`.
- With fixes 1 and 2 put back to the old code, 7 of the 14 fail (`ReferenceError: cancelled is not defined`, `ReferenceError: changed is not defined`). With the fixes, all 14 pass.
- A scan of all 256 non-test server files for the same pattern (a `const` in `try {}` used after it) gave 8 candidates. 2 were real (fixed above). 6 were false alarms because the variable is used inside the same `try`.
- 47 existing tests that load `marketplaceOrders` still pass.

## What the 14 tests cover

- Buyer cancel: success, repeat (no second stock release, no second notice, one event), another user (404, nothing changes), seller already started (409), online payment already started (409), cash payment recorded by seller (409).
- Seller status: success with one buyer push, repeat is a no-op, invalid jump is 409, cancel gives the stock back once, cancel blocked after online payment started, seller without a line gets 404.
- Order fields: seller cannot see `paymentRef`; buyer can; a stranger gets 404.
- Source guard: no `const … = db.transaction` inside `try {` in `index.js`.

## Read, not tested

- `POST /api/marketplace/orders` checks: key format, 1–30 items, quantity 1–1000, one seller, one currency, own-listing refused, address cut to 1500 and note to 1000 characters. Read only; no test sends bad input.
- `POST /api/mall/orders/:orderId/refunds` keeps a refund in "processing" when the provider answer is unclear, and caps the total against the order. Read only.
- `PATCH /api/mall/vendor/orders/:orderId/payment` reads its checks inside the transaction and correctly keeps `changed` outside it. Read only.
- Order totals are added with floating-point numbers (`price * quantity`). Not changed; not tested for rounding.

## Not tested

- A running server, express, real HTTP, the Paystack verify, webhook and refund calls, wallet settlement routes, disputes, the kitchen and YAAYZ order routes, push delivery, a phone or browser.
- Missing configuration behaviour (M7626) and a full review of error text across all money routes (M7627).
- `npm run test:server` was not run this time. The last recorded result is 39 failures from missing server packages.
- Typecheck (no `node_modules`).

## Provider boundary (M7631)

Payment acceptance by Paystack, refund settlement and webhook delivery are outside this check. They stay NOT TESTED until a real provider account is used.
