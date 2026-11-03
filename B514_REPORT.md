# B514 Report — AAMI Central Activation-Code Receiver

**Product:** NEXA Main only  
**Identity:** V6.1.68 B514, build 6333  
**Roadmap milestones processed:** 0 assigned / 0 claimed. The feature's semantic fit is the older M7166–M7190 Zeeza Inbox and Zeeza 2FA block, but the current active pointer is M7516–M7540. No milestone IDs were invented or retroactively marked.

## Implemented

- Added `POST /zeeza/v1/central/activation-code` as a server-to-server HMAC-SHA256 receiver.
- Added recursive stable JSON canonicalization and constant-time hex signature comparison.
- Added fail-closed `NEXA_CENTRAL_ZEEZA_KEYS` JSON key map configuration.
- Validated event scope, five-minute freshness, data shape and exact allowed data keys.
- Matched applicant ID, normalized username and email against Main's active user record.
- Added durable eventId deduplication; its ledger stores no activation code.
- Stored the code only in the dedicated secure Local inbox message field with a generic preview; added expiry cleanup.
- Added 9 focused receiver tests, wired them into `verify:contract`, and documented the architecture and integration boundary.

## Verification

- **TESTED/PASSED:** focused receiver tests 9/9.
- **TESTED/PASSED:** receiver + existing Zeeza inbox category + local 2FA tests 17/17.
- **TESTED/PASSED:** `npm run verify:contract` — 1167/1167.
- **TESTED/PASSED:** `npm run walk` — CLEAN; JS syntax 891/891, TS syntax 227 files, relative imports 773/773, route targets 56/56.
- **TESTED/PASSED:** `npm run release:identity` and `npm run roadmap:check` — PASS.
- **NOT TESTED / suite not passing:** `npm run test:server` — 6007 passed, 54 failed, 46 skipped. The suite reports two missing-`better-sqlite3` dependency failures and 52 other payment/order/security/legacy failures.
- **NOT TESTED:** real SQLite-backed receiver runtime, Main server startup with complete dependencies, deployed HTTPS URL, production secret configuration, live Central-to-Main acceptance, and user-visible Local inbox reading.
- **NOT BUILT:** Central's separate `verifyFactor` Main-side verifier, as explicitly excluded.

## Blockers and boundaries

- The current Local inbox UI still states that organizational/local messages are not connected. No client read route was added because the handoff expressly forbids client read/create paths. This preserves the stated security boundary but means user-visible code retrieval is not yet verified.
- Roadmap numbering is internally out of sync with the feature's semantic area: M7166–M7190 is the old Zeeza Inbox/2FA block, while the active pointer is M7516–M7540. The active block was not rewritten and no milestone ID was invented.
- The identity was advanced only through the prescribed `npm run release:bump`. No official release was sealed or shipped.
