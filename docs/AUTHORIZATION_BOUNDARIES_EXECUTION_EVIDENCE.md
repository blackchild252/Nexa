# Authorization boundaries and input validation — execution evidence

**Product:** NEXA Main App only
**Identity:** established by `npm run session:start` and `npm run release:bump`
**Roadmap block:** M7566–M7590
**Status:** see the table in `MASTER_ROADMAP.md`. Source and contract level only. No live server, device, phone or provider was used.

## What was checked

- Route inventory of `server/index.js`: 313 routes. Every route without a login check (27 of them) is now pinned in `server/authorizationBoundaries.contract.test.js`. A new open route fails that test until a person adds it to the list on purpose. The test was proven to fail when an open route is added.
- The two extension API-key routes only answer for the extension that owns the key. The six staff-link routes all sit behind the login check.
- The public catalogue (`GET /api/mall/products`) bounds search text (100), page size (50), id list (50), id length (80), and rejects bad sort, category, rating, price and currency values. Request bodies are limited to 3 MB.
- The Paystack webhook fails closed: no secret, no body, no signature, wrong signature or changed body are all refused (the real function is run in the test). A repeated event is recorded once (source check).

## What was fixed

- Extension notification routes (`/api/extensions/:id/capabilities/notifications.send` and the extension-runtime one): a bad title or body is now a 400 with its message; any other failure is a 503 with a generic message and nothing internal is sent to the client (before, the raw error text went back with a 503).

## Found, not fixed (DEFERRED)

- About 40 places in `server/index.js` send `e.message` to the client. Most are our own validation messages. Three AI product-moderation routes return it on a 503 and could pass on a provider or network error text. Changing them would hide the useful "image format not supported" hint, so they were left for a decision.
- Object ownership inside the logged-in routes (buyer A cannot read buyer B's order, and so on) was not re-audited here. Those tests are in the server suite, and several of them fail in this environment (see below).

## NOT TESTED

- Anything against a running server, a real SQLite database with these routes, or express itself (server packages are absent here).
- Recursive or deeply nested request bodies.
- Retry and cleanup guarantees beyond the webhook record-once check.
- Phone, browser and provider behaviour.

## Additional focused hardening — V6.2.52 B598

- `cleanReason` now accepts only an actual string. Numbers, booleans, objects, arrays, `null` and `undefined` can no longer be coerced into plausible-looking audit reasons for referral reward decisions or operator credit records.
- The real SQLite contract verifies both decision and credit paths reject those malformed values without creating ledger or audit rows, while a valid string reason still succeeds.
- This is a narrow M7567 input-validation improvement. M7567 remains PARTIAL because the broader logged-in route inventory has not been audited one by one.

## Test results

- `node --test server/authorizationBoundaries.contract.test.js`: 8 pass, 0 fail.
- `CI=true npm run verify:contract`: 1275 pass, 0 fail, 1 skip before the last test was added.
- `npm run test:server`: the same 39 tests fail as on the V6.2.28 upload (wallet, Paystack, webhook and order tests, and old robot-hero tests). Not caused by this run.
