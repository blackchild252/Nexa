# NEXA V5.98.98 B245 — Release Report

## Roadmap
M4000–M4024 / B245

## Theme
Canonical user-facing Subscription Centre navigation with legacy-route compatibility preservation.

## Changes
- Moved the Home user-facing NEXA Membership entry to the canonical Sky Money Subscription Centre presentation: `/(tabs)/money?view=subscription`.
- Added an explicit `compatibilityRoute` field for `/subscription` so legacy/deep links remain supported without being the primary user-facing destination.
- Kept the canonical Subscription Centre navigation resolver unchanged and authoritative.
- Preserved the legacy route in route inventory and navigation-title handling for compatibility.
- Preserved the seven-section Subscription Centre authority and stable service-fee authority.
- Preserved Vendor Membership, Aami/Sky Wallet, Vendor AI and Yaayz boundaries.

## Verification
- B245 focused contract: 25/25 PASS
- Subscription unit suite: 10/10 PASS
- Vendor AI unit suite: 3/3 PASS
- Active cumulative release contracts: PASS
- Release audit: PASS
- Store submission preflight: 10/10 PASS
- Permanent seal: pending — created after this report is finalized
- Environment/deployment execution: EXCLUDED_FROM_RELEASE_CERTIFICATION

## Next roadmap
M4025–M4049 / B246
