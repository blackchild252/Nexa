# NEXA V5.98.4 / B142 — Payment attention report

Batch: **B142**
Milestones: none (patch release)
Status: **IMPLEMENTED / VALIDATED**

Follows V5.98.3 / B141.

## Finding [READ]
The Paystack webhook is idempotent and retries failed fulfilment, and the apps' verify routes let a returning user settle a payment. But when money arrives for an order that was already cancelled or expired (for example a Yaayz reservation), the webhook records `cancelled_*`, replies 200 and nothing flags it: the customer has paid and no administrator is told. No admin surface showed unresolved payment outcomes at all.

## Change
- `server/paymentAttention.js`: pure, read-only classifier over `mall_payment_events`. Categories: paid after cancellation, payment without order, amount or status mismatch, order boundary mismatch, fee settlement pending, fulfilment failed, refund without record, refund failed, and unfinished events (outcome still `received` after 15 minutes by default).
- `GET /api/admin/payments/attention`: administrator-only (`isConfiguredAdmin`), paginated (max 100), returns reference, event type, outcome, category and time. Never returns body hashes, event keys or request bodies.
- Webhook behaviour is unchanged.
- `server/v5_98_4_payment_attention.contract.test.js`: 8 tests, including behavioural tests against a real SQLite database (`node:sqlite`).

## Not done (needs a live Paystack account)
A background job that re-verifies old `pending_payment` orders against Paystack. It would need provider calls that cannot be tested here. The report makes the gap visible so an administrator can reconcile manually.

## Version sync
package.json, package-lock.json (both entries), server/package.json, app.json, src/theme.ts, VERSION.md, PROJECT_MEMORY.json, the three roadmaps.
