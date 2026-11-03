# NEXA V5.98.5 / B143 — Pending-payment reconciler

Batch: **B143**
Milestones: none (patch release)
Status: **IMPLEMENTED / VALIDATED**

Follows V5.98.4 / B142.

## Gap closed [READ]
Kitchen and Yaayz ticket orders start as `pending_payment`. The Paystack webhook, or the app calling its verify route, moves them to paid. If both are missed the order stays pending although the customer paid. V5.98.4 made payments the webhook could not apply visible; this release also covers the case where nothing arrived at all.

## Change
- `server/paymentReconciler.js`: background job started from `server/index.js` (first run 30 s after boot, then every 5 minutes).
- Candidates: Kitchen and Yaayz orders with a payment reference, status `pending_payment` (or `cancelled`), older than 15 minutes and younger than 48 hours. At most 20 Paystack checks per run.
- Paystack says **paid** and reference, currency and amount match (`payments.matchesExpectedPayment`, the webhook's own matcher): the order is confirmed with the same guarded `UPDATE ... WHERE status='pending_payment' AND paymentRef=?`, the service fee is settled as the webhook does, and the customer gets the usual push.
- Order was **cancelled** but Paystack says paid: never reopened; recorded as `cancelled_kitchen_order` / `cancelled_ticket_order` so the attention report lists it for refund.
- Amount or currency **mismatch**: never confirmed; recorded as `kitchen_mismatch` / `ticket_mismatch`.
- Not paid yet: re-checked after 15 m, 30 m, 1 h, 2 h, 4 h, 8 h, then given up (`reconcile_gave_up`).
- Paystack errors do not use up an attempt; a run stops after 3 consecutive provider errors.
- State is kept in `mall_payment_events` under eventKey `reconcile:<reference>`. No schema change.
- Runs only when `PAYMENT_MODE=live`, `PAYSTACK_SECRET_KEY` is set and `NODE_ENV` is not `test`. Kill switch: `PAYMENT_RECONCILE_DISABLED=1` (documented in `server/.env.example`).
- Webhook and verify-route behaviour unchanged.

## Tests [RAN]
`server/v5_98_5_payment_reconciler.contract.test.js`: 13 tests, behavioural, against a real SQLite database with a fake Paystack.

## Not verified [NOT VERIFIED]
Behaviour against the live Paystack API. Watch the first live runs (`[NEXA] Payment reconciler:` log lines) and the admin attention report.

## Version sync
package.json, package-lock.json (both entries), server/package.json, app.json, src/theme.ts, VERSION.md, PROJECT_MEMORY.json, the three roadmaps.
