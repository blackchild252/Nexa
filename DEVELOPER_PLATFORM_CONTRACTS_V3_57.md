# NEXA V3.57.0 — Developer Platform & Internal Contracts

## Purpose

V3.57 establishes a small, dependency-light contract layer so future NEXA integrations can rely on predictable API, authentication, error, webhook/event, and testing conventions instead of recreating them inside individual modules.

## 1. API contract versioning

- Current contract version: **1.0**.
- Responses advertise `X-NEXA-API-Version: 1.0` and `X-NEXA-Contract-Version: 1.0`.
- Additive, backward-compatible changes should remain within the current contract version.
- Breaking changes require a new major contract version and explicit migration documentation.
- The contract registry lives in `server/contracts.js` and is intentionally dependency-light.

## 2. Shared error model

Expected API errors use a stable JSON shape:

```json
{
  "status": 404,
  "error": "Resource not found.",
  "code": "NOT_FOUND",
  "requestId": "request-correlation-id"
}
```

Stable codes currently include:

- `INVALID_REQUEST`
- `AUTHENTICATION_REQUIRED`
- `FORBIDDEN`
- `NOT_FOUND`
- `CONFLICT`
- `RATE_LIMITED`
- `VALIDATION_ERROR`
- `INTERNAL_ERROR`
- `SERVICE_UNAVAILABLE`

Route-specific human-readable messages may vary, but clients should branch on `code` and HTTP status rather than message text.

## 3. Authentication and authorization contract

- Authenticated API routes use the existing NEXA session/Bearer authentication middleware.
- Server-side authorization is authoritative.
- Clients must not select ownership by supplying another user's ID.
- Resource ownership and role/vendor/admin permissions are checked against authenticated server context.
- The authenticated user context exposes only the public user fields needed by application routes.

## 4. Webhook/event contract

NEXA webhook/event envelopes use:

```json
{
  "id": "stable-event-id",
  "type": "domain.event",
  "version": "1.0",
  "occurredAt": "2026-09-25T00:00:00.000Z",
  "data": {}
}
```

Rules:

1. Verify authenticity/signature before processing.
2. Treat `id` as the stable replay/idempotency key.
3. Persist accepted event IDs before executing side effects where the provider flow requires it.
4. Keep `type` stable and use `version` when the event schema changes incompatibly.
5. Never put secrets or credentials into event payloads.

The existing Paystack webhook implementation remains the provider-specific integration; V3.57 defines the internal convention without replacing that provider flow.

## 5. Developer/test conventions

- Pure contract helpers should remain dependency-light so they can be unit tested without a running database or external provider.
- Every contract change should add or update focused unit tests.
- Server syntax checks and the full server test suite remain required regression gates.
- Frontend TypeScript and device validation remain environment-dependent gates and must never be marked passed unless executed.

## 6. Extension boundary for V3.58

V3.58 may build extension registration, permissions, consent, lifecycle, secrets/configuration, and compatibility controls on top of these contracts. V3.57 intentionally does **not** register arbitrary third-party plugins or expose secrets.

## Source of truth

- `server/contracts.js` — machine-readable contract definitions and helpers.
- `server/contracts.test.js` — executable contract tests.
- `DEVELOPER_PLATFORM_CONTRACTS_V3_57.md` — developer-facing contract reference.
