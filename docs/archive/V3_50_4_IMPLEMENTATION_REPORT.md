# NEXA V3.50.4 — Refund Reconciliation & Dispute Workflow

## Implemented
- Added signed Paystack webhook reconciliation for refund lifecycle events (`refund.pending`, `refund.processing`, `refund.processed`, `refund.failed`).
- Uses persisted webhook event keys to suppress duplicate event processing and updates matching refund records by provider refund ID or transaction reference.
- Added seller dispute inbox endpoint scoped to the authenticated vendor.
- Added seller response action that moves an open dispute to `pending_buyer_confirmation`.
- Added buyer confirmation endpoint that marks a seller-resolved dispute as `resolved`.
- Updated root/server package versions and VERSION.md to 3.50.4.

## Validation
- `node --check server/index.js`: passed.
- `npm test` in `server`: 15 passed, 0 failed (existing test suite; no new route-level integration tests).
- Paystack live/sandbox webhook tests: not performed.
- Frontend typecheck and device testing: not performed.

## Limitations
- This is an API workflow; no dedicated seller/admin dispute UI or full admin adjudication queue was added.
- Refund event reconciliation depends on provider payloads matching the stored provider refund ID or transaction reference; end-to-end provider verification remains outstanding.
