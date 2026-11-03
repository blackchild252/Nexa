# Employment authentication integration checkpoint — NEXA Main

**Current identity:** V6.1.71, B517, Build 6336 (from `npm run release:bump`; do not hand-edit identity).

## Implemented locally
- Every new Admin-role login now creates a fresh six-digit Zeeza code challenge after password verification, stores only a hash for validation, places the short-lived message in the authenticated user's Local inbox, and issues no session until the code is verified.
- Codes expire after five minutes, are challenge-bound and single-use, have bounded attempts, and are removed from the Local inbox after successful Admin login verification.
- Added the signed LORDGISTICS server-to-server login-code receiver. It checks HMAC signature, issuer/audience, timestamp, exact data shape, linked Main user identity, code format and expiry; response never contains the code.
- Added authenticated `GET /api/zeeza/local-inbox`, scoped to the current user, and connected the Zeeza Local inbox UI to it.
- Contract tests cover signed delivery, wrong signature/scope, expiry, identity mismatch, replay/idempotency, owner scoping and fresh Admin login challenges.

## Verification
- `npm run verify:contract`: **1180/1180 TESTED/PASSED** at the last contract run.
- `npm run walk`: **TESTED/PASSED**.
- Cross-app Zeeza local HTTP test: **TESTED/PASSED** against a local Main receiver/database stand-in and the LORDGISTICS sender.
- Full `npm run test:server`: **BLOCKED/FAILED** — 6,031 passed, 55 failed, 46 skipped; the existing full-suite failures include unavailable `better-sqlite3` and unrelated legacy tests. Do not describe the full server suite as passing.
- `npm run typecheck`: **BLOCKED** because the workspace lacks installed Expo/TypeScript base dependencies (`expo/tsconfig.base`).

## Not verified / remaining
- Real Main SQLite runtime and full Main server boot are NOT TESTED in this workspace.
- Email is not used for Zeeza codes; the message is in the local Main inbox. External Main/Admin deployment and live integration are NOT TESTED.
- Existing TOTP/step-up controls for certain privileged security actions remain separate from the new-login Zeeza factor; this checkpoint does not claim they were removed.
- No roadmap milestone IDs were advanced or marked complete; this is a feature checkpoint, not a claim that a 25-milestone roadmap block is complete.
