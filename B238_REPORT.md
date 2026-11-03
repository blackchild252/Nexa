# B238 REPORT — NEXA V5.98.91

## Roadmap
- M3825–M3849
- 25/25 focused contract PASS

## Scope
Release identity reconciliation and canonical Subscription Centre navigation target. Environment, device, EAS, live-provider and deployment execution excluded.

## Implemented
- Corrected VERSION.md drift left by B237 so current release/batch are authoritative.
- Added a single canonical Subscription Centre navigation target object.
- Routed directory subscription navigation through that canonical target.
- Routed the subscription navigation resolver through that same canonical target.
- Preserved `/subscription` as a compatibility-only deep-link bridge.
- Kept Sky Money as the live Subscription Centre presentation owner.
- Preserved the seven Centre categories, nine service-fee mappings, vendor membership boundary, and Aami/Sky Wallet separation.
- Added 25 focused regression assertions covering release metadata and navigation authority.

## Validation
- B238 focused contract: 25/25 PASS
- Active cumulative contracts: pending final release gate
- Release audit: pending final certification
- Environment/device/EAS/live-provider checks: EXCLUDED_FROM_RELEASE_CERTIFICATION

## Release
- Version: V5.98.91
- Batch: B238
- Archive: `NEXA-V5.98.91.zip`
- Next roadmap: M3850–M3874 / B239
