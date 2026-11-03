# B445 — Block 09 Identity Verification

Release identity: V6.0.99 B445 (build 6264).

## Implemented
- Main-owned identity verification case model, country/document type validation and 249-country manual-policy-review references.
- Authenticated case creation/list, appeal, resubmission, expiry/renewal and metadata deletion request paths.
- Permission-gated Main review queue/decision/audit routes with evidence-presence and self-review guards.
- Sanitized readiness reporting, provider result normalization, and append-only case event lineage.
- User-facing Main Identity Verification screen separated from the existing verified-profile/shop mark flow.
- Admin permission-gated read-only queue, status filters and readiness panel.
- Upload/provider webhook fail-closed boundaries; no evidence bytes or document numbers accepted/stored in SQLite.
- Main/Admin independent roadmaps and route documentation updated.

## Verification
- Main focused identity-verification contract: 6/6 PASS.
- Main `npm run verify:contract`: 580/580 PASS.
- Main `npm run walk`: CLEAN — 796/796 JavaScript syntax checks, 220 TypeScript syntax files, 740/740 relative imports, 54/54 route targets.
- Main `npm run godhand -- verify`: BLOCK WALK COMPLETE.
- Main `npm run angels-duty`: 0 blockers, 0 safe-junk items; 5 exact duplicate groups retained for review.
- Admin focused identity-verification tests: 3/3 PASS.
- Admin `npm test`: 437/437 PASS.
- Admin `npm run walk`: CLEAN — 83/83 JavaScript syntax checks, 130 route targets.
- Admin `npm run roadmap:check` and `npm run godhand -- verify`: PASS; 25 unique next-block milestones validated.
- Secure object-storage and identity-provider runtime are not enabled; their routes fail closed by design.
- NOT TESTED: Main full `npm run test:server` to completion, live Main/Admin HTTP runtime acceptance, browser/device runtime, or provider/storage runtime acceptance. Main `npm run typecheck` was attempted and is BLOCKED by missing `expo/tsconfig.base`, missing React Native declarations and the existing TypeScript target/library configuration errors; the new screen is syntax-checked but not typechecked.
