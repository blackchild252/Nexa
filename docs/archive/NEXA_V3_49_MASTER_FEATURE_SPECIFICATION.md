# NEXA V3.49 — Marketplace Orders and Transaction Foundations

**Status:** Specification only; implementation and tests are pending.

## Goals
Define a safe, auditable order lifecycle between buyers and sellers, without implying that payment processing is included.

## Functional requirements
1. Create an order from one or more valid, available listings, recording a stable order ID and immutable purchase-time snapshots of item name, seller, quantity, and displayed price.
2. Track explicit states: `pending`, `accepted`, `rejected`, `cancelled`, `fulfilled`, and `completed`; transitions must be validated server-side and recorded in an audit trail.
3. Enforce buyer/seller authorization on every read and mutation. Users must not access another party's private order data.
4. Prevent duplicate order creation with idempotency keys and handle concurrent listing availability changes safely.
5. Preserve order history and timestamps; do not silently rewrite purchase-time snapshots.
6. Provide buyer and seller order lists with pagination and filters, and status notifications only after committed state changes.
7. Define cancellation, rejection, and dispute handoff rules. Refunds and payment settlement are out of scope for this milestone.
8. Validate quantities, price values, currency codes, and state transitions on the server; never trust client-submitted totals.

## Data and security requirements
- Separate order, order-item snapshot, status-event, and idempotency records.
- Apply transactional persistence for order creation and inventory reservation where supported.
- Avoid storing card data or payment credentials.
- Log security-relevant changes without exposing secrets or unnecessary personal data.

## Acceptance criteria (to be implemented and tested)
- Unauthorized users cannot view or mutate orders.
- Invalid state transitions are rejected.
- Repeated idempotent requests do not create duplicate orders.
- Concurrent attempts cannot oversell a limited-quantity listing.
- Order snapshots remain stable when a listing is later edited.
- Status history is ordered, attributable, and auditable.
- Failure paths roll back partial order creation.

## Explicit non-goals
Payment-provider integration, checkout UI, settlement, refunds, tax calculation, shipping integrations, and production certification.
