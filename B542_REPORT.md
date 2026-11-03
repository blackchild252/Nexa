# B542 report — V6.1.96

**Product:** NEXA MAIN only.

**Goal (one):** let a real person obtain the second-factor proof that Central's activation check needs.

**Built:** `server/centralFactorVerify.js` now has both halves.
- `POST /api/zeeza/central-activation/challenge` (signed-in, rate-limited): allowed only for the account named in a pending Admin AAMI grant (`central_privileged_access`), only for itself. Writes a 6-digit code (5 minutes) to that person's own Zeeza secure inbox (`/api/zeeza/local-inbox`). The code is never in the API answer; the inbox preview shows no digits.
- `POST /zeeza/v1/central/verify-factor`: signed, answers only `{ verified }`. Verifies that 6-digit code. Replaces the B541 `<challengeId>.<secret>` proof, which a person could not type.
- Limits: 60 s between requests, 5 per hour, a new code replaces the old one, 5 wrong tries kill the code, a right code is deleted at once and cannot be replayed. Stored as a user-bound hash, not the code.

**TESTED/PASSED:** `server/centralFactorVerify.test.js` 8/8 on real SQLite (Node built-in). One-off end-to-end with Central v1.0.37's real verifier: wrong refused, right verified, replay refused. `npm run walk` CLEAN. Release identity PASS.

**TESTED, one failure not from this change:** `npm run verify:contract` 1219 pass / 1 fail (M1130 checks only that `node_modules` exists; none in this sandbox). The new test file is now in the contract list.

**NOT TESTED:** real HTTP calls, `better-sqlite3`, full `npm run test:server`, live HTTPS, production keys.

**BLOCKED:** no screen yet calls the challenge route, and email 2FA has no provider.

**Next (one goal):** the activation screen step that asks for the code (calls the challenge route, then sends the typed code to Central's `/central/v1/activations` as `factorProof`).
