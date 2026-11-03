# B236 REPORT — NEXA V5.98.89

## Roadmap
- M3775–M3799
- 25/25 focused contract PASS

## Scope
Vendor AI product-image approval integrity. Environment, device, EAS, live-provider and deployment execution excluded.

## Implemented
- Added server-owned `vendor_ai_image_previews` records.
- Added cryptographically random preview tokens.
- Scoped previews to product and vendor ownership.
- Added 10-minute preview expiry.
- Added single-use atomic consumption.
- Stored source-image SHA-256 provenance.
- Stored generated-preview SHA-256 integrity.
- Approval no longer accepts a client-supplied image payload.
- Approval retrieves the server-stored preview by token.
- Approval verifies source-image provenance before gallery insertion.
- Approval verifies generated-preview integrity before gallery insertion.
- Existing vendor upload, cover, remove and gallery paths preserved.
- Client discard/close paths clear preview credentials.

## Validation
- B236 focused contract: 25/25 PASS
- Active cumulative contracts: 206/206 PASS
- Vendor AI unit contract: PASS
- Release audit: PASS
- Store preflight: PASS
- Environment/device/EAS/live-provider checks: EXCLUDED_FROM_RELEASE_CERTIFICATION

## Release
- Version: V5.98.89
- Batch: B236
- Archive: `NEXA-V5.98.89.zip`
- Next roadmap: M3800–M3824 / B237
