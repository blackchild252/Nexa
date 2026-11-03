# NEXA V4.18.0 — Five-Milestone Reliability & Commerce Intelligence Batch B2

## Implemented

- Dependency preflight now reports explicit blockers and the clean-builder lockfile/npm-ci procedure is documented.
- Notification preferences are persistent and user-scoped; in-app history remains the source of truth.
- Notification events support optional user-scoped deduplication and Yaayz/Leisure routing categories.
- Notification Center exposes a push-alert control while retaining in-app history.
- Dream Marketplace order lifecycle transitions are centralized as a reusable server contract; existing payment, refund, dispute and stock/idempotency boundaries are preserved.
- Group ledger entries accept a validated request key with a server uniqueness constraint to prevent duplicate writes on retry.
- Market Watch explicitly reports configured-provider failure and never labels synthetic generated history as provider history.
- Account closure and portability include notification preferences.

## Validation

- V4.18 contract tests: PASS (6/6).
- Full server regression: PASS (417/417).
- Release audit: PASS — V4.18.0.
- Frontend dependency installation: BLOCKED (no root package-lock.json/node_modules in the environment).
- Frontend TypeScript: NOT PASSED; environment lacks installed dependencies, and the available compiler also reports pre-existing JSX parse errors outside this batch.
- Playwright: BLOCKED (runner/dependencies unavailable).
- Android runtime: NOT TESTED.
- Real provider/push/Sentry validation: DEFERRED.
