# NEXA V3.50 — Marketplace Checkout and Payments

**Status:** PLANNED / SPECIFICATION ONLY

## Objective
Define a secure, auditable checkout and payment boundary for marketplace orders. This specification is not an implementation.

## Scope
- Checkout review: items, seller, quantities, pricing, taxes/fees where applicable, delivery/pickup details, and final total.
- Explicit buyer confirmation before placing an order or initiating payment.
- Payment-provider hosted/tokenized flow; NEXA must not collect or store raw card numbers, CVVs, or provider secrets.
- Provider-backed payment intents and verified server-side webhooks; never trust client-reported payment success.
- Idempotency keys and order/payment state transitions to prevent duplicate charges and orders.
- Clear pending, authorized, paid, failed, canceled, refunded, and disputed states where supported by provider.
- Refund initiation and status tracking with role checks and audit events.
- Reconciliation records linking provider references to NEXA order IDs without storing sensitive payment credentials.
- User-visible receipts and payment history with access controls.

## Required safeguards
1. Recalculate prices and totals on the server using authoritative listing data.
2. Verify webhook signatures and reject replayed or malformed events.
3. Enforce buyer/seller authorization on every order and payment operation.
4. Make payment and order transitions atomic or recoverable; document retry and compensation behavior.
5. Do not mark an order paid until verified provider confirmation is received.
6. Log security-relevant events while minimizing personal and payment data.
7. Provide clear failure handling and avoid automatic repeated charging.

## Acceptance criteria (not yet executed)
- Checkout totals are server-calculated and cannot be altered by client payloads.
- Duplicate checkout requests do not create duplicate orders or charges.
- Invalid webhook signatures and replayed events are rejected.
- Payment status changes only after verified provider events.
- Unauthorized users cannot read or modify another user's order/payment data.
- Failed, canceled, refunded, and delayed-payment cases are covered by automated tests.
- Provider sandbox and end-to-end tests pass before any production release.

## Dependencies and open decisions
- Select supported payment provider(s), merchant country/currency coverage, tax and fulfillment model, refund policy, and compliance obligations.
- Confirm backend persistence and webhook infrastructure.
- Build checkout UI and provider integration only after these decisions are approved.

## Validation status
No checkout or payment implementation, provider integration, automated tests, security review, or device testing is claimed in this build.
