# B455 — NEXA Main Block 17 Report

## Scope
- Individual Main roadmap: M6816–M6840, Notifications & Communication.
- Added `server/notificationPolicy.js` for allowlisted categories, priority decisions, channel normalization and boolean-only provider readiness.
- Integrated quiet-hour policy into Main push fan-out after the durable in-app event is written. Non-critical push is suppressed during configured quiet hours; critical priority bypasses quiet hours but never bypasses an explicit push opt-out.
- Added permanent Block 17 contracts to `npm run verify:contract`.

## TESTED/PASSED
- Main contract gate: 640/640.
- Focused notification policy/center/delivery/integrity tests: 45/45.
- Main Devil’s Walk: clean; JavaScript syntax 815/815, TypeScript syntax 220 files, relative imports 740/740, route targets 54/54.
- Release identity: V6.1.9 B455 (build identity enforced by project scripts).

## NOT TESTED
- Complete Main server suite did not finish within the run window.
- Dependency-backed typecheck.
- Deployed Main–Admin HTTP acceptance, browser/device runtime, real push delivery and provider callbacks.

## DEFERRED
- Actual email and SMS delivery: provider credentials and external services are not configured. Readiness remains boolean-only; no credentials were requested or activated.
- External provider and deployed runtime acceptance.

## Boundaries
- Main remains the authority for member notification history and preferences.
- In-app notification history remains available even when push is disabled or suppressed.
- No external actions, EAS, store submission or production deployment performed.
