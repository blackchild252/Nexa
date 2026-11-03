# NEXA V4.14.0 Implementation Report — Zeeza Chase & Subscription Reach

## Scope
This milestone bundled five issues: rename the user-facing Zeeza discovery surface to **Chase**; add a transparent Chase Reach category to Free/Regular/Premium/VIP pricing; enforce reach server-side; add a safety-first Chase-mode social feel; and reduce coarse-location gaming with a 72-hour change cooldown.

## Subscription Chase Reach
- **Free:** Nearby Chase — local discovery only; local stranger-add limit 5/day.
- **Regular:** Country Chase — local + same-country discovery; local 5/day, country 2/day.
- **Premium:** Global Chase — local + same-country + international discovery; local 5/day, country 3/day, international 2/day.
- **VIP:** Royal Global Chase — same reach categories with expanded limits: local 10/day, country 6/day, international 4/day.
- The active plan is derived server-side from the authenticated subscription record. Frontend visibility is not the security boundary.

## Chase Safety
- Existing explicit opt-in and current terms-version requirement remain mandatory for showcased profiles.
- Exact address/GPS are not used.
- Block checks, account-status checks, rate limiting and pending-request cap remain enforced.
- Approximate location changes are limited by a 72-hour cooldown after an established location is changed.
- Distant requests remain deliberately constrained even on paid tiers.
- Chase language frames discovery around friendship, shared interests and meeting people; a discoverable profile is not treated as consent to conversation or a response.

## Compatibility
- Existing internal `/api/social/explore` and `explore` code identifiers remain intact for backward compatibility.
- User-facing navigation and copy now say **Chase**.

## Validation
- Syntax checks: PASS.
- Targeted builder/release/subscription/Chase suite: **22/22 PASS**.
- Full server suite: **391/391 PASS**.
- Device/Playwright/Sentry/provider runtime validation remains environment-dependent and was not represented as passed here.

## Files of note
- `server/subscriptions.js` — Chase Reach pricing/plan metadata.
- `server/friends.js` — authenticated plan gating and Chase safety enforcement.
- `server/db.js` — coarse-location change timestamp migration.
- `src/ZeezaExplore.tsx` — Chase-mode UX.
- `src/ZeezaProfile.tsx` — Chase consent/profile copy.
- `src/app/(tabs)/zeeza.tsx` — Chase navigation label.
- `src/Subscription.tsx` — Chase Reach shown in tier pricing.
- `V4_14_0_IMPLEMENTATION_REPORT.md` — this report.
