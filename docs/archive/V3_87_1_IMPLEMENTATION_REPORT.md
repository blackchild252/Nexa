# NEXA V3.87.1 — Leisure Arena / The Kitchen

## Release identity
- Current cumulative release: **V3.87.1**
- Baseline: **V3.86.1 cumulative checkpoint**
- Milestone: **L.A. shell → Kitchen → AI receipt → referral code → 2.5% cashback**

## Implemented
1. **Leisure Arena (L.A.)**
   - Added permanent L.A. destination to primary NEXA navigation.
   - Added Leisure Arena landing screen with The Kitchen entry.
2. **The Kitchen**
   - Added Yam Slices, Fried Egg, Potato Fries, Doughnuts, Burger, Shawarma, Puff Puff, and Egg Roll.
   - Server owns menu prices and order totals.
   - Orders are authenticated and tied to the signed-in user.
3. **Payment**
   - Reused NEXA's existing payment boundary.
   - Server validates payment amount/currency/reference before marking an order paid.
4. **Illustrated AI receipts**
   - Paid Kitchen orders can receive an order-specific illustrated receipt from the existing OpenAI integration.
   - Prompt explicitly requires the exact purchased quantities/items and forbids unrelated food items.
   - Receipt retrieval is authenticated and user-scoped.
5. **Referral**
   - Paid Kitchen customers receive a unique referral code.
   - Deep link format: `nexa://leisure/kitchen/ref/<CODE>`.
   - Self-referrals are rejected server-side.
6. **2.5% cashback**
   - A referred order qualifies only after verified payment.
   - Referred paid order total must be greater than or equal to the original qualifying paid order total.
   - Currency must match.
   - Cashback is `2.5%` and is inserted idempotently with a unique source-order constraint.
   - Cashback balance and ledger are visible through authenticated endpoints.

## Money integration
- Added authenticated `/api/money/summary` aggregation for paid Dream Marketplace orders, paid Yaayz ticket orders, paid Kitchen orders, Kitchen cashback, and Kitchen illustrated receipts.
- Money Dashboard now displays payment totals, cashback, paid-order counts, and illustrated-receipt counts alongside the original expenses/debts/planning/groups functions.
- Payment authorization URLs in Yaayz and Kitchen now open the secure provider page directly from NEXA.

## Integration
- Primary navigation and Home.
- Notification routing.
- Unified search.
- Account lifecycle transactional retention.
- Existing authentication, payment, and AI boundaries.

## Validation
- JavaScript syntax checks: **PASS**.
- Full server regression: **276/276 PASS**.
- Release audit: **PASS**.
- Builder/application release gate: **PASS** with environment blockers recorded below.
- TypeScript / Expo dependency validation: inherited environment limitation unless dependencies are installed.
- Playwright browser validation: inherited environment limitation unless browser binaries are installed.
- Live OpenAI image generation: requires configured provider credentials.
- Live payment: requires configured provider credentials.

## Security
- All Kitchen endpoints require authentication.
- User order and receipt access is scoped to the authenticated user.
- Referral ownership and self-referral rules are enforced server-side.
- Cashback is server-calculated and idempotent.
- Payment fulfillment requires verified provider result matching reference, currency, and amount.
