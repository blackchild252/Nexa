# NEXA Main B412 Report — V6.0.66

## Scope
B412 / M6091–M6115 delivers Marketplace delivery-fee estimates without inventing distance, courier, geocoding or provider data.

## Product work
- Added persistent vendor delivery-policy authority.
- Vendors can configure a flat-per-order or per-item delivery estimate.
- Added owner-scoped vendor read/update routes.
- Added buyer delivery-estimate preview for selected cart lines.
- Multi-seller carts are grouped by vendor and aggregated when currencies agree.
- Variant products retain the existing authoritative variant validation during estimation.
- Sellers without a configured policy are explicitly reported instead of receiving a fabricated fee.
- Buyer checkout displays the estimate separately from the NEXA Marketplace service fee.
- Checkout totals and payment authority remain unchanged; final delivery fees remain seller-confirmed.
- Added accessible Vendor Dashboard delivery-policy controls and save-state feedback.

## TESTED/PASSED
- B412 focused delivery-estimate/vendor-policy suite: 10/10.
- Existing fee-preview boundary suite: 6/6.
- Dependency-free cumulative Main contracts: 499/499.
- Devil's Walk: CLEAN — 759/759 JavaScript syntax, 210 TypeScript syntax, 679/679 imports, 44/44 route targets; 22 non-blocking border advisories.
- Angels Duty: 0 blockers; 5 historical exact-duplicate groups remain review-only.
- God Hand: PASS.
- Release audit: PASS.
- Release identity: PASS.

## NOT TESTED
- Complete dependency-backed `npm run test:server` runtime suite to completion.
- Dependency-backed TypeScript typecheck; node_modules is absent.
- Browser/device runtime.
- Live courier/geocoding/provider integrations.
- EAS builds, stores and production deployment.

## Known historical runner limitation
The legacy B144 WIP9 variant contract cannot run directly under the current Node test runner because it imports a TypeScript module containing `export type`; this is an environment/runner limitation, not a B412 delivery-estimate failure. B412's own variant-validation regression passes.

## Launch blockers
No new launch-dependent values were invented. Existing owner-supplied production HTTPS values and legal publication requirements remain outside this feature block.
