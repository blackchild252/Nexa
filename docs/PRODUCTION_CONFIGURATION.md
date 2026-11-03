# Production configuration and secret readiness — CEO Block 02

NEXA Main keeps provider credentials on the trusted server/deployment secret manager. `server/productionConfig.js` inventories common provider-secret slots, distinguishes missing values from placeholders, validates the production database/public URL/CORS boundary, and emits a readiness summary containing names and counts only. It never returns secret values.

## Owner-supplied secret slots

Payment: `PAYSTACK_SECRET_KEY` (required only when live checkout is explicitly enabled), `FLUTTERWAVE_SECRET_KEY`, `STRIPE_SECRET_KEY`, `WEBHOOK_SECRET`.

AI: `XAI_API_KEY`, `GEMINI_API_KEY`, `GOOGLE_API_KEY`.

Identity/OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OAUTH_CLIENT_SECRET`, `JWT_SECRET`.

Email/SMS/notifications: `SMTP_PASSWORD`, `EMAIL_API_KEY`, `SMS_API_KEY`, `TWILIO_AUTH_TOKEN`.

Storage/evidence: `STORAGE_SECRET_KEY`, `AWS_SECRET_ACCESS_KEY`.

Calls/monitoring/bootstrap: `NEXA_TURN_CREDENTIAL`, `SENTRY_AUTH_TOKEN`, `NEXA_BOOTSTRAP_ADMIN_PASSWORD`.

Admin security: `NEXA_ADMIN_MFA_ENCRYPTION_KEY` (random 32+ character server-only key used to encrypt TOTP seeds at rest; alternatively an approved existing server encryption secret can be used), `NEXA_ADMIN_WEBAUTHN_ORIGIN` (canonical Admin HTTPS origin), and optional `NEXA_ADMIN_WEBAUTHN_RP_ID` (must equal the origin host or a parent domain). `NEXA_PUBLIC_URL` can supply the origin if it is the canonical Admin origin.

These names are readiness inventory, not a claim that every provider adapter is currently wired. Supply values only through the deployment secret manager or an ignored local `.env`; never commit real values. The checked-in `server/.env.example` remains placeholder-only.

## Environment rules

- Development: missing provider credentials are allowed; provider-dependent features must fail closed or report unavailable rather than fabricate live success.
- Staging: use staging credentials and endpoints, with no production secrets reused.
- Production: persistent `DB_PATH`, canonical `PUBLIC_URL` over HTTPS, explicit non-wildcard `CORS_ORIGINS`, and owner-supplied secrets for enabled integrations.
- Admin MFA setup fails closed until a valid server-side encryption key is configured. WebAuthn registration/sign-in fails closed until a canonical origin/RP ID can be validated. Do not store the encryption key in the database, client bundle, Admin static config, reports or checkpoints.
- Diagnostics expose only readiness status and key names. Do not log environment values, authorization headers, webhook bodies containing secrets, or deployment secret-manager output.
- Browser/client configuration may contain public HTTPS URLs only. Secret values never belong in Expo public variables, the Admin static config, client bundles, release reports or checkpoints.

## Integrations to configure when activated

Payments/financial providers and signed webhooks; AI providers; OAuth/identity verification; email/SMS/push notifications; object storage for verification evidence; maps/location; analytics/monitoring; video/TURN; shipping/carrier adapters. Provider-specific signatures must be verified against the raw request body before accepting a webhook event. Provider endpoints must remain behind server-side adapters.


## Block 05 — Sky Money provider readiness

Main owns the wallet ledger and remains the only financial authority. The provider-neutral contract normalizes provider states/errors, validates reference/amount/currency, bounds provider timeouts, permits retries only for read-only operations or explicitly idempotent mutations, and uses stable bounded transaction references. Webhook verification uses the raw request bytes and a server-only signing secret.

`NEXA_WALLET_MODE=sandbox` is simulation-only and is rejected in production. Live mode remains fail-closed until an executable server-side adapter is registered; setting an adapter name or supplying credentials alone does not make money movement ready. The readiness endpoint returns status and missing field names only, never secret values. Provider credentials remain owner-supplied later through the deployment secret manager.


## Global currency and FX readiness — CEO Block 07

Main owns canonical transaction, wallet, fee, settlement and refund currency. The current supported-currency helper validates currency codes, defines minor-unit precision, maps a bounded set of country codes, formats amounts from integer minor units and rejects unknown codes unless a caller explicitly supplies a supported fallback. It is not yet a complete global country/currency dataset, nor is it a product-wide migration.

Cross-currency movement must fail closed unless an approved ledger policy and a matching, fresh provider quote exist. The FX adapter abstraction remains disconnected until a real owner-approved provider is registered. Rates are validated for pair, timestamp freshness and decimal precision; conversion uses integer arithmetic. Do not interpret these helper contracts as live FX, persistent FX-rate storage, settlement integration or permission to execute a transfer. Admin may format Main-supplied currency data only and must not calculate FX, persist rates or mutate financial state.
