# NEXA V5.54.6 — Navigation Route-Group Continuity Repair

## Scope
Cumulative patch directly on V5.54.5 / B91. No new 25-milestone roadmap block.

## Repair
Expo Router can expose `/(tabs)` route-group prefixes in pathname values. NEXA navigation helpers now strip that structural prefix before resolving titles and directory ownership, preserving the same navigation identity as ungrouped routes.

## Regression coverage
Added grouped-route assertions for Money, Yaayz, Marketplace, and Search.

## Versioning
- Project Version: V5.54.6
- Batch: B92
- Release archive: `NEXA-V5.54.6-B92.zip`
- Batch advancement: +1 from B91 after successful release verification.
