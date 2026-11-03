# NEXA V3.50.9 — Development Credentials + Money Market Watch Update

## Scope

This update treats the two requested items before the temporary roadmap:

1. Safe development/preview credentials and provider adapters.
2. Additive market-watch functionality merged into the existing Money block.

## Development credentials

- Root `.env` is populated with clearly-marked development placeholders.
- `PAYMENT_MODE=mock` allows marketplace online checkout preview without real payment credentials or real funds movement.
- `PAYMENTS_ENABLED=true` makes the online-payment UI previewable in development.
- OpenAI remains intentionally unconfigured via the existing `your_key_here` placeholder, so a real OpenAI secret is not fabricated.
- `.env.development.example` and `.env.production.example` document the intended environment split.
- Real provider secrets are expected to be supplied later on the server/deployment environment.

## Money block

The existing Money functionality remains intact:

- Split expenses
- Shared pots
- Ajo / Esusu
- Group membership and ledgers

A new **Market Watch** section is attached to that same Money block. It provides:

- Searchable market/instrument cards
- Current preview price and percentage movement
- Simple chart visualization
- Automatic preview refresh
- Clearly labelled development/mock data

Explicitly excluded:

- Broker accounts
- Trader accounts
- Broker account sign-up
- Portfolio/account linking
- Buying or selling
- Trade execution
- Investment recommendations

## Live-data boundary

The market feed is deliberately a development adapter. Before production, it should be connected to a properly licensed market-data provider. The UI already treats this as information/chart functionality rather than a brokerage feature.

## Code-change policy

Existing code was preserved and the update was implemented by adding configuration/adapter files and attaching the Market Watch component to the existing Money screen. No existing feature was intentionally removed.

## Verification

Server test suite: **17 passed, 0 failed, 0 skipped**.

Server JavaScript syntax checks passed for the modified server files.

Frontend typecheck remains dependent on installing the project's npm dependencies; those dependencies were not bundled into the source ZIP.
