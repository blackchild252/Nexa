# NEXA V3.95.0 Implementation Report

## Store Ajo Fee Integration

Extended the existing Store Ajo workflow with the shared NEXA service-fee engine. Contributions now receive a server-authoritative `ajo_contribution` fee preview. The fee is disclosed separately from the locked item price and is settled from the existing NEXA Wallet after successful provider verification. Provider verification and fee settlement are separately tracked so an externally successful contribution can be retried for fee settlement if the wallet is temporarily insufficient.

Group Ajo remains unchanged because it is explicitly a record-only shared ledger and NEXA does not hold or move money in that workflow.

## Validation
- Targeted Store Ajo contracts: pending release gate
- Full server regression: pending release gate
- Playwright/device: environment blocked
- Live Sentry: DSN not configured
- Real bank/PSP: deferred
