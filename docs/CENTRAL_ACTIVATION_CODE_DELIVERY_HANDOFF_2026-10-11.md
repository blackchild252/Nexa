# NEXA Main — AAMI Central activation-code receiver handoff

**Product:** NEXA Main only  
**Endpoint path:** `POST /zeeza/v1/central/activation-code`  
**Main server setting:** `NEXA_CENTRAL_ZEEZA_KEYS` — JSON map from `keyId` to secret (each secret must be at least 16 characters). Example shape only: `{"central-prod-1":"<shared-secret>"}`. Do not commit real secrets.

AAMI Central's sender must use the same key ID and secret through its own `AAMI_CENTRAL_ZEEZA_KEY_ID` and `AAMI_CENTRAL_ZEEZA_KEY` settings, and set `AAMI_CENTRAL_ZEEZA_URL` to the final HTTPS URL ending in `/zeeza/v1/central/activation-code`.

The receiver validates HMAC-SHA256 over recursively sorted JSON after excluding `keyId` and `signature`; checks the expected v1 event scope and a five-minute timestamp window; accepts Central’s canonical `expiresAt` Unix epoch milliseconds and ISO-8601 strings for compatibility; rejects unknown `data` keys; confirms the applicant ID, normalized username and normalized email against Main's active user record; and uses a durable event ID ledger to avoid duplicate messages. Success and expected refusals return HTTP 200 with the handoff contract's JSON shape. Unexpected persistence failures return HTTP 500 so Central can retry.

The message is stored only in `zeeza_central_secure_inbox`, under the Local category, with a fixed non-secret preview. Expired message rows are deleted by a periodic cleanup and before each delivery request. The separate idempotency ledger stores only `eventId` and delivery time, never the code. No client-facing create/read route was added, as explicitly required.

## Verification

- **TESTED/PASSED:** focused receiver tests, including numeric millisecond expiry interoperability (`node --test server/centralActivationCodeDelivery.test.js`).
- **TESTED/PASSED:** JavaScript syntax checks for `server/centralActivationCodeDelivery.js` and `server/index.js`.
- **NOT TESTED:** live Main server startup against real `better-sqlite3`, production HTTPS URL, deployed secrets, and live Central sender delivery.
- **NOT TESTED / integration boundary:** the existing Local inbox UI does not yet read this new server-only store. No client read endpoint was added because the handoff explicitly forbids one; therefore user-visible code retrieval is not claimed.
- **NOT BUILT:** Central's separate `verifyFactor` Main-side verifier, as explicitly excluded by the handoff.

## Roadmap placement note

The closest semantic roadmap area is the existing **M7166–M7190 — Zeeza Inbox and Zeeza 2FA** block, especially its Local inbox separation, sensitive-content privacy, ownership, idempotency and Central/Admin integration-contract themes. However, the current Main roadmap pointer is already **M7516–M7540 — Backup Storage, Retention and Data Lifecycle**. No milestone ID has been invented or retroactively assigned. Roadmap placement needs an authoritative roadmap reconciliation before this work can be represented as completion of a current milestone.
