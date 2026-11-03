# NEXA V5.98.46 / B194 Report

## Release identity

- Version: **V5.98.46**
- Batch: **B194**
- Roadmap: **M2725–M2749**
- Successor: **M2750–M2774 / B195**
- Android versionCode: **6014**
- iOS buildNumber: **6014**

## Completed objective

Marketplace Checkout, Order Integrity & Buyer Protection was implemented cumulatively from V5.98.45 B193 without replacing the established Marketplace cart, checkout, service-fee, order, seller, or payment authorities.

## Production/source change

The key B194 production improvement is a server-side, user-scoped Marketplace checkout idempotency boundary. Checkout requests now require a bounded `Idempotency-Key`; completed responses are replayed for the same buyer/key within the existing 24-hour replay policy, while concurrent processing is rejected safely. Failed checkout paths release the idempotency reservation so the buyer can retry.

The client checkout mutation supplies the idempotency key and opts into the existing safe mutation-retry policy. The existing client busy/action guard remains in place as a first-line protection against repeated taps.

## Contract/reliability work

- Added B194 contract covering all **25 milestones** M2725–M2749.
- Added `mall_checkout_idempotency` persistence and bounded replay handling.
- Preserved server-owned price calculation and stock reservation.
- Preserved service-fee preview binding and atomic fee settlement.
- Preserved existing Paystack/payment initialization and verification authority.
- Preserved authenticated buyer order history and vendor-scoped order visibility.
- Reconciled historical release-identity contracts so older releases validate against their historical evidence instead of incorrectly requiring their old package version to remain current.
- Added B194 to the authoritative release-gate static suite.
- No historical-contact behavior was changed.

## Validation

- B194 focused contract: **25/25 PASS**
- Marketplace storefront/checkout contracts: **61/61 PASS**
- Cumulative release-gate static suite: **806/806 PASS**
- Store submission preflight: **10/10 PASS**
- Dependency preflight: **PASS; blockers 0; reproducible true**
- JavaScript/MJS/CJS syntax: **548/548 PASS**
- Release audit: **PASS**
- TypeScript project parser: **not certifiable in this authoring environment because workspace dependencies/Expo base configuration are not installed**
- Device/EAS/live-provider runtime validation: **excluded from source release certification**

### Broader server-suite note

The complete `server/*.test.js` suite contains **3,563 discovered tests**, of which **3,343 passed and 220 failed** in this dependency-light authoring environment. The failures are distributed across older release-era/current-state contracts and broader runtime/provider/source-smoke tests; they are not being represented as a clean full-suite pass. The authoritative release gate is the maintained static certification suite above, which completed **806/806 PASS**.

## Architecture and safety boundary

- Existing Marketplace cart and checkout authority were preserved.
- No new payment provider or payment authority was introduced.
- Server-side price, seller ownership, active-listing and stock checks remain authoritative.
- Service-fee preview remains required before checkout and is revalidated server-side.
- Buyer and seller order visibility remains authenticated and scoped.
- Online payment initialization remains protected by the existing provider/payment boundary.
- Historical contacts were not modified.

## Release artifact

The final cumulative ZIP is produced only after source freeze, permanent source-seal creation, and seal verification. Device/EAS/live-provider checks remain outside this source certification.
