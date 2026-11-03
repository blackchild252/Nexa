# NEXA V5.84.0 / B125 — Notification Event Idempotency / Dedupe Integrity

## Scope
B125 closes the notification dedupe race at the database persistence boundary. A dedupe-enabled notification now uses the existing user-scoped unique `(userId,dedupeKey)` index through an atomic `INSERT OR IGNORE`, then resolves the winning event when another concurrent request already inserted it.

## Core change
- Removed the SELECT-then-INSERT race for notification dedupe.
- Preserved the existing unique user-scoped dedupe index.
- Duplicate requests return the existing event and do not requeue push delivery.
- Non-deduped notifications retain their existing insert path.
- Dedupe happens before push-preference evaluation and token fanout.
- Existing notification-center source of truth and delivery architecture remain unchanged.

## Milestones
M1450–M1474: **25/25 IMPLEMENTED / VALIDATED**.

## Verification
- Focused B125 notification idempotency contract: **25/25 PASS**.
- Notification delivery + notification-center regression: **16/16 PASS**.
- Combined B123+B124+B125 notification contracts: **69/69 PASS**.
- Full server suite: not claimed as a full-suite PASS unless the complete run finishes within the authoring execution ceiling.
- Dependency-backed verification remains environment-dependent because installed `node_modules` is not present in the authoring archive.

## Final verification
- Cumulative B112–B125 focused contracts: **343/343 PASS**.
- Combined B123+B124+B125 notification contracts: **69/69 PASS**.
- Full JS/MJS/CJS syntax sweep: **456/456 PASS**.
- Static release suite: **40/40 PASS**.
- Release audit: **PASS — V5.84.0**.
- Release gate: `releaseAudit=true`, `staticReleaseTests=true`; dependency preflight remains blocked only because installed `node_modules` is unavailable in the authoring environment.
- Full server suite: **ATTEMPTED / BLOCKED by authoring-session execution ceiling; no full-suite PASS claimed**.

## Release state
B125 is released from the verified contract/static/release evidence above. Runtime/provider/device validation was not claimed because it was not executed in this authoring environment.

## Next block
**M1475–M1499 / B126**.
