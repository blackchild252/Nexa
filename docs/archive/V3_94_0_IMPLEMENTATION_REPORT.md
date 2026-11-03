# NEXA V3.94.0 — Wallet Fee Integration

## Scope
V3.94.0 continues V3.93.0 without replacing existing financial architecture. It integrates only Wallet transfer and withdrawal service fees from the existing subscription fee catalog.

## Implemented
- Server fee preview endpoint: `/api/subscription/fee-preview`.
- Server recalculation at execution time.
- Atomic transfer/withdrawal + fee ledger writes.
- Separate idempotency keys for action and fee.
- Sender/withdrawer pays the NEXA fee; transfer recipient receives the requested amount.
- Withdrawal provider receives only the requested withdrawal amount.
- Wallet UI shows service fee, action amount and total debit before confirmation.
- Deposits remain fee-free.

## Security
All operations remain authenticated and user-scoped. Client-provided fee amounts are never trusted. Monthly caps are enforced by the shared subscription engine. Wallet balance is derived from the append-only ledger.

## Validation
- Targeted Wallet/subscription contracts: 15/15 PASS.
- Node syntax: PASS for changed server modules.
- Full server regression: run in release gate.
- Playwright/device: environment-dependent.
- Live Sentry: blocked without real DSN.
- Live bank/PSP: deferred.

## Deferred
Ajo, Dream Marketplace, Yaayz, Kitchen, Zeeza, Dami and Extensions will be integrated individually using the same fee preview → confirmation → server recalculation → atomic ledger pattern.
