# NEXA V3.82.1 Implementation Report

## Capability cycle 43–45

### Issue 43 — Authentication/session boundary hardening
- Extension API-key authentication now loads the owner's `accountStatus` and rejects owners that are not active.
- This closes the account-closure race where an already-issued extension identity could otherwise bypass normal session authentication.
- Existing account closure continues to delete extension identities, consents, audits, and sessions; this change also fails closed if a request already holds a stale identity row.

### Issue 44 — Financial state-machine concurrency hardening
- Vendor manual payment confirmation now executes inside a SQLite write transaction.
- The transaction re-reads the authoritative order payment method/reference/status before allowing the mutation.
- Cancelled orders and cancelled lines cannot become paid through a stale seller request.
- The paid-state update is itself conditional, preventing stale writes from overwriting a concurrent paid-state change.
- Push notification is emitted only after the transactional mutation succeeds.

### Issue 45 — Extension capability consent isolation
- `capabilityAvailability()` now requires at least one requested scope to be explicitly granted and still valid.
- Revoked/unknown/ungranted scopes no longer make an extension appear capability-enabled.
- Existing runtime permission gates remain authoritative and continue to evaluate consent on every request.

## Verification
- Full server regression suite: **253/253 passed**.
- V3.82.1 hardening/release contracts: **5/5 passed** as part of the cumulative suite.
- Server/script JavaScript syntax checks: **PASS**.
- Release audit: **PASS** (`NEXA release audit PASS — 3.82.1`).
- Release gate application/static contracts: **PASS**.
- Dependency preflight: **environment blocker** because `package-lock.json` and `node_modules` are unavailable in this environment.
- Expo TypeScript/device/live-provider/production deployment validation remains externally unclaimed.

## Metadata
- Root package version: **3.82.1**
- Server package version: **3.82.1**
- Expo/app version: **3.82.1**
- Roadmap updated with Issues 43–45 and validation boundary.
