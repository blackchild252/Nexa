# NEXA Location-Aware Experience Design

## Goal
Make NEXA location-aware across discovery, vendors, sellers, advertisers and other proximity-sensitive experiences while preserving useful operation when device location is unavailable.

## Core policy
- Device location is requested as an experience-enhancing permission, not as a silent requirement.
- NEXA must explain why location improves local relevance before requesting permission where the platform allows a rationale screen.
- Exact device coordinates must not be displayed to other users or exposed through ordinary public profiles.
- Server-side authorization and privacy rules remain the boundary for location data.
- Location-derived results should use coarse geographic buckets for public-facing matching wherever exact coordinates are unnecessary.

## Location states
1. `precise_enabled`: device provides current location; use it for proximity-sensitive ranking/matching where consent and policy allow.
2. `approximate_enabled`: device provides only approximate location; use coarse matching and never assume street-level precision.
3. `permission_denied`: do not repeatedly prompt; fall back to user-selected country/city and explain that results may be less local.
4. `unavailable`: use existing profile geography or other explicitly supplied location context.
5. `stale`: use the last acceptable coarse location only for bounded fallback behavior; do not imply it is current.

## Experience rules
- Local vendors/sellers/services are ranked ahead of distant providers when the service is location-sensitive.
- Advertisers may target an allowed geographic area but must not receive a user's raw location merely because the user is nearby.
- International content remains available when appropriate; location changes ranking/relevance rather than turning NEXA into a country-locked app.
- Marketplace, vendor services, fitness, kitchen/local services, discovery and Chase can use location relevance where their business rules require it.
- Chase may use coarse proximity tiers; it must not expose exact coordinates.
- If no location is available, NEXA should remain functional with country/city/manual selection and clearly label reduced local relevance.
- Users must be able to change or disable location-based personalization through privacy/settings controls.

## Technical direction
- Add a single location context/provider rather than independent permission logic in every feature.
- Normalize device location into a privacy-safe server representation with timestamp, accuracy class and coarse geography.
- Server endpoints should accept location context only where needed and must validate freshness, consent and purpose.
- Avoid storing raw coordinates unless an explicitly justified feature requires them; prefer coarse geohash/region representations.
- Location-sensitive ranking must degrade deterministically when location is missing.
- Tests must cover denied permission, approximate permission, stale location, mismatched country/city, and no-location fallback.
