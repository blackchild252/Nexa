# Notifications, inbox and message lifecycle — execution evidence

**Product:** NEXA Main App only
**Identity:** established by `npm run session:start` and `npm run release:bump`
**Roadmap block:** M7591–M7615
**Status:** see the table in `MASTER_ROADMAP.md`. Checked against real SQLite (`node:sqlite`) for the data rules; routes checked at source level. No express, phone, Expo push provider or browser was used.

## What was checked

- Every `/api/notifications*` and `/api/push*` route needs a login (pinned by a test).
- Real SQLite: a user only lists, counts, marks read and marks all read on their own notifications. The action lookup is also owner-scoped.
- Real SQLite: the list limit is capped at 100, and a strange `type` or `before` value does not widen the result.
- Push registration checks the token shape, cuts the platform to 20 characters and refuses a token that belongs to another account.

## What was fixed

- `POST /api/notifications/operations/recover` reset stale "sending" deliveries for every user, not only the caller. It now only touches the caller's own deliveries. The background worker still recovers everyone. New option `{ userId }` on `recoverStaleSending`. A test proved to fail with the old behaviour.

## Found, not fixed (DEFERRED)

- Message sizes passed into `sendPush` by server code, the digest and preference routes, and the push provider settings path were not re-audited.
- The registration answer "already registered to another account" tells a caller that a token exists elsewhere. Left as is.

## NOT TESTED

- A running server, express, real Expo push delivery and receipts, a phone or browser, and the missing push provider configuration path.
- `npm run test:server` still has the 39 failures that were already there on the V6.2.28 upload.
