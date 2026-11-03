# NEXA V5.98.96 B243 — Release Report

## Roadmap
M3950–M3974 / B243

## Theme
Subscription Centre fee presentation integrity and typed server-response authority.

## Changes
- Typed the Subscription Centre service-fee response in the live UI.
- Reused the canonical `SubscriptionServiceFeeCode` authority.
- Resolved fee definitions through the stable service code.
- Keyed fee rows by stable code instead of presentation labels.
- Removed the silent `0` amount fallback when a server fee is missing.
- Added an explicit unavailable state for missing server fee data.
- Preserved all nine existing service-fee codes and labels.
- Preserved canonical Subscription Centre routing and compatibility routing.
- Preserved Vendor AI and Yaayz boundaries.

## Verification
- B243 focused contract: 25/25 PASS
- Subscription unit suite: 10/10 PASS
- Vendor AI unit suite: 3/3 PASS
- Active cumulative release contracts: PASS
- Release audit: PASS
- Store preflight: PASS
- Environment/deployment execution: EXCLUDED_FROM_RELEASE_CERTIFICATION

## Next roadmap
M3975–M3999 / B244
