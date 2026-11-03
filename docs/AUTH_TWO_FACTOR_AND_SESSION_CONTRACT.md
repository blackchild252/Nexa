# Identity, Sessions, Zeeza Two-Factor and Recovery Contract

## Local behavior implemented and verified

- Authentication accepts only users whose `accountStatus` is explicitly `active`; suspended, disabled, closed, unknown and missing accounts cannot sign in or receive new sessions.
- Session creation rejects missing/non-active accounts. Middleware rejects sessions for accounts that are no longer active. Session rotation re-reads account state before issuing a replacement token.
- Email verification and password-reset action tokens are issued only for active accounts. Email verification updates only active accounts. Recovery requests keep a generic accepted response for unavailable accounts and do not create tokens for them.
- Local Zeeza two-factor challenges remain bound to account, session and purpose, expire, throttle repeated failures, and are single-use. Factor enrollment/removal requires proof via the injected verifier; client-supplied flags do not replace proof.
- Local recovery proofs are consumed once per account and only their SHA-256 digest is retained by the in-memory contract engine. Reusing a proof is rejected. Removing a factor clears locally verified sessions and emits a local revocation request.
- Password reset/change revokes existing sessions and outstanding action tokens. Security event projections omit sensitive metadata keys; session listing returns safe metadata only.

## Boundaries

The Zeeza two-factor engine is a local-only contract engine: factors, challenges, consumed recovery-proof digests and verified-session state are in memory, not a durable production factor store. Notification and session-revocation callbacks are adapters; no real email, Zeeza delivery or provider acknowledgement is claimed. Durable recovery-code storage, live delivery, browser/device acceptance and independent penetration testing remain NOT TESTED and parked for the appropriate environment/acceptance work.

## Evidence

- `node --test server/identitySessionRecovery.contract.test.js server/authLifecycle.runtime.test.js server/zeezaTwoFactorLocal.test.js`: 10/10 PASS.
- `npm run verify:contract`: 1029/1029 PASS.
- `npm run walk`: CLEAN; JS syntax 874/874, TypeScript syntax scan 226 files, relative imports 768/768, route targets 56/56; typecheck not run because dependencies are absent.
- `node scripts/release-audit.mjs`: PASS.
- `node scripts/roadmap-check.mjs`: PASS; 10 sequential blocks / 250 slots.

## Durable local storage adapter (B507 audit)

`server/zeezaTwoFactorSqlite.js` adds an explicit SQLite-backed state adapter for factor metadata, challenge hashes, throttling state, verified-session markers and consumed recovery-proof digests. It uses a conditional SQLite update to consume challenges once and `INSERT OR IGNORE` to atomically consume recovery proof digests across service instances. It stores destination hashes rather than raw destinations and recovery-proof hashes rather than raw recovery proofs.

This closes the storage-adapter gap at source level, but does **not** mean production 2FA is activated: the adapter is not wired into authenticated sign-in/account-security routes in this checkpoint; a real `better-sqlite3` integration test, deployment migration acceptance, live email/Zeeza delivery and independent security review remain outstanding.
