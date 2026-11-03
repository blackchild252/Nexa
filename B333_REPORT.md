# NEXA V5.99.87 B333

## Theme
YaayzAdvert lifecycle and input hardening.

## M4666–M4690
25/25 implemented and internally validated.

## Fixed
- Bounded and integer-validated vendor/admin advert pagination.
- Preserved vendor ownership filtering.
- Preserved active+approved public visibility.
- Added a 1.5 MB cap for inline image data.
- Added explicit advert destination length validation while retaining HTTPS-only destinations.
- Added explicit moderation lifecycle transitions.
- Invalid moderation transitions now return conflict semantics instead of silently changing state.
- Existing moderation reasons, audit records, vendor entitlement and permissions remain intact.

## Validation
- B333 focused contract: 25/25 PASS.
- Cumulative contract suite: PASS.
- admin-web suite: 52/52 PASS.
- Changed JavaScript syntax: PASS.
- Devil’s Walk: PASS, 0 blockers.

## Not tested
- Full dependency-backed server runtime.
- Production database execution.
- Real phone/device.
- Real browser/Playwright.
- EAS/stores/external providers.

## God Hand
The full God Hand planner remains previously blocked by execution timeout; no false PASS is claimed.
