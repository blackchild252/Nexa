# B237 REPORT — NEXA V5.98.90

## Roadmap
- M3800–M3824
- 25/25 focused contract PASS

## Scope
Subscription Centre structural authority and canonical Sky Money presentation. Environment, device, EAS, live-provider and deployment execution excluded.

## Implemented
- Added a single Subscription Centre structural authority.
- Defined the seven canonical Centre categories.
- Centralized all nine displayed service-fee mappings.
- Kept `/subscription` as a compatibility route only.
- Kept Sky Money `/(tabs)/money?view=subscription` as the canonical presentation.
- Kept navigation, Money routing and the Subscription screen aligned to the same authority.
- Preserved separate vendor membership and Aami/Sky Wallet boundaries.
- Preserved the existing subscription implementation rather than creating a duplicate screen.

## Validation
- B237 focused contract: 25/25 PASS
- Active cumulative contracts: 206/206 PASS
- Release audit: PASS
- Environment/device/EAS/live-provider checks: EXCLUDED_FROM_RELEASE_CERTIFICATION

## Release
- Version: V5.98.90
- Batch: B237
- Archive: `NEXA-V5.98.90.zip`
- Next roadmap: M3825–M3849 / B238
