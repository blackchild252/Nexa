# NEXA V3.46 — Marketplace & Commerce Foundations

## Status
Planning/specification only. No marketplace implementation or tests are included in this milestone.

## Objective
Define a secure foundation for discovering listings and managing seller-created offers in NEXA.

## Scope
- Marketplace domain model: seller profile, listing, category, media references, price, currency, inventory/status, timestamps.
- Listing lifecycle: draft, published, paused, sold/closed, removed; validate transitions and record changes.
- Discovery: category browsing, text search, filters, pagination, and deterministic sorting.
- Seller controls: create, edit, preview, publish, pause, and delete own listings.
- Buyer actions: save/favorite a listing and initiate a contact or inquiry flow; no payment processing in this milestone.
- Trust and safety: report listing/seller, moderation status, prohibited-item policy hooks, block controls, and audit trail.
- Security: authenticated access, ownership checks, input validation, rate limiting, safe media handling, and user-data isolation.
- Accessibility and responsive UI requirements.

## Acceptance criteria for a future implementation
1. Users can only modify listings they own or are authorized to moderate.
2. Invalid listing state transitions are rejected.
3. Search and browse support pagination and return only visible listings.
4. Reports create reviewable records without exposing reporter identity to the reported seller.
5. Automated tests cover listing lifecycle, authorization, search filters, pagination, reporting, and abuse cases.
6. Payment, escrow, payouts, and external commerce integrations remain explicitly out of scope until separately designed and reviewed.

## Dependencies
Authentication, user profiles, media storage, notification infrastructure, and moderation/reporting services.
