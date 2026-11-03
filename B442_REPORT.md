# B442 Report — NEXA Main App

## Product and roadmap
- Product: NEXA Main App only.
- Release: V6.0.96 B442 (build code 6261), bumped and shipped through project tooling.
- Active individual roadmap: M6566–M6590, Block 07 Global Money & Currency — IN PROGRESS.

## Implemented
- Added authenticated `GET /api/currency/preferences` and `PUT /api/currency/preferences` routes with no-store responses, supported-currency validation, optional two-letter country code and an explicit display-only/no-conversion contract.
- Added a user-owned `user_currency_preferences` schema declaration and included the preference in account export/import with explicit validation of supported currency and country code.
- Added a Profile & Settings selector for the supported currency list and optional country hint. The UI explains that the preference does not convert funds and that some financial screens still need migration.
- Added Marketplace cart currency compatibility: missing/unsupported listing currency and mixed-currency carts are rejected before totals/fees are presented. Marketplace amount display no longer silently defaults a missing product/order currency to NGN. Online and Aami payment methods remain explicitly NGN-only.
- Added Admin regression tests for recursive Main-supplied settlement, fee, refund and timeline display, including unsupported currency handling. Admin remains display-only.
- Synchronized Main's individual roadmap summaries and documented authority boundaries in `docs/architecture/CURRENCY_AND_DISPLAY_AUTHORITY.md`.

## TESTED/PASSED
- `npm run verify:contract`: 556/556 passed.
- Currency preference and account portability focused tests: 10/10 passed.
- Marketplace currency compatibility focused tests: 3/3 passed.
- Main Devil's Walk: 788/788 JS syntax checks; 217 TS syntax files; 715/715 relative imports; 52/52 route targets; no blockers.
- Main God Hand/Block Walk verification passed.

## NOT TESTED / BLOCKED
- Real database persistence is NOT TESTED: requiring `server/db.js` is blocked because `better-sqlite3` is not installed in this workspace. Preference tests use a controlled fake DB and source contract checks.
- Profile UI on a real device is NOT TESTED.
- Full Main typecheck is BLOCKED by missing `expo/tsconfig.base`, missing `react-native` type declarations and existing TypeScript library/type errors.
- Full UI-wide currency/NGN audit remains NOT TESTED; Wallet, Money Dashboard, Yaayz, Kitchen and vendor service-fee paths need additional migration.
- Database-backed FX persistence, live FX provider, cross-currency money movement, provider settlement/refund and deployed Main acceptance remain NOT TESTED.

## Safety boundary
No provider credentials were invented. No FX quote provider was registered. No cross-currency movement was enabled. User display preference does not change ledger or transaction currency. Admin has no FX or ledger authority.
