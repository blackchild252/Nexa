# NEXA V3.50.3 — Checkout Completion Patch

## Added
- Buyer payment-history endpoint and payment-history section in Marketplace orders UI.
- Online-payment refund request endpoint using Paystack's refund API, with buyer ownership checks, confirmed-payment requirement, reason validation, duplicate-open/processing protection, and refund status records.
- Buyer order-dispute intake and read endpoints with ownership checks and duplicate-open-dispute prevention.
- Marketplace UI actions to request a refund or open a dispute from an order.
- SQLite tables and indexes for refund and checkout-dispute records.

## Validation
- `node --check server/index.js`, `server/db.js`, and `server/payments.js`: passed.
- `npm --prefix server test`: 15 passed, 0 failed.
- `npm run typecheck`: unable to complete because dependencies are not installed in this workspace (missing Expo/React modules and expo/tsconfig.base).
- No Paystack sandbox/live transaction, refund, webhook E2E, migration rehearsal, or device test was run.

## Known gaps
- Refund status is recorded from the synchronous Paystack response; asynchronous refund-status webhook reconciliation is not implemented.
- Direct-to-seller payments cannot be refunded by NEXA; buyer is directed to contact the seller.
- Disputes support buyer submission and viewing only; seller/admin response, resolution, and moderation workflows remain incomplete.
- Checkout UI remains the existing cart/review and hosted Paystack redirect flow; full end-to-end checkout and payment history UI validation is pending.
- No claim of production readiness or completion of all V3.50 acceptance criteria.
