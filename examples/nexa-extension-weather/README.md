# NEXA Weather Helper — Example Extension

This example demonstrates the V3.59 extension contract. It is intentionally a manifest-only example: NEXA does **not** execute arbitrary third-party JavaScript on the server.

## Flow

1. Validate `manifest.json` with `POST /api/extensions/developer/validate`.
2. Register it with `POST /api/extensions`.
3. Ask the user for the requested scopes.
4. Enable the extension only after every requested scope has explicit consent.
5. Call a capability through `/api/extensions/:id/capabilities/<scope>`.

## Security rules

- Request only the scopes the extension actually needs.
- Never put passwords, tokens, API keys, cookies, or private credentials in `publicConfig`.
- Capability responses are scoped to the signed-in user.
- NEXA keeps push/device tokens inside the platform.


V3.59.2 adds a compatibility range and user-owned API identity keys. Runtime requests use `X-NEXA-CLIENT-ID` and `X-NEXA-EXTENSION-KEY`; raw keys are only returned when created or rotated.
