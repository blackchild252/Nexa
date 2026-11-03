# NEXA V5.98.47 / B195 Report

## Release identity

- Version: **V5.98.47**
- Batch: **B195**
- Roadmap: **M2750–M2774**
- Successor: **M2775–M2799 / B196**
- Android versionCode: **6015**
- iOS buildNumber: **6015**

## Completed objective

Marketplace Orders, Fulfilment & Buyer/Seller Communication Integrity was implemented cumulatively from V5.98.46 B194 without replacing the established Marketplace cart, checkout, service-fee, order, seller, payment, or messaging authorities.

## Production/source changes

- Added an authenticated, buyer-or-participating-seller scoped order-event history endpoint with bounded chronological results.
- Buyer cancellation now records an authoritative order event inside the same write transaction.
- Seller fulfilment transitions now use guarded item updates and record the resulting order-state event inside the same transaction.
- Seller order payloads no longer expose the buyer's account email; fulfilment address remains available where required for delivery.
- Preserved the existing authenticated NEXA DM authorization and rate-limit boundaries for communication.
- Preserved existing order notification routing and authoritative order identifiers.
- Preserved existing checkout/payment authority and stock/payment race protections.
- Reconciled B194 historical release identity validation to use historical evidence rather than requiring an old release to remain current.
- Added B195 to the authoritative cumulative release gate.
- No historical-contact behavior was changed.

## Validation

- B195 focused contract: **25/25 PASS**
- Carried-forward Marketplace storefront/checkout/order contracts: **70/70 PASS**
- Cumulative release-gate static suite: **831/831 PASS**
- Store submission preflight: **10/10 PASS**
- Dependency preflight: **PASS; blockers 0; reproducible true**
- JavaScript/MJS/CJS syntax: **553/553 PASS**
- Release audit: **PASS**
- Permanent source seal: **PASS after final source freeze**
- TypeScript project parser: **not certifiable in this authoring environment because workspace dependencies/Expo base configuration are not installed**
- Device/EAS/live-provider runtime validation: **excluded from source release certification**

## Architecture and safety boundary

- Existing Marketplace cart and checkout authority were preserved.
- No new payment provider or payment authority was introduced.
- Server-side order ownership, fulfilment transitions, stock handling, and payment boundaries remain authoritative.
- Seller account email is no longer included in the vendor order payload.
- Order event history is available only to the buyer or a seller participating in that order.
- Existing NEXA direct-message friendship/authentication/rate-limit boundaries remain canonical.
- Historical contacts were not modified.

## Release artifact

The final cumulative ZIP is produced only after source freeze, permanent source-seal creation, and seal verification. Device/EAS/live-provider checks remain outside this source certification.
