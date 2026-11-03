# NEXA V5.83.0 / B124 — Notification Worker Concurrency / Lease Integrity

## Scope
B124 closes the concurrency gap in the Expo push receipt lifecycle. Provider receipt polling now uses an atomic `receipt_checking` lease so overlapping workers cannot process the same awaiting receipt simultaneously. Stale receipt-check workers are bounded and recoverable.

## Milestones
- M1425–M1449: **25/25 IMPLEMENTED / VALIDATED**.

## Core changes
- Added five-minute `RECEIPT_LEASE_MS`.
- Added `receiptCheckAt` persistence and migration compatibility.
- Added receipt-check lease index.
- Added atomic transition `awaiting_receipt → receipt_checking`.
- Cleared the lease on successful, permanent-error, missing-receipt, retry, and terminal transitions.
- Added stale receipt-check recovery.
- Wired startup and delivery-loop recovery.
- Preserved the existing `sending` worker recovery path and notification source of truth.
- Advanced schema boundary from `schema-v113` to `schema-v114`.

## Verification
- Focused B124 worker contract: **25/25 PASS**.
- Notification delivery regression: **10/10 PASS**.
- Combined B124 focused + notification regression: **35/35 PASS**.
- Cumulative B112–B124 focused contracts: **338/338 PASS**.
- JS/MJS/CJS syntax sweep: **455/455 PASS**.
- Dependency-independent static release suite: **40/40 PASS**.
- Release audit: **PASS — V5.83.0**.
- Release gate: `releaseAudit=true`, `staticReleaseTests=true`, dependency preflight blocked by missing installed `node_modules` in the authoring environment.
- Full server suite: **ATTEMPTED / BLOCKED by authoring-session execution ceiling after 273 observed tests**; no full-suite PASS claimed.

## Release state
B124 is released from the verified static/contract evidence above. Runtime/provider/device validation was not claimed because it was not executed in this authoring environment.

## Next block
**M1450–M1474 / B125**.
