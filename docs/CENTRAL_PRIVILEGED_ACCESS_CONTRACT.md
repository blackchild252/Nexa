# AAMI Central → NEXA Main privileged-access receiver contract

**State:** Local target-side contract and reusable company-scoped guard are tested; Central sender/runtime integration and adoption of the guard by privileged business routes are **NOT VERIFIED**.

## Endpoint and signing

- Method/path: `POST /central/v1/privileged-access/events`.
- Main-only key configuration: `AAMI_CENTRAL_ROLE_GRANT_KEYS`, a JSON object mapping a key ID to a secret of at least 32 characters. Missing or invalid keys fail closed.
- Signature: HMAC-SHA256 over recursively key-sorted JSON, excluding only `keyId` and `signature`; signature comparison is constant-time.
- Envelope is exact-key allowlisted and fixed to issuer `aami-central`, audience `nexa-main-privileged-access`, company `nexa`, product `nexa-main`, version 1, and a five-minute timestamp window.
- Event types: `role.granted`, `role.revoked`, `role.suspended`, `role.restored`. `seq` is a positive, monotonically increasing per-application sequence. `eventId` is unique and its fingerprint prevents same-ID/different-payload replay.

## Target identity and state

- Data keys are exactly `applicationId`, `targetUserId`, `role`, and `reason`. Roles are limited to `administrative_director`, `general_manager`, and `group_director`.
- The target user must already exist in Main, be active, and have a verified email. The receiver never creates an account, password, session, or row in Main's global `admin_users` table.
- The local state ledger records application-bound access state with explicit `companyId=nexa` and `productId=nexa-main`. A role or target-user mismatch conflicts. Revoke/suspend require an active grant; restore requires a revoked/suspended grant; a new grant cannot silently replace an existing record.
- Revocation and suspension revoke all active Main sessions for the affected user because the existing session schema does not bind sessions to a privileged role. This is deliberately conservative.
- `createCentralRoleGuard()` is a reusable, fail-closed middleware for Main-only company/product routes. It requires a signed-in user and an exact NEXA/Main scope, and accepts only `status=active` plus `activationConfirmed=1` for an allowlisted Central role. Pending, suspended, revoked, missing, invalid-scope, or database-error states cannot authorize a request.
- Event ledger and access-state update execute in one database transaction. Raw secrets and activation codes are not accepted or logged.

## Boundaries not yet closed

- Central's event producer/client is not yet wired to this endpoint; production key/URL configuration and separate-process or deployed acceptance are not tested.
- The new table is a target-side grant ledger. The guard is tested in isolation but is not yet wired to the existing company-scoped business routes; those route boundaries must opt into the guard and be tested before claiming privileged access is operational. No global Main administrator role is granted by this receiver.
- AAMI Admin's separate receiver is still incomplete. No cross-product activation is claimed.
