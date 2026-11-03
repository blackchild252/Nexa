# ADR-016 — Sky Money Reconciliation Continuity

## Decision
Wallet history may expose the existing provider-status and reconciliation actions together, but reconciliation remains a read/controlled state-refresh operation behind the existing authenticated wallet authority.

## Boundaries
- Internal NEXA transfers do not call an external provider.
- Provider reference, amount and currency checks remain server-side.
- The wallet ledger remains the financial record.
- No second payment ledger or client-side settlement authority is introduced.
