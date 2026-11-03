# NEXA V3.56.0 — Unified Search

## Result

V3.56.0 is implemented at application level and packaged. Existing module-specific search remains intact; this milestone adds an authenticated, permission-aware unified search surface.

## Implemented

- `/api/search` authenticated endpoint with per-user rate limiting.
- Search filters: People, Groups, Marketplace, Money, and AI & user content.
- People search follows the existing username discovery and mutual-block privacy rules; email is never returned.
- Group search returns only groups where the authenticated user is a member.
- Marketplace search returns active NEXA catalog products and vendor names.
- Money search is restricted to the authenticated user's expenses, debts, budgets, and goals.
- AI/content search is restricted to the authenticated user's plans, notes, and knowledge records.
- Result ranking, bounded query/limit handling, and concise previews.
- Mobile Home entry point and unified search UI.

## Safety / privacy

No unified-search query can retrieve another user's private money or AI records. Search previews are generated server-side from already-authorized rows. No email addresses are returned by People search. Search is read-only and cannot execute financial, marketplace, social, or AI actions.

## Validation

- `node --check server/index.js`: PASS
- `node --check server/search.js`: PASS
- Unified Search unit tests: 3/3 PASS
- Full server suite: 32/32 PASS
- Frontend TypeScript: PENDING — dependencies unavailable in the supplied environment
- Device/emulator UI: PENDING
- Earlier live/sandbox payment/refund/E2E payment/dispute validation: PENDING carry-forward

## Versioning

- App/project: V3.56.0 / 3.56.0
- Current build: `NEXA_CURRENT_V3.56.0.zip`
