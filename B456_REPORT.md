# B456 — NEXA Main Block 18 Report

## Scope
- Independent Main roadmap: M6841–M6865, Owner Analytics & Business Intelligence. Block 18 local scope is closed; M6866–M6890 Block 19 Growth, Onboarding & Retention is registered next.
- Added a configured-owner-only `/api/admin/owner-analytics` endpoint with bounded 7/30/90-day windows, no-store responses and aggregate-only JSON/CSV reporting.
- Added source-backed signup, order, currency-grouped GMV/refunds, dispute, wallet, failed-payment, Dami workflow/audit, social-post/message/report, Customer Care, staff-work, and admin-audit counts.
- DAU/WAU/MAU are explicitly described as activity proxies from observed transaction/workflow/message/social-post events, not full app-session telemetry. Notification receipt alone does not make a user active.
- Missing canonical sources, retention/churn/conversion, stable segmentation, historical health series and baseline-backed anomaly detection are labelled unavailable/deferred rather than invented or shown as zero.
- Main remains the only data/financial authority; Admin is a separate read-only presentation client. GMV/refund sums remain grouped by source currency; no FX conversion or member-level export.

## TESTED/PASSED
- Focused owner analytics suite: 29/29 tests.
- Main `npm run verify:contract`: 669/669 tests passed after final activity-source refinements; focused owner analytics suite: 29/29 passed.
- Main Devil's Walk: clean; JavaScript syntax 818/818, TypeScript syntax 220 files, relative imports 740/740, route targets 54/54.
- God Hand traversal and verify: BLOCK WALK COMPLETE.
- Angels Duty: 0 safe junk removed; 5 exact-duplicate groups retained for manual review.
- Release identity: V6.1.10 B456 build 6275.

## NOT TESTED / BLOCKED / DEFERRED
- Full Main server suite: attempted but the execution window timed out before final summary; no full-suite pass claimed.
- Dependency-backed typecheck: BLOCKED by missing TypeScript type definitions and missing `expo/tsconfig.base` in the available archive environment.
- Live HTTP authorization/runtime, deployed DB acceptance, browser/device runtime and Main–Admin live integration: NOT TESTED.
- Cohort retention, churn, signup conversion and stable active-user segmentation: DEFERRED until canonical event/segment sources exist.
- Historical system/provider health and anomaly detection: DEFERRED until durable history/baseline sources exist.
- No credentials, external services, EAS, store submission or production deployment performed.
