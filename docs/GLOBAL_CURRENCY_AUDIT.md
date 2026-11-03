# Global currency audit — Block 07 complete for local in-app scope

## Verified implementation

- `server/currencyModel.js` is the strict supported-currency registry and minor-unit precision authority.
- `src/currencyDisplay.js` formats only supported source currencies; missing or unsupported currencies render as unavailable.
- Profile & Settings saves a user-owned display-currency preference and optional country hint. The preference is not financial authority and never changes a wallet, order, fee, settlement or ledger currency.
- User currency preferences have authenticated no-store routes, account-portability coverage, and an actual SQLite read/write regression test.
- `server/fxQuoteStore.js` persists only fresh, pair-matched quotes with supported currencies, positive bounded decimal rates, explicit source and timestamp lineage. It does not fetch rates or authorize conversion.
- Wallet transactions and ledger entries retain explicit currency fields. Cross-currency movement is blocked until a fresh matching quote and explicit ledger policy are present.
- Marketplace cart lines require one supported source currency. Price range filtering and price sorting require a selected currency, and the server applies the currency predicate before comparing amounts.
- Main money-facing screens use strict currency formatting; a full source scan found no hard-coded `₦` symbol remaining in `src`.
- Admin Financial Operations recursively formats only Main-supplied amounts/currencies, preserves currency separation, and never calculates FX or mutates financial state.

## Invariants

1. A display preference is not an exchange rate and cannot rewrite transaction currency.
2. Unknown currency metadata never silently becomes NGN.
3. Fees and workflows that are explicitly NGN-only remain labelled and guarded as NGN-only.
4. A quote must match the requested pair, be fresh, have an explicit source, and use a positive rate with at most eight fractional digits.
5. Different currencies are never aggregated into one converted total without a valid quote and an approved ledger policy.
6. Main owns ledger/provider authority; Admin remains read-only for financial execution.

## Verification evidence

- Main `npm run verify:contract`: 562/562 passed.
- Currency preference actual SQLite persistence test: passed.
- FX quote store actual SQLite persistence and freshness test: passed.
- Marketplace currency/filter regression tests: passed.
- Main Devil's Walk: clean; 791 JavaScript syntax checks, 217 TypeScript syntax files, 728 relative imports and 52 route targets.
- Admin full suite: 428/428 passed; Admin source scan confirms no hard-coded naira symbol in `src`.
