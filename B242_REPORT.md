# NEXA V5.98.95 B242 Report

- Roadmap: M3925–M3949 / B242
- Focused contract: 25/25 PASS
- Active cumulative release contracts: 206/206 PASS
- Subscription unit tests: 10/10 PASS
- Vendor AI unit tests: 3/3 PASS
- Release audit: PASS
- Store submission preflight: PASS
- Dependency preflight: PASS; blockers empty; workspace dependencies not installed
- Environment/device/deployment execution: EXCLUDED_FROM_RELEASE_CERTIFICATION

## B242 change
B242 hardens the Subscription Centre service-fee authority. The nine fee mappings are now stable records with typed server-facing codes and labels. A derived code lookup and resolver prevent tuple-position assumptions from leaking into the live presentation. Existing fee codes, labels, policy order, pricing behavior, and server integrations are preserved.

## Preservation
- Canonical Subscription Centre presentation remains inside Sky Money.
- `/subscription` remains the compatibility bridge.
- Vendor Membership remains separate from NEXA Membership.
- Aami remains separate from Sky Wallet cash.
- Vendor AI authorization and preview integrity remain active.
- Yaayz advertising boundary remains unchanged.

## Certification
Environment/deployment configuration is intentionally excluded from this run. Historical release contracts remain retained as immutable evidence; B242 is the active current contract.
