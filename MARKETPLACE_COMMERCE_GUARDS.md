# Marketplace Commerce Guards — B508

## Implemented locally

- Vendor product create/update validates weight as a finite positive kilogram value and rejects booleans; legacy rows may remain without weight where the update contract permits it.
- Product and sale prices are validated against the selected supported currency's minor-unit precision. Inputs with extra fractional digits are rejected rather than rounded into a different charge. Boolean, blank, non-finite and negative amounts are rejected.
- Checkout calculates prices and totals from current server-side product records, rechecks listing/vendor state, reserves stock transactionally and uses buyer-scoped idempotency. Failed unpaid checkout releases its reservation and stock.
- Refund and dispute requests are scoped to the authenticated buyer/order, validated against persisted payment state, claimed atomically and protected from duplicate active requests. Provider-ambiguous refunds remain reserved for reconciliation.
- Buyer payment history selects only the order/payment status and reference fields needed for history; it does not return card numbers, CVV, access tokens or provider secrets.
- Money market-watch remains informational only. Mock mode is labelled preview, synthetic series are emitted only in mock mode, and provider failure does not silently substitute synthetic values.

## New regression coverage

- `server/productPrice.contract.test.js`
- `server/marketplaceCommerceBlock.contract.test.js`
- Existing `server/productWeight.contract.test.js`, `server/payments.test.js`, `server/currencyModel.test.js`, `server/marketIntelligence.test.js`, `server/marketInsights.test.js`, and `server/v5_98_46_marketplace_checkout_integrity.contract.test.js`.

## Still parked / not tested

- Live Paystack settlement/refund acceptance and real webhook reconciliation are not tested in this local run.
- Licensed NGX market-data access and any other live market-data provider are not tested. Provider failures stay unavailable; mock data remains explicitly labelled preview.
- Full server runtime, dependency-backed typecheck, browser/device acceptance, and native Android/iOS builds are not claimed by these contract checks.
