# Currency and display authority

- Main is authoritative for transaction, wallet, order, fee, refund, settlement and ledger currencies.
- `user_currency_preferences.displayCurrency` is a user-selected display preference only. It never changes financial records, triggers conversion, or substitutes for a source currency.
- `countryCode` provides a suggested currency where an explicit country mapping exists; changing country does not overwrite the chosen display currency. Unknown mappings remain unknown.
- Main exposes the authenticated `GET` and `PUT /api/currency/preferences` routes with `Cache-Control: no-store`. Unsupported currency codes and malformed country codes are rejected.
- The preference is user-owned and included in account portability with explicit import validation.
- FX conversion remains unavailable without a registered provider, a fresh matching quote and an approved ledger policy. Admin is display-only and must never quote FX, change balances, execute refunds or mutate the ledger.
- Persistent preference contract tests use a controlled in-memory adapter; live deployed API acceptance and full client settings UI wiring remain NOT TESTED.
