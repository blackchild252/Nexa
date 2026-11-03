# NEXA V3.49.1 — Marketplace Orders & Transaction Foundations

## Implemented
- Authenticated order creation from 1–30 listings, limited to one seller and one currency per order.
- Purchase-time line-item snapshots and server-calculated totals; client totals are ignored.
- Inventory reservation inside a SQLite transaction, with stock checks to prevent overselling.
- Idempotency keys scoped to buyer, order event audit trail, and status-transition validation.
- Buyer/seller authorization for order detail and status mutations; paginated order listing with status filter.
- Rejected/cancelled orders restore reserved stock. No payment-provider or refund processing is included.

## Validation
- `node --check` passed for `server/marketplaceOrders.js`, `server/db.js`, and `server/index.js`.
- Full server test suite and live database/API integration tests were not run in this build.
- No frontend order UI or device tests are included.

## Limitations
- Order listing uses timestamp cursor pagination (not a composite cursor).
- Multi-seller carts must be split into separate orders.
- Notifications, disputes workflow, payment, settlement, and refunds are out of scope.
