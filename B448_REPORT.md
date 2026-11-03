# B448 — Main Block 12 Report

**Release:** V6.1.2 B448, build 6267  
**Scope:** Marketplace Exception Provenance & Triage  
**Status:** TESTED/PASSED for local persistence, contract and read-only acceptance scope.

## Implemented
- Added a Main-owned SQLite exception case model with required order/category/source/source-ID/actor/summary/evidence lineage and idempotent creation keys.
- Added safe actor-role projections to order timelines. Buyer and seller roles are resolved only through canonical order ownership/item relationships; unknown actors remain `unknown`; raw actor IDs are omitted from the Admin snapshot.
- Added evidence completeness reporting, bounded source/status/category search, deterministic pagination and sorting.
- Added idempotent, expected-version-checked triage transitions. Terminal cases cannot be reopened; request-key reuse across different cases/actions is rejected.
- Added read-only cancellation inventory review flags, orphan order-event/dispute/refund checks, duplicate refund-reference checks and resolved-dispute outcome checks.
- Added permission-gated Main routes for exception listing, creation and triage. These routes change only operational exception metadata and make no provider calls or order/financial mutations.
- Added the Admin read-only exception queue with status/category filters, search, pagination, evidence completeness, actor roles and diagnostic counts.
- Synced Main and Admin roadmaps independently; Block 13 is registered in each app.

## Verification
- Focused Main marketplace Block 10–12 suite: **29/29 PASS**.
- Main `npm run verify:contract`: **594/594 PASS**.
- Main `npm run walk`: CLEAN — 801/801 JS syntax checks, 220 TypeScript syntax files, 740/740 relative imports, 54/54 route targets.
- Main `npm run angels-duty`: 0 blockers; 5 exact duplicate groups are review-only.
- Main `npm run godhand -- verify`: PASS.
- Admin `npm test`: **443/443 PASS**.
- Admin `npm run walk`: CLEAN — 85/85 JS syntax checks, 134 route targets.
- Admin `npm run roadmap:check`: PASS — 25 unique next-block milestones.
- Admin `npm run angels-duty`: 0 safe-junk items and 0 exact-duplicate groups.
- Admin `npm run godhand -- verify`: PASS.

## Deferred / not tested
- **M6699 DEFERRED:** no canonical payout-hold source table exists in the current schema. The UI states that payout-hold lineage is not supplied; no synthetic payout data was created.
- NOT TESTED: live Main–Admin HTTP acceptance, device/browser runtime, completion of the full Main server suite, full Main TypeScript typecheck (previously blocked by missing Expo/React Native config/declarations), and provider execution.
- No external credentials, launch, EAS, store or production deployment work was performed.
