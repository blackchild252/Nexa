# NEXA V5.98.93 B240 Report

- Roadmap: M3875–M3899
- Focused contract: 25/25 PASS
- Active cumulative release contracts: 206/206 PASS
- Release audit: PASS
- Store submission preflight: PASS
- Environment/deployment checks: EXCLUDED_FROM_RELEASE_CERTIFICATION

## Primary repair

B240 establishes `SUBSCRIPTION_CENTRE_SECTIONS` as the single presentation authority for the seven Subscription Centre sections. Each section now has one canonical structural ID, visible label, and accessibility label in `src/subscriptionCentre.ts`, and the live `Subscription` presentation consumes that authority instead of maintaining duplicate section labels.

## Preserved boundaries

- Canonical presentation remains `/(tabs)/money?view=subscription`.
- `/subscription` remains a compatibility bridge only.
- Vendor membership remains separate from NEXA Membership.
- Aami remains separate from Sky Wallet cash.
- Existing nine service-fee mappings remain centralized.
- No environment/deployment changes were included.
