# B441 — Block 07 currency display hardening

Product: NEXA Main App
Roadmap: M6566–M6590 (Block 07 remains IN PROGRESS)

## Implemented
- Added a strict display-only formatter that supports the current Main currency set and requires an explicit supported currency code.
- Migrated the NEXA Membership screen's plan fees, targets, spend/cap display and service-fee labels to use currency metadata returned by Main; removed its hard-coded naira symbol.
- Added regression coverage for supported formatting, missing/unknown currency rejection and Membership source wiring.
- Synchronized the current Block 07 status in Main's MASTER, PRIORITY and TEMPORARY roadmaps and the CEO Global Readiness register.

## Verification
- Focused display/currency/provider/reconciliation contracts are included in Main `npm run verify:contract`: 547/547 PASS. Subscription regression suite: 11/11 PASS. Main Devil’s Walk: clean (785 JS syntax, 217 TS syntax files, 714 relative imports, 52 route targets).
- Broad UI-wide symbol audit, persistent user currency preference, full marketplace/wallet/fee/receipt migration, database-backed FX persistence, live provider FX, full Main typecheck and deployed Main/Admin acceptance remain NOT TESTED.
- No provider credentials, live rates or cross-currency execution were invented or enabled.
