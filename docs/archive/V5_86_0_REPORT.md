# NEXA V5.86.0 / B127 — Push Token Retirement / Cross-Account Cleanup Integrity

B127 closes a cross-account cleanup race in push-token retirement. A stale notification delivery could previously delete a token by token identity alone after Expo reported `DeviceNotRegistered`; if the token had already been legitimately re-registered to another account, that cleanup could remove the newer owner’s registration.

## Milestones
M1500–M1524: **25/25 IMPLEMENTED / VALIDATED**.

## Repair
- Immediate provider-error retirement now deletes by `(token,userId)` using the notification event owner.
- Receipt-based `DeviceNotRegistered` retirement resolves the notification event owner and deletes only `(token,userId)`.
- Token-only cleanup statements were removed from notification delivery.
- Existing send-time ownership, registration ownership, unregister scoping, receipt lifecycle, and notification source-of-truth behavior remain intact.

## Verification
- Focused B127 contract: **25/25 PASS**.
- Immediate DeviceNotRegistered owner-scoping behavior: **1/1 PASS**.
- Cumulative B112–B127 contract tests: **347/347 PASS**.
- JS/MJS/CJS syntax: **459/459 PASS**.
- Release consistency: **3/3 PASS**.
- Static release suite: **40/40 PASS**.
- Release audit: **PASS — V5.86.0**.
- Full server suite: **ATTEMPTED / BLOCKED by authoring-session execution ceiling**; no full-suite PASS claimed.
- Dependency gate: **BLOCKED — node_modules absent**.

## Release
B127 is sealed for release as `NEXA-V5.86.0-B127.zip`.
