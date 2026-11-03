# Data Lifecycle, Observability and Recovery — B511

## Ownership and lifecycle boundaries

- **Identity, sessions and account state:** Main server database and Main-owned account/session lifecycle services are authoritative. Client caches are not identity authority.
- **Orders, products, checkout and payments:** Main server database and server-side commerce/payment lifecycle services are authoritative. Client totals and display caches do not authorize a financial transition.
- **Audit and operational events:** Main server audit/event tables are the record owner. Operational telemetry is diagnostic and must not become a substitute for durable audit records.
- **External delivery/provider state:** provider acknowledgements are authoritative only after verified provider responses. An unconfigured provider must remain unavailable/degraded, never be reported as operational.
- **Local media uploads:** upload handlers must enforce request/file bounds and MIME/content constraints. Any future private object-storage integration needs explicit access control, deletion propagation and retention policy before it is enabled.

## Retention and account closure

Account closure must follow the existing lifecycle policy and per-category contracts. Financial/audit records may be retained only under the documented legal/business retention requirements; identity links should be removed or anonymized where allowed, and deleted identities must not regain active sessions through stale references. This document does not invent retention periods: legal retention durations must be confirmed by the product/legal owner before they are encoded as hard expiry rules.

## Backup and restore safety

- Backup creation uses an explicit destination, refuses overwrite, and reports file basenames rather than full paths.
- Backup verification validates manifest object shape, basename binding, positive bounded byte count, lowercase SHA-256 format, parseable creation time, optional table-count shape and bounded app-version metadata before checking file size and digest. Invalid manifests fail closed with generic reason codes.
- Exception telemetry uses a generic redacted error rather than forwarding raw exception messages or original stacks; normalized context remains bounded and recursively redacted.
- Restore drills operate on a scratch copy and clean it up; restore-to-path refuses an existing target. The live database is not a valid restore target.
- The recovery drill must be run only against a disposable local backup. Production restore requires explicit owner approval and an operational runbook.

## Operational event privacy

`server/observability.js` now recursively sanitizes operational metadata. Sensitive key names (credentials, tokens, password, contact fields, message/body/content and prompts) are redacted; bearer/provider-like secret strings are redacted; nested objects, strings, arrays and key counts are bounded; control characters are removed from event labels; request IDs accept only a short safe character set. This is a telemetry minimization boundary, not a replacement for authorization or database audit controls.

## Health and readiness

- `/health/live` is process liveness only.
- `/health/ready` checks database availability/integrity and returns a generic not-ready response on failure.
- `/health/operational` exposes bounded dependency state and issues, not environment values or user data. An unconfigured provider must not be described as healthy.

## Verified in B511

- `npm run verify:contract`: 1081 passed, 0 failed, 0 skipped.
- Focused recovery manifest and observability suites: 20 passed, 0 failed.
- `node --test server/v5_53_0_b90_recovery.contract.test.js`: 25 passed, 0 failed; isolated Node SQLite recovery tests passed (Node emitted its documented experimental SQLite warning).
- `npm run walk`: JavaScript syntax 883/883; TypeScript syntax scan 226 files; relative imports 768/768; route targets 56/56; no blocking findings.
- `node scripts/release-audit.mjs`: passed.
- `node scripts/roadmap-check.mjs`: passed; ten sequential blocks and 250 milestone slots M7466–M7715.

## Not tested / parked

Dependency-backed TypeScript typecheck and dependency-backed full runtime server suite are unavailable because `node_modules` is absent. The isolated recovery contract uses Node’s built-in SQLite module; production database restore was not performed. Browser/device acceptance, native Android/iOS builds, live telemetry delivery, provider delivery and external legal-retention approval were not performed. These remain parked rather than being represented as passed.


## B511 execution report

The matching run report is `B511_REPORT.md`. The permanent master roadmap now registers ten forward blocks M7466–M7715; future milestones remain planned, not completed.
