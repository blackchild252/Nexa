# B443 Report — NEXA Main App

**Release:** V6.0.97 B443 (build 6262)  
**Roadmap:** M6566–M6590, Block 07 Global Money & Currency — TESTED/PASSED for local in-app scope  
**Next:** M6591–M6615, Block 08 Global Country, Locale & Regionalization — registered, NOT TESTED, not started

## Delivered

- Completed the source audit of money-facing Main screens and removed hard-coded naira symbols from `src`.
- Migrated money display to strict source-currency formatting across Wallet, Money Dashboard, Financial Planning, Marketplace, Dami product cards, Vendor Dashboard, Kitchen, Store Ajo, Yaayz, ticket and Membership surfaces.
- Missing/unsupported currency metadata displays as unavailable instead of silently assuming NGN.
- Marketplace price range filtering and price sorting now require a selected supported currency. The server scopes the query to that currency before comparing price values.
- Display-currency preference remains separate from transaction currency and has actual SQLite persistence coverage.
- Added `fx_rate_quotes` schema and `server/fxQuoteStore.js`. It accepts only supported, pair-matched, fresh quotes with bounded positive rate text, explicit source, and timestamp lineage. It does not fetch rates or enable conversion.
- Preserved Main ledger/provider authority and fail-closed cross-currency movement policy.
- Removed the Admin M7901–M7925 block from Main's master roadmap; Main and Admin roadmap files remain independent.

## TESTED/PASSED

- `npm run verify:contract`: **562/562 passed**.
- Currency preference SQLite read/write test: passed.
- FX quote store SQLite persistence/freshness test: passed.
- Currency display, Marketplace currency compatibility, currency-scoped price filter/sort and Aami currency guard contracts: passed.
- `npm run walk`: CLEAN — 791 JavaScript syntax checks, 217 TypeScript syntax files, 728 relative imports, 52 route targets.
- Full Main source scan: no hard-coded `₦` symbol remains in `src`.
- Roadmaps and release notes synchronized; next 25 Main milestones registered as M6591–M6615.

## Currency safety

The display preference never changes transaction or ledger currency. Amounts preserve their source currency. Cross-currency movement remains blocked unless a fresh matching quote and explicit ledger policy are both present.
