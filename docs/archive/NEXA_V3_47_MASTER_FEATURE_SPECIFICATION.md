# NEXA V3.47 — Marketplace Listings & Discovery

## Goal
Define the listing lifecycle and buyer discovery experience for the NEXA marketplace.

## Scope
- Seller listing creation, editing, draft, publish, pause, and archive states.
- Listing fields: title, description, category, price/currency, location where applicable, media references, condition, and availability.
- Buyer discovery by keyword, category, price range, location, and sort order.
- Listing detail view with seller profile and inquiry/favorite actions.
- Pagination, empty states, loading/error states, and validation feedback.
- Moderation/reporting hooks and seller ownership checks.

## Safety and integrity
- Validate and normalize user input on the server.
- Enforce ownership and authorization for every listing mutation.
- Do not expose private seller information or internal identifiers.
- Rate-limit listing creation and search; prevent duplicate submissions where feasible.
- Clearly distinguish listing content from platform-verified claims.

## Acceptance criteria (not yet verified)
1. Authorized sellers can create, edit, publish, pause, and archive their own listings.
2. Unauthorized users cannot modify another seller's listing.
3. Buyers can search and filter published listings and open listing details.
4. Draft and archived listings do not appear in public discovery.
5. Invalid input, empty results, and service failures have clear UI states.
6. Automated tests cover listing lifecycle, access control, filtering, pagination, and error cases.

## Status
Specification only. Implementation, API/database integration, UI wiring, and automated tests remain pending.
