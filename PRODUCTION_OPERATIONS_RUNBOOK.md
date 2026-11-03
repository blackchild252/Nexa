# Production Operations Runbook (V3.34)

> Template only. Confirm every command and path against the target environment before execution.

## Before deployment
- [ ] Confirm target version and source revision.
- [ ] Review release notes, configuration changes, and database migrations.
- [ ] Confirm required environment variables are present; never print secret values.
- [ ] Take a verified backup and record its protected location.
- [ ] Confirm monitoring, alert routing, and an accountable operator.
- [ ] Run automated tests and a staging smoke test.

## Deployment
- [ ] Deploy to staging first.
- [ ] Verify startup, readiness, authentication, key user flows, and error logs.
- [ ] Deploy to production using the approved deployment mechanism.
- [ ] Verify readiness and a minimal set of critical user flows.
- [ ] Watch error rate, latency, resource use, and service health.

## Rollback triggers
Consider rollback for sustained elevated errors, failed readiness, data-integrity concerns, severe latency regression, or a critical security/privacy issue.

## Rollback
- [ ] Stop further rollout.
- [ ] Follow the environment-specific rollback procedure.
- [ ] Do not reverse database migrations unless a reviewed recovery plan explicitly permits it.
- [ ] Verify service health and critical flows after rollback.
- [ ] Record incident timeline and decisions.

## Backup and restore drill
- [ ] Create a protected backup.
- [ ] Restore into an isolated test environment.
- [ ] Verify database integrity and representative records.
- [ ] Record recovery time and any data-loss window.
- [ ] Securely remove temporary restored data according to policy.

## Incident review
Record impact, timeline, root cause (when known), remediation, owner, and follow-up actions.

## Backup, verification and restore drill (V5.53.0 / B90)
- Create a verified backup (VACUUM INTO + SHA-256 manifest + self-check): `DB_PATH=/data/nexa.db node scripts/recovery-drill.mjs backup /data/backups`
- Prove a backup restores: `node scripts/recovery-drill.mjs drill /data/backups` restores the newest backup into a scratch file, checks integrity, foreign keys and row counts against its manifest, then deletes the scratch file. Exit code 1 on any failed step.
- Retention: `node scripts/recovery-drill.mjs prune /data/backups 14` is a **dry run**; add `--apply` to delete. Only files named `nexa-YYYYMMDD-HHMMSS.db` and their manifests are ever touched.
- Monitor: with `BACKUP_DIR` set, `GET /api/admin/recovery-status` (admin only) reports database quick-check, size, free pages and backup freshness.
- Restores never overwrite the live database. To recover, stop the server, move the restored copy into place yourself, and start again.
- Run a drill after every release and at least monthly; a backup that has never been restored is untested.

## HTTP hardening (V5.54.0 / B91)
- Rate limiters now use a bounded store (10,000 keys per limiter; expired entries are swept first, then the oldest is evicted). Clients see `RateLimit-Limit`, `RateLimit-Remaining` and `RateLimit-Reset`; a blocked request gets HTTP 429 with `Retry-After`. IPv4-mapped IPv6 addresses are treated as the same client.
- Unknown routes return a JSON 404 with `code: NOT_FOUND` and the request id; the path is never echoed. `X-Powered-By` is removed.
- Server timeouts: keep-alive 65 s, headers 66 s, request 120 s (`REQUEST_TIMEOUT_MS`, never below 66 s). Keep your proxy idle timeout below 65 s.
