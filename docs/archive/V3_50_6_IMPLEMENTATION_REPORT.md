# NEXA V3.50.6 — Payment History UI

## Implemented
- Added payment-history search by transaction reference or order ID.
- Added status filters for all, paid, pending, failed, and refunded records.
- Expanded each history card with order ID, transaction reference, date, payment method, amount, payment status, refund IDs/statuses/amounts/reasons, and available dispute status.
- Added explicit empty and no-filter-match states while retaining refresh/loading behavior.

## Validation
- Source-level changes reviewed; no dedicated frontend tests were added.
- TypeScript typecheck and UI/device tests have not been run because the project dependencies/device environment are unavailable in this workspace.
- No live payment-provider transaction was performed.

## Notes
- Displayed fields depend on the data returned by the existing payment-history API. The API currently returns order records with payment references, totals, statuses, and refunds; dispute details may not be included for every record.
