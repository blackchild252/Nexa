# Operational readiness, retention and verification — execution evidence

**Product:** NEXA Main App only
**Roadmap block:** M7691–M7715 (run in B582)
**Method:** source reading plus local tests. The Sentry SDK is replaced by a recording stub, backups are small fixture files and an in-memory SQLite database. No Sentry service, provider, network, device, production database or live server was used.

## Inventory (M7691): what is recorded, who owns it, how it is deleted

| Data | Where | Owner / control | Deletion today |
|---|---|---|---|
| Error and message events | Sentry (server `server/sentry.js`, phone `src/sentry.ts`) | Main, through `SENTRY_DSN` / `EXPO_PUBLIC_SENTRY_DSN`; off when unset | Held by the provider; no deletion call exists in this project. Provider retention is an owner decision. |
| Operational events | `platform_event_log` table (`eventCorrelation.js`) | Main | `purgePlatformEvents` exists in `server/dataRetention.js` (function default 30 days, maximum 365) but nothing calls it: **no scheduled purge runs**. |
| AI request counters | In memory only (`aiObservability.js`) | Main | Gone on restart. |
| Notification events | `notification_events` | The user | `purgeUserNotifications`, on the user's own request. |
| Backups and manifests | `BACKUP_DIR` (`recoveryOps.js`) | Deployment owner | `pruneBackups` (dry run by default, keeps the newest N). |

## What was found and fixed

1. **Raw exception text reached Sentry.** The `unhandledRejection` handler in `server/index.js` sent the original error (message and stack, or `String(reason)`) straight to Sentry. A rejected database call can carry SQL values, emails or tokens. It now goes through `observability.reportException`, which sends only the error type name, the domain and the action. A source test fails if any file other than `sentry.js` and `observability.js` calls the SDK or `captureException` directly.
2. **A bad sample rate was not failing closed.** `SENTRY_TRACES_SAMPLE_RATE=abc` became `NaN`. Now unset means 0.1; anything that is not a plain number from 0 to 1 turns tracing off with a one-line warning.
3. **A bad or half-configured DSN looked enabled.** A DSN that is not an http(s) address now leaves monitoring off (the DSN is never printed). A valid DSN with the SDK missing now reports `enabled: false`; before, it reported `true` while every call did nothing.
4. **Private data in events and breadcrumbs (M7698).** Both the server and the phone app now run a scrubber on every event and breadcrumb: no request body, cookies or query string, no credential headers, only the user id, addresses without `?` or `#`, no body fields in breadcrumbs. The phone helper is `src/telemetryScrub.ts`, a file with no imports.
5. **Request id on the shared scope (M7696).** The request id tag is now set on Sentry's isolation scope (one per request) when the SDK has one, and is cut to 100 characters.
6. **Unbounded event metadata (M7697).** `eventCorrelation.normalizeMetadata` only filtered secret-looking keys at the top level and could throw on a BigInt or a self-referencing object, which would fail the request that was only trying to log. It now drops secret-looking keys at every level (also API-key, private-key, credential, OTP and recovery-proof names), caps depth at 3 and width at 30, converts BigInt and dates, never throws, and still returns `{truncated: true}` over 4096 characters. Event request ids are cut to 100 characters. Monitoring messages are cut to 300 characters with control characters removed.
7. **A future-dated manifest counted as a fresh backup (M7703).** A manifest whose `createdAt` was in the future gave an age of 0 hours, so freshness passed. Such a backup (more than 5 minutes ahead) is now ignored; if it is the only one, freshness fails.
8. **`BACKUP_MAX_AGE_HOURS=Infinity` (or `1e999`) switched freshness off.** A limit that is not a finite number from 0 up to one year now falls back to the 26-hour default. `evaluateBackupFreshness` itself also fails on a non-finite age or limit.
9. **A half-written restore could be left behind (M7704).** `restoreToNewPath` now claims the target exclusively first; if the copy then fails at any point (disk full, corrupt copy), only that file is removed. A target that already exists is still refused and never touched.

## Supported and unsupported backup manifests (M7701, M7702)

Supported: a JSON object with `file` (the backup's own base name, `nexa-YYYYMMDD-HHMMSS.db`), `bytes` (positive whole number, within the size limit), `sha256` (64 lowercase hex characters) and `createdAt` (a date string). `tables` (name to non-negative whole number) and `appVersion` (text, 40 characters at most) are optional, so older manifests without them verify. Unknown extra fields are ignored.
Unsupported, each refused with its own reason: no or malformed checksum (including upper case), size as text or zero, a numeric or unparseable time, a path or a renamed file instead of the base name, negative table counts, unreadable JSON, a manifest that is not an object, and any size or checksum mismatch with the backup file. There is no older format beyond these; nothing is guessed or upgraded.

## Reviewed, not changed

- **Backup directory permissions (M7706).** `mkdirSync` and `VACUUM INTO` use the process's default permissions. The requirement for the deployment: the backup directory and files readable only by the service account and the backup agent (for example mode 0700 and 0600), on storage separate from the live database (the server already refuses a backup inside the live database's own path). Not changed because the right account names depend on the host. Not tested on a real host.
- **Encryption at rest (M7707).** Nothing here encrypts backups, and nothing claims to (a test checks that no backup or readiness file mentions encryption). Pending deployment ownership: disk or volume encryption, or encrypted off-site copies. DEFERRED.
- **Retention (M7708).** No duration was set. The 30-day event default in `dataRetention.js` is a function default, not an approved policy, and it is not scheduled. Needs an accountable owner to decide: operational event days, Sentry retention at the provider, backup count (`pruneBackups` keep), and who runs the purge. DEFERRED, owner decision.
- **Health answers (M7699).** `/health/live`, `/health/ready` and `/health/operational` carry no environment values, paths or user data (tested). `/health/operational` does list the names of missing database tables to anyone; this was left as it is.
- **Admin diagnostics (M7711).** All 27 `/api/admin/...` routes in `server/index.js` sit behind `isConfiguredAdmin` or `adminAccess.require` (tested by scanning the file). Routes defined in other files were not scanned.
- **Production restore (M7705).** No route restores anything; `scripts/recovery-drill.mjs` restores into a throwaway scratch folder only.
- **Preflight (M7709, M7710).** `dependency-preflight` reports missing installed packages as a failed check and exits 2; device and browser acceptance stays out of source-test results.

## How it was proven

- New `server/operationalReadinessRetention.contract.test.js`: 19 tests, in `npm run verify:contract`. With the original `sentry.js`, `eventCorrelation.js`, `recoveryOps.js`, `index.js` and `src/sentry.ts` put back, 11 of the first 17 tests failed; with the changes all pass.
- One earlier contract (`v6_1_66_b513_admin_ai_recovery`, line M7498) pinned the old wording of the restore claim (`COPYFILE_EXCL`, `createdByThisCall`). The guarantee it protects is unchanged (exclusive creation, cleanup of only our own file), so the pin now names the new exclusive claim (`flag: "wx"` and the owned-cleanup catch).
- 192 related existing recovery, observability, readiness, event, retention, checkpoint and release tests still pass.

## NOT TESTED

- The real `@sentry/node` and `@sentry/react-native` SDKs (not installed): that the scrubbers and the isolation scope behave inside the real SDK is checked only against a stub.
- Any Sentry service, a real phone, a production database, a real backup host, file permissions on a real host, `npm run test:server`, `release:gate`, typecheck (`node_modules` absent; the new `.ts` helper parses and runs under Node 22 only), M7527.
