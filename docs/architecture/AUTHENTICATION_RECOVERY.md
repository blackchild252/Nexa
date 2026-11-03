# Authentication recovery and identity lifecycle — Block 03

## Implemented server boundary

- `POST /api/auth/email-verification/request` and `/confirm` issue and consume email-verification tokens.
- `POST /api/auth/password-reset/request` and `/confirm` issue and consume password-reset tokens.
- `POST /api/auth/password/change` requires an authenticated session and the current password.
- `GET /api/auth/security-events` returns the signed-in user's bounded security history.
- Tokens are generated from 256 bits of random entropy. Only SHA-256 token hashes are persisted. Email verification expires after 24 hours; password recovery expires after 30 minutes. Active tokens of the same purpose are invalidated when a new one is issued. Consumption is conditional on the token being unconsumed and unexpired.
- Successful password reset/change revokes all active sessions and consumes remaining action tokens. Password changes require the current password and reject reuse of the current password.
- Recovery endpoints return non-enumerating responses and are guarded by persistent rate limits. Login attempts are recorded with hashed email/IP/user-agent context; repeated failures and changed successful-login context create security events and in-app notifications.

## Delivery adapter

`AUTH_EMAIL_WEBHOOK_URL` optionally points to a server-side email delivery adapter. It receives `{ to, purpose, url }` JSON and may use `AUTH_EMAIL_WEBHOOK_TOKEN` as a bearer credential. `NEXA_PUBLIC_URL` configures the user-facing origin. Without a provider, production does not expose tokens in HTTP responses; a request is accepted generically but actual email delivery is unavailable. For local development only, setting `AUTH_EMAIL_MODE=console` logs a link preview and returns it to the local client. Never enable console mode in production.

## Security and verification limits

The contract tests validate route wiring, token-hash storage, expiry/single-use controls, session revocation, anomaly telemetry, and both client surfaces. They do not substitute for a live database-backed test, real email delivery, deployed HTTPS/deep-link testing, or production rate-limit verification. Existing account login remains compatible; verification requests are available without locking existing users out while delivery configuration is pending.
