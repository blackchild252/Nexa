# NEXA V3.96.0 Implementation Report — Dream Marketplace Service-Fee Integration

## A. Current version
NEXA V3.96.0, built forward from V3.95.0.

## B. Already present
- NEXA Wallet and append-only ledger.
- Subscription/monetization service-fee catalog.
- Store Ajo fee integration.
- Dream Marketplace checkout and existing Paystack payment boundary.

## C. Changed
- Added Marketplace fee preview using the existing authenticated Subscription fee-preview endpoint.
- Added server-authoritative Marketplace fee recalculation and Wallet readiness checks.
- Direct seller checkout now settles the Marketplace service fee atomically with order creation.
- Online Marketplace payments now persist provider verification separately and settle the NEXA fee after provider verification.
- Added pending-fee retry behavior when Wallet funds or the monthly cap are insufficient.
- Added Marketplace order fields for provider verification and fee settlement state.
- Updated Marketplace checkout UI to display the fee and block confirmation until a preview exists.
- Added targeted Marketplace fee integration contracts.

## D. Preserved
- Existing Marketplace product prices and seller/provider payment amounts.
- Pay seller directly and Paystack online options.
- Existing stock reservation, cancellation, refund, dispute, vendor and payment-history behavior.
- Existing user authentication and order ownership boundaries.
- Royal-dark visual language.

## E. Tests
- Targeted Marketplace fee contracts: PASS (5/5).
- Node syntax checks: PASS for `server/index.js`, `server/db.js`, and `server/subscriptions.js`.
- Full server regression: NOT YET RUN after this patch.
- Playwright/device: BLOCKED by unavailable installed dependency/browser tree.
- Live Paystack: DEFERRED until provider credentials/runtime are configured.
- Live Sentry: BLOCKED until a real DSN is configured.

## F. Exact intended checks
1. `node --check server/index.js`
2. `node --check server/db.js`
3. `node --test server/marketplaceFeeIntegration.test.js`
4. Full server regression when dependencies are installed.
5. Playwright Marketplace checkout smoke when Expo/Playwright dependencies are installed.

## G. Untested / blocked
No live provider, device, Playwright browser, or Sentry event claim is made.

## H. Security/access control
- Marketplace preview and payment verification remain authenticated.
- Payment verification remains user-scoped by `paymentRef + userId`.
- Fee settlement uses a server-owned service code and idempotency key.
- Client-supplied fee amounts are ignored.
- Provider verification and fee settlement are persisted separately to avoid falsely marking an externally paid order as fully settled when the Wallet fee cannot be charged.

## I. Roadmap
Next module: audit and integrate the same fee pattern into the next chargeable payment-backed surface, currently Yaayz or Kitchen.

## J. Complete ZIP
Will be generated after validation.

## K. SHA-256
Will be calculated after the validated cumulative ZIP is created.

## L. Next milestone
Complete validation, then seal V3.96.0 before starting the next module.
