# Main-side AAMI Central Reporting Contract

**Scope:** local validation plus a signed server-to-server adapter contract. The localhost HTTP integration test passes with test-only keys; no deployed/production connection is claimed.

## Request

`POST /api/central-reports` requires the Main authentication middleware and an `Idempotency-Key` header. The accepted body fields are `category`, `summary`, `description`, optional `sourceType` and `sourceId`, and optional `companyId`, `productId`, and `industryCoinId` identity assertions. Unknown fields are rejected. `attachments`, `centralReviewerNotes`, and `internalNotes` are explicitly unsupported/restricted.

- Eligible roles/categories are defined in `server/centralReporting.js`; unknown roles fail closed.
- Summary is required and bounded to 160 characters. Description is required and bounded to 4,000 characters.
- Serialized JSON payloads are bounded to 16 KiB. Text is NFC-normalized and disallowed control characters are rejected.
- Source references are identifiers only; source objects and authoritative order/account data are not copied.
- Company/product identity assertions, when present, must match NEXA Main (`nexa` / `nexa-main`).
- Idempotency keys are owner-scoped SHA-256 hashes. The raw client key and report body are not persisted or logged.

## Response and retry behavior

A Central receipt is treated as confirmed only when the signed request receives a successful HTTP response containing a valid Central report reference and status. The adapter returns `accepted: true` and `delivered: true` only after that response. A 503 or network/timeout error means receipt is not confirmed; the caller must retry with the same key.

When Central is not configured, the API validates the request and returns a retryable unavailable response without reserving the idempotency key. When configured, it reserves the owner-scoped hash immediately before dispatch. Repeated requests still reach Central with the same opaque request ID so Central can return the same case or reject a changed-content conflict.

## Privacy and ownership

Main does not mirror Central-owned report records or write directly into Central storage. `projectCentralReport` is owner-only, returns an allowlisted projection, omits descriptions/reviewer notes/evidence/notification bodies, and bounds/sanitizes approved replies. Status names are normalized to a closed set. Signed owner-scoped status lookup by report reference is implemented. A Central list endpoint, notification event feed, and report-specific notification previews remain parked until Central defines those contracts.

## Local verification

Run `node --test server/centralReporting.contract.test.js` and `npm run verify:contract`. The local Central HTTP integration script is `../integration/main-central-reporting.local-test.mjs`; it exercises HMAC authentication, report detail/source-reference transfer, idempotent retry and owner-only status. Production keys/HTTPS, deployed services, separate-process acceptance, full server suite, typecheck and browser/device/native acceptance remain NOT TESTED.
