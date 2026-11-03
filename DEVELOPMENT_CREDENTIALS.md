# NEXA Development Credentials / Preview Setup — V3.60.33

Deterministic preview identities are **development-only fixtures**. They are never enabled by normal production startup.

## Enable preview mode

Run the server/database with:

- `NEXA_PREVIEW_MODE=1`
- `NEXA_ADMIN_EMAILS=preview.admin@nexa.local`
- `PAYMENT_MODE=mock`
- `MARKET_DATA_MODE=mock`

Then seed/reset the fixtures with:

`NEXA_PREVIEW_MODE=1 node server/previewFixtures.js`

The fixture script refuses to run without the explicit preview-mode flag.

## Dummy identities

| Role | Email | Password |
|---|---|---|
| Buyer | `preview.buyer@nexa.local` | `NexaPreview!2026Buyer` |
| Vendor | `preview.vendor@nexa.local` | `NexaPreview!2026Vendor` |
| Admin | `preview.admin@nexa.local` | `NexaPreview!2026Admin` |

These credentials are safe placeholders for local development only. **Do not deploy them, reuse them for real accounts, or put provider secrets in client configuration.**

The preview vendor has deterministic fashion products including multiple tops at different prices so Dami/Mall requests such as “Dami, find the cheapest top from the mall” can be tested repeatedly.
