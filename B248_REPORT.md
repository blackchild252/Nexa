# B248 — V5.99.2

## Roadmap
M4075–M4099

## Scope
Canonical Subscription Centre navigation authority and release-identity reconciliation.

## Fixed
- MoneyDashboard now imports and uses `navigationForSubscription()` from the canonical navigation authority.
- Removed the duplicate hard-coded `/money?view=subscription` user-facing navigation from MoneyDashboard.
- Preserved the `/subscription` compatibility bridge for legacy/deep links.
- Preserved Home Membership canonical navigation.
- Preserved all seven Subscription Centre section definitions and stable service-fee authority.
- Reconciled package, server, Expo/native, lockfile, Home, Subscription Centre and theme release identity to V5.99.2.
- Advanced Android/iOS build identity to 6067.
- Superseded B247's exact-release contract in the active gate while retaining it as historical evidence.

## Verification
- Focused B248 contract: 25/25 PASS
- Subscription suite: 10/10 PASS
- Vendor AI suite: 3/3 PASS
- Active cumulative release contracts: 206/206 PASS
- Release audit: PASS
- Store preflight: 10/10 PASS
- Environment/deployment/device/live-provider checks: EXCLUDED
