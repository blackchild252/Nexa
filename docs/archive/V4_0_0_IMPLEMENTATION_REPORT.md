# NEXA V4.0.0 Implementation Report — Subscription Plan Lifecycle

## A. Current version
NEXA V4.0.0, built directly from V3.99.0.

## B. Already present
- Free, Regular, Premium and VIP subscriptions.
- Wallet-funded membership activation and renewal.
- Server-owned service-fee catalog and fee-preview integrity.
- Existing Store Ajo, Dream Marketplace, Yaayz and Kitchen fee integrations.

## C. Changed
- Added `nextPlanId` to the server-owned subscription state.
- Added authenticated plan-change scheduling and cancellation endpoints.
- Paid-tier changes now take effect at the next renewal rather than charging membership immediately.
- Renewal selects the pending plan, applies its monthly cap, charges the membership fee atomically, and clears the pending plan.
- Cancelling a subscription clears pending plan changes.
- Subscription UI now distinguishes initial activation from a scheduled plan change and displays the pending next-renewal tier.

## D. Preserved
- Existing membership prices.
- Existing service-fee catalog and fee-preview rules.
- Existing Wallet ledger and idempotency model.
- Current plan remains active until its renewal boundary.
- Royal Dark / VIP presentation.
- Authentication and user scoping.

## E. Tests
- Full server regression: **332/332 PASS**.
- Targeted subscription lifecycle suite: **10/10 PASS**.
- `node --check server/subscriptions.js`: **PASS**.

## F. Security/access control
- Plan-change operations require the authenticated user.
- Only the caller's subscription can be changed.
- No client-supplied membership amount is trusted.
- The new plan's server-defined membership price is charged only at the renewal boundary.
- Pending plan changes are cleared when the subscription is cancelled.

## G. Untested / blocked
- Expo/TypeScript validation: **BLOCKED** by the unavailable Expo dependency tree.
- Playwright/device validation: **BLOCKED** by unavailable installed browser/dependency tree.
- Live Paystack/bank/PSP: **NOT CLAIMED**.
- Live Sentry: **NOT CLAIMED**.

## H. Architectural decision
Plan changes are scheduled rather than charged immediately. This avoids surprise membership charges and keeps the current service-fee plan stable until the renewal boundary.
