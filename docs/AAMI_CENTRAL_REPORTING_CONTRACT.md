# Main → AAMI Central Reporting Contract (M7191–M7215)

## Ownership boundary

NEXA Main validates the authenticated submitter and carries references to Main-owned source records. AAMI Central Web App owns the central report record, reviewer assignment, escalation, reviewer notes, private evidence, and final resolution authority. Main must not create a local copy of Central-owned records.

## Request

`POST /api/central-reports` requires Main authentication and an `Idempotency-Key` header (1–200 characters; CR/LF rejected). JSON fields: `category`, `summary` (1–160 chars), `description` (1–4000 chars), and optional paired `sourceType`/`sourceId`. Supported source types are `order`, `account`, `product`, `zeeza_message`, and `zeeza_room`; IDs must match the safe identifier format. Attachments, reviewer notes, and internal notes are rejected.

Allowed categories are account-role scoped in `server/centralReporting.js`. Unknown account roles fail closed. Idempotency IDs are SHA-256 hashes scoped to the authenticated user; the raw key is not returned.

## Responses and errors

- `400 invalid_report`: invalid fields; response contains field codes, not user-provided text.
- `400 idempotency_key_required`: missing/invalid retry key.
- `503 central_reporting_unavailable`: Central is not connected, `retryable: true`; explicitly says no report was delivered. GET `/api/central-reports/:reportId` returns 503 while Central is unavailable; GET `/api/central-reports` returns 501 until a list contract exists.
- When `AAMI_CENTRAL_REPORT_BASE_URL` and `AAMI_CENTRAL_REPORT_SECRET` are configured, Main signs requests with HMAC-SHA256 over the timestamp and canonical JSON and sends them to Central’s `/central/v1/report-intake` contract. Central source credentials are source-specific. Main maps local categories to the Central taxonomy and sends the user description plus safe source identifiers as details; it never sends source-record contents. Central’s returned report reference is projected to a minimized response. GET `/api/central-reports/:reportId` performs a signed owner-scoped status lookup. The list endpoint returns 501 because Central has no source-scoped list contract yet. Local Main↔Central HTTP integration passed using localhost and test keys; production URLs/keys are not configured.

A future provider response must distinguish `submitted`, `acknowledged`, `in_review`, `waiting`, `resolved`, and `closed`. Only approved replies may be shown to the reporter; reviewer notes/private evidence must never be projected to Main users.

## Retry, privacy, and notification rules

The same user and key produce a stable opaque request ID. Main persists only the opaque request hash, authenticated owner ID, creation time and 90-day expiry in `central_report_idempotency`; report text and Central-owned records are not persisted. After provider configuration, Main reserves before dispatch and retries the same key to Central, whose own content fingerprint enforces idempotency. A lost network response can still leave delivery uncertain; retry the same key. This is not a claim of production exactly-once delivery. No report descriptions, private evidence, raw idempotency keys, or auth secrets should be logged. Report notifications must be redacted and remain distinguishable from Zeeza social messages; the Zeeza Inbox Notifications category now routes to the existing Notification Center. Central-originated event delivery and report-specific notification previews remain unimplemented until Central provides a verified event contract.

## Environment limitation

NEXA is configured for local-only networking. No production Central URL or credential is configured. The adapter is locally tested against a real localhost Central HTTP server with test-only keys; this does not establish deployed or production acceptance. The API fails closed with 503 when the adapter is unconfigured. This is not a claim of production readiness.
