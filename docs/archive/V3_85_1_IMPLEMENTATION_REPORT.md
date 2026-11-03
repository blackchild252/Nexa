# NEXA V3.85.1 — Builder / Operations Validation Layer

## Release identity
- Current release: **3.85.1**
- Baseline: **NEXA V3.84.1 cumulative checkpoint**
- Scope: three additive validation/security layers; no UI rewrite and no destructive migration.

## Issue 52 — Sentry builder-gate connection-state correctness
- The builder gate now treats a non-empty `SENTRY_DSN` as the runtime connection signal.
- `SENTRY_AUTH_TOKEN` alone no longer produces a false Sentry PASS because that token is an operational/CI credential rather than runtime event configuration.
- Existing optional Sentry client/server wiring is unchanged.

## Issue 53 — SQLite backup integrity and schema verification
- Added `verifyBackup(Database, backupPath)` to the existing operational-readiness module.
- Verification opens the backup read-only, runs SQLite `integrity_check`, and confirms the required NEXA schema is present.
- The source database is not modified by verification.
- Existing backup creation behavior remains unchanged, including refusal to overwrite an existing destination.

## Issue 54 — Deterministic preview authorization regression
- Extended the existing preview HTTP smoke harness to verify that the preview buyer receives HTTP 403 from the marketplace admin status boundary.
- The explicit preview admin continues to be checked for successful admin recognition.
- No production credentials or preview fixture behavior were broadened.

## Preserved
- NEXA UI and Royal Dark visual system.
- Five primary destinations: Home, Money, Zeeza, Dream Marketplace, Profile.
- Dami as NEXA's native assistant.
- Existing Zeeza and Dream Marketplace functionality.
- Existing authentication, authorization, Sentry wiring, operational diagnostics, and preview fixture architecture.
- Legacy frontend shell remains recoverable.

## Tests
- **TESTED / PASSED:** server regression suite — **264/264**.
- **TESTED / PASSED:** release audit — `NEXA release audit PASS — 3.85.1`.
- **TESTED / PASSED:** application/static release gate.
- **TESTED / PASSED:** changed JavaScript syntax checks.
- **TESTED / PASSED:** builder pipeline contract and Sentry connection-state contract.
- **TESTED / PASSED:** backup verification contract and preview authorization contract.
- **BLOCKED:** Playwright browser execution — `@playwright/test` is not installed in the sealed environment; dependency installation is unavailable here.
- **BLOCKED:** real Sentry runtime delivery — no real project DSN is supplied in the environment.
- **NOT TESTED:** live payment/provider, device/emulator, production deployment, licensed market data.

## Security / access control
- Sentry CI credentials are not treated as client/runtime credentials.
- Backup verification is read-only.
- Preview admin access remains explicitly role-scoped; buyer access is required to fail with 403.
- No credentials, tokens, private keys, or production secrets were added.

## Architectural decision
ADR-006 was added to record the distinction between runtime observability configuration and CI credentials, validated backups, and role-denial requirements in deterministic preview smoke tests.
