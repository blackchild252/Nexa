# NEXA V3.47.1 — Marketplace Listings & Discovery

## Implemented in this increment
- Expanded public catalog search with validated price range filters and `newest`, `price_asc`, and `price_desc` ordering.
- Added cursor pagination compatible with each supported sort order and retained bounded page sizes.
- Added a public product-detail endpoint that only returns active listings and a corresponding client API helper.
- Added a per-IP catalog-search rate limit and explicit invalid-filter/cursor responses.

## Validation
- `node --check server/index.js`: passed.
- Server automated test suite: run status recorded in delivery summary.
- UI/device testing and dedicated endpoint integration tests are not claimed as completed.

## Scope notes
This builds on the existing `mall_products` catalog. Location/condition/media-reference fields and a dedicated marketplace-listing entity are not added in this increment. Listing lifecycle and moderation remain in the preceding increment where present.
