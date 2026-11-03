# B535 — Env template restored (V6.1.91 B537)

Scope: NEXA Main only. Local/project testing only; no launch activity.

Note: `release:bump` was run twice by mistake, so B535 carries no work and was skipped.

- Release seal and zip step dropped `server/.env.example` because of the `.env.*` secret pattern; that is why it was missing from the upload. Now kept (names only). Real `.env` files stay excluded.

## Fixed
- `server/.env.example` was missing from the V6.1.88 upload. Recreated as a names-only template (no secrets) covering the variables the contracts check (TRUST_PROXY, REQUEST_TIMEOUT_MS, BACKUP_DIR, BACKUP_MAX_AGE_HOURS, NEXA_FEES_WAIVED, PAYMENT_RECONCILE_DISABLED and the rest the server reads).
- README and handoff notes pointed at the old release; aligned to the active release.

## TESTED/PASSED
- Release identity check. Server suite: 6091 pass, 28 fail, 47 skipped (6166 tests). The 7 env-template failures are gone.

## BLOCKED
- 28 remaining failures are payment, wallet, order-ownership and kitchen/yaayz tests that need the `better-sqlite3` native module. `npm ci` fails here (no network; npm crashed), so they could not be run. They are not proven broken or fixed.

## NOT TESTED / excluded
- typecheck (expo base config missing, dependencies incomplete), web build, browser, devices, EAS, stores.
- Admin, LORDGISTICS and AAMI Central: not in the upload, NOT PROCESSED.
