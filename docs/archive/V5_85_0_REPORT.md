# NEXA V5.85.0 / B126 — Push Token Ownership / Registration Integrity

## Scope
B126 closes a security/integrity flaw in push-token registration. The previous `INSERT OR REPLACE` behavior could delete a token row owned by one account and replace it with another authenticated account. B126 establishes token ownership atomically, rejects cross-account takeover, and permits only the current owner to refresh metadata.

## Core change
- Added `server/pushTokenRegistry.js` as the single push-token registration boundary.
- Replaced destructive `INSERT OR REPLACE` registration with transactional `INSERT OR IGNORE` plus owner verification.
- Cross-account reuse returns HTTP 409 without disclosing the existing owner identity.
- Same-account registration updates platform metadata and `updatedAt`.
- Existing send-time token ownership verification remains authoritative.
- User-scoped unregister behavior remains unchanged.

## Milestones
M1475–M1499: **25/25 IMPLEMENTED / VALIDATED**.

## Targeted verification
- Focused B126 contract: **25/25 PASS**.
- Push-token registry behavior: **1/1 PASS**.
- Notification delivery + ownership regression: **10/10 PASS**.

## Final verification
- Cumulative B112–B126 focused contracts: **345/345 PASS**.
- JS/MJS/CJS syntax: **458/458 PASS**.
- Release consistency: **3/3 PASS**.
- Static release suite: **40/40 PASS**.
- Release audit: **PASS — V5.85.0**.
- Full server suite: **ATTEMPTED / BLOCKED after 151 observed tests by authoring-session execution ceiling**; no full-suite PASS claimed.
- Dependency gate: **BLOCKED — node_modules absent**.

## Release state
B126 is released from the verified contract, regression, syntax, consistency, static, and release-audit evidence above. Runtime/device/provider validation was not claimed because it was not executed in this authoring environment.

## Next block
**M1500–M1524 / B127**.
