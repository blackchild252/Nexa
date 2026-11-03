# NEXA V3.58.0 — Extension Framework

## Purpose

V3.58 provides a controlled extension boundary for future NEXA integrations. It is intentionally a permission and lifecycle framework first; arbitrary third-party code is not executed inside the NEXA server.

## Extension identity

Each extension registration has a user-owned ID, display name, slug, version, description, requested permission scopes, public configuration, lifecycle status, and timestamps. Slugs are unique per user.

## Permission scopes

- `profile.read` — signed-in user's public profile.
- `money.read` — signed-in user's money summaries/activity.
- `market.read` — informational market-watch data.
- `mall.read` — signed-in user's Mall catalog/order information.
- `chat.read` — conversations explicitly made available to the extension.
- `notifications.send` — request NEXA notification delivery after explicit user action.

Unknown scopes are rejected. Duplicate requested scopes are normalized away.

## Consent

Consent is explicit and per user. An extension can only be enabled when every requested scope has an active consent record. Revoking a scope immediately disables an enabled extension.

## Lifecycle

`registered` → `enabled` ↔ `disabled`; a revoked extension is terminal. Revocation also revokes all active consent records.

## Configuration and secrets

`publicConfig` is for non-secret extension configuration only. The API rejects secret-like property names including API keys, passwords, tokens, private keys, credentials, authorization, and cookies. NEXA server secrets remain server-side and are never returned through extension APIs.

## Auditability

Registration, consent grant/revocation, enable, disable, and final revocation are recorded with extension ID, user ID, action, metadata, and timestamp. Audit reads are owner-scoped.

## Source of truth

- `server/extensions.js` — validation and framework rules.
- `server/index.js` — authenticated API surface.
- `server/db.js` — persistence schema.
- `server/extensions.test.js` — focused executable tests.
- `V3_58_0_IMPLEMENTATION_REPORT.md` — implementation and validation record.

## V3.58 capability adapters

The framework now exposes controlled, user-scoped capability adapters. Read adapters are available only after the extension is enabled and the user has granted the matching requested scope:

- `profile.read` — compact signed-in profile projection.
- `money.read` — expense/debt summaries and recent expenses.
- `market.read` — active Mall catalog projection without vendor secrets.
- `mall.read` — signed-in user's recent orders and line-item status.
- `chat.read` — compact signed-in user's recent messages when the message schema supports owner scoping.
- `notifications.send` — action scope; validates title/body and keeps device push tokens private.

Every capability request re-checks extension ownership, lifecycle status, requested scope and active consent. Extensions never receive NEXA push tokens or server credentials.
