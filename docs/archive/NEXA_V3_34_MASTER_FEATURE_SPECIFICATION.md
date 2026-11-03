# NEXA V3.34.0 — Production Operations

## Goal
Prepare repeatable, observable, recoverable operations without claiming production approval until the procedures have been executed and evidenced.

## Scope
1. **Deployment readiness:** document required environment variables, supported runtime, startup command, and pre-deployment checks.
2. **Health checks:** define liveness and readiness expectations; readiness must not expose secrets or internal diagnostics.
3. **Logging:** define structured log fields, request/correlation ID propagation, redaction of credentials and personal data, and retention expectations.
4. **Backup and recovery:** document database backup cadence, protected storage, restore steps, and a recovery drill checklist.
5. **Release and rollback:** provide a versioned release checklist, migration review, rollback triggers, and rollback procedure.
6. **Incident response:** define severity, escalation owner, evidence capture, communication, and post-incident review.
7. **Configuration safety:** validate required configuration at startup; never commit real secrets.

## Acceptance criteria
- A deployment checklist and rollback runbook exist and match the actual project structure.
- Health/readiness behavior is verified in a running environment.
- Logs support request tracing and redact sensitive values.
- Backup can be restored in a documented test environment and the result is verified.
- Required configuration is documented with safe examples.
- Typecheck, automated tests, and smoke tests have recorded results.
- No milestone is marked production-ready until all applicable checks pass.

## Dependencies
- V3.31 reliability and error-handling baseline.
- V3.32 security/privacy review.
- V3.33 measured performance baseline.

## Risks
- Environment-specific deployment assumptions.
- Backup files may contain sensitive data and require access controls.
- Rollback may be unsafe after irreversible schema/data changes.

## Validation record
- Code/build/typecheck: NOT RUN.
- Deployment smoke test: NOT RUN.
- Backup/restore drill: NOT RUN.
- Security and production review: NOT RUN.

## Next milestone
V3.35 — User-Controlled AI Memory.
