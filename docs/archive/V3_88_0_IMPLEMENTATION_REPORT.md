# NEXA V3.88.0 — Money Store Ajo / Marketplace Layaway

## Objective
Add an item-specific Ajo account inside Money so a buyer can contribute toward one Dream Marketplace item and unlock pickup only after the full target is paid.

## Implemented
- Store Ajo account creation from Money.
- Product and current price locked at account creation.
- One unit reserved while the account is saving.
- Zero-interest rule enforced by database constraint and server logic.
- Multiple contributions supported.
- Existing NEXA payment boundary used for each contribution.
- Server verifies payment reference, currency and exact amount.
- Contribution cannot exceed the remaining target.
- Full funding creates a real Marketplace pickup order with the item marked paid.
- Pickup endpoint rejects incomplete Ajo accounts.
- Paid Store Ajo contributions are included in Money payment statistics.
- Existing group Ajo remains unchanged and separate.
- Unpaid Store Ajo reservations can be deleted and inventory is released.
- Account closure releases only still-saving reservations; funded Marketplace orders remain retained for financial/order integrity.

## Validation
- Store Ajo contracts: 4/4 PASS
- Money integration contracts: PASS
- Account lifecycle contracts: PASS
- Full server regression: 280/280 PASS
- Release gate: PASS (environment blockers reported separately)
- JavaScript syntax checks: PASS
- Release audit: PASS
- Live Paystack: not exercised in this environment
- Playwright: environment dependent
- Sentry: real DSN not configured
