# B515 Report — Local Cross-App Activation Verification

**Product:** NEXA Main only  
**Identity:** V6.1.69 B515, build 6334  
**Scope:** Local-only; no external systems, production configuration, or network delivery.  
**Roadmap milestones processed:** 0 assigned / 0 claimed. The current active pointer remains M7516–M7540. The Zeeza activation receiver belongs semantically to the historical M7166–M7190 block, so no milestone was invented or retroactively marked.

## Implementation

- Updated `server/centralActivationCodeDelivery.js` to accept Central's numeric Unix-millisecond `expiresAt` value and ISO-8601 strings, normalizing stored expiry to ISO format.
- Added a regression test in `server/centralActivationCodeDelivery.test.js`.
- Preserved the fail-closed HMAC, identity, event scope, idempotency, and dedicated secure-inbox storage behavior.
- Added local integration evidence using the actual Central sender and Main receiver, including a separate SQLite-engine test.

## Verification

- **TESTED/PASSED:** `npm run session:start` before changes — V6.1.68 B514 build 6333 identity matched.
- **TESTED/PASSED:** focused receiver suite, including numeric expiry regression.
- **TESTED/PASSED:** `npm run verify:contract` — 1168/1168.
- **TESTED/PASSED:** `npm run walk` — CLEAN (JS syntax 891/891, TypeScript syntax 227 files, relative imports 773/773, route targets 56/56).
- **TESTED/PASSED:** Central sender → Main receiver local test and SQLite-engine integration test.
- **TESTED/PASSED:** release identity check after `npm run release:bump` — V6.1.68 B514 / 6333 → V6.1.69 B515 / 6334.
- **BLOCKED:** `npm run test:server` — 6021 passed, 53 failed, 46 skipped. Do not treat this as release-cleared.
- **NOT TESTED:** full server runtime with all native dependencies, live HTTP/HTTPS delivery, deployed shared-secret configuration, browser/device acceptance, native builds, user-visible secure inbox retrieval, and Main-side `verifyFactor`.

## Cross-application findings

1. Central's `expiresAt` type mismatch with Main was fixed and covered by regression tests.
2. AAMI Admin's applicant status/redemption/invitation routes are not implemented by Central at the declared paths. This requires a reviewed server-side adapter and API contract; no browser-side signing secret or unsafe endpoint was introduced.
3. The applicant still lacks an approved retrieval path for the secure inbox message. The existing prohibition on client-facing read/create endpoints remains in force pending architecture reconciliation.
4. Main-side factor verification remains incomplete and is not represented as passed.

## Versioning and release status

The prescribed `npm run release:bump` command advanced all version identity fields to V6.1.69 B515 build 6334. This cumulative project archive is an **unsealed local checkpoint**, not an official release. `npm run release:ship` was not run; no release seal was created. The original uploaded archives remain unchanged.
