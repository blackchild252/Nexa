# NEXA V5.89.0 / B130 — User-Owned Action Artifact Lifecycle Integrity

B130 closes a post-B129 lifecycle gap around short-lived, user-scoped action artifacts. NEXA service-fee previews were created with expiry/consumption controls but were not retired during account closure or bounded maintenance. AI workflow run receipts already participated in account-closure deletion, but their retention and orphan lifecycle was not bounded by the same maintenance policy as workflow runs.

## Milestones
M1575–M1599: **25/25 IMPLEMENTED / VALIDATED**.

## Repair
- Added `nexa_fee_previews` to the existing user-owned account-closure deletion boundary.
- Added bounded cleanup for expired or consumed fee previews.
- Preserved fee-preview user, service, amount, currency, plan, expiry and consumption checks.
- Preserved existing closure deletion of `ai_workflow_run_receipts`.
- Added bounded workflow-receipt retention aligned with workflow-run retention.
- Added orphaned workflow-receipt cleanup bound to both workflow ID and user ID.
- Preserved canonical service-fee consumption semantics.

## Verification
- Focused B130 contract + maintenance regressions: **30/30 PASS**.
- Cumulative B112–B130 contract tests: **423/423 PASS**.
- JS/MJS/CJS syntax: **460/460 PASS**.
- Release audit: **PASS — V5.89.0**.
- Static release suite: **40/40 PASS**.
- Dependency preflight: **BLOCKED — `node_modules` absent in the authoring environment**.
- Full server suite: **ATTEMPTED / BLOCKED after 151 observed tests passed by the authoring-session timeout**; no full-suite PASS claimed.

## Release
B130 is sealed as `NEXA-V5.89.0-B130.zip`.
Next block: **M1600–M1624 / B131**.
