# ADR-012 — NEXA Subscription & Monetization Core

**Status:** Accepted — V3.93.0

## Decision

NEXA subscriptions sit above the existing Wallet financial core. Subscription state is user-scoped and server-authoritative; financial debits continue through the existing append-only Wallet ledger.

## Tier model

- Free: ₦0 membership
- Regular: ₦1,500/month; ₦5,000 monthly activity benchmark
- Premium: ₦2,500/month; ₦8,000 monthly activity benchmark
- VIP: ₦4,000/month; ₦12,000 monthly activity benchmark

The benchmarks are planning targets derived from transparent membership + service usage examples, not promises that a user will be charged exactly that amount.

## Fee model

Service charges are fixed server-side service codes. A module must use an approved code; the client cannot submit an arbitrary fee amount. The user-facing subscription surface displays the current plan's fee catalog.

## Wallet integration

Membership activation and renewal debit the Wallet ledger atomically after checking available derived balance. Auto-pay is explicit. Renewal failure due to insufficient funds changes the subscription to `past_due`; it does not create a negative balance.

## Security

All subscription endpoints use the shared authentication middleware and user ID from the authenticated session. Subscription records, preferences and charges are user-scoped. Idempotency keys prevent duplicate charge records. Account closure removes live subscription state while retaining charge anchors required for financial history.

## Deferred integration

Existing Marketplace, Yaayz, Kitchen, Zeeza, Dami, Ajo and Wallet actions are not automatically charged by this milestone. Each module must first receive an explicit fee-preview UX and a tested call to the shared fee service.
