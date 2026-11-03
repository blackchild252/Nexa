# NEXA V3.48 — Marketplace Buyer/Seller Interactions

## Scope
Define the buyer-to-seller interaction layer for marketplace listings. This document is a specification; it does not claim these features are implemented.

## Functional requirements
1. Buyers can send an inquiry tied to a listing and seller.
2. Sellers can view, respond to, and close inquiries.
3. Conversation records retain listing context and participant IDs.
4. Buyers can save/favorite listings and remove favorites.
5. Buyers and sellers can report abusive messages or listings.
6. Users can block another user; blocked users cannot initiate new interactions.
7. Listing availability and seller status are shown without exposing private contact information.

## Security and privacy
- Enforce authentication and participant-level authorization on every read/write.
- Validate listing ownership and listing status server-side.
- Rate-limit inquiry creation and report submission.
- Sanitize message content and prevent unauthorized attachment access.
- Keep user data isolated; provide deletion/retention rules for inquiry records.

## Acceptance criteria
- Unauthorized users cannot read or modify another user's inquiries.
- Inquiry creation fails for missing, archived, or inaccessible listings.
- Blocking prevents new direct interactions in both directions.
- Duplicate submissions are safely handled and do not create duplicate inquiry records.
- Favorite add/remove state persists across sessions.
- Reports are recorded for moderation review without exposing reporter identity to the reported user.

## Validation status
No implementation or automated acceptance tests are included or verified in this specification build.
