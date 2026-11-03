# NEXA V5.98.61 B209

## Objective
SkyMoney Unified Finance Hub — Cash + Shopping Coins + Subscription Centre.

## Baseline
Implemented cumulatively from sealed V5.98.60 B208. No rebuild. Existing Sky Wallet cash ledger, Aami reward ledger, subscription authority, Dream Marketplace, Yaayz, authentication, privacy, authorization and payment boundaries were preserved.

## Architecture decision
SkyMoney is now the single financial destination. It presents two balances together:
- **SkyMoney Cash** — the real-finance wallet balance and the only balance representing wallet money.
- **Shopping Coins (Aami)** — the internal reward/utility balance earned through NEXA activities.

The two ledgers remain technically separate under the hood. This prevents reward coins from silently becoming cash and protects the real financial ledger while giving the user one financial home.

Subscription Centre is now a **sub-block of SkyMoney**. It manages membership tier, renewal, auto-pay, spending controls, PPV allocation visibility and Aami subscription redemption. The old subscription route remains only as a compatibility bridge and redirects into SkyMoney.

## Implementation
- Added server-authoritative `/api/skymoney/overview`.
- Combined Sky Wallet cash, Aami balance, subscription state, PPV state and vendor-scope information into one authenticated SkyMoney overview.
- Added two-balance SkyMoney UI.
- Added clear cash-versus-reward semantics.
- Added Subscription Centre sub-block under SkyMoney.
- Added canonical SkyMoney subscription navigation.
- Preserved legacy `/subscription` deep links through a compatibility redirect.
- Preserved all existing wallet transaction, withdrawal, transfer and provider boundaries.
- Preserved all existing Aami earning/spending and redemption authorities.
- Preserved Regular, Premium and VIP subscription authorities.
- Preserved Dream Marketplace Aami payment and Yaayz PPV economy.
- Updated current project metadata to V5.98.61 / B209 / build 6029.
- Reconciled historical B208 validation so it remains frozen against B208 evidence rather than successor metadata.
- Registered B209 in the cumulative release gate.

## Roadmap
M3100–M3124 — 25 milestones.

## Certification
- B209 focused contract: **25/25 PASS**.
- B208 + B209 targeted regression: **50/50 PASS**.
- Cumulative static release suite: **1,181/1,181 PASS**.
- JavaScript/MJS/CJS syntax sweep: **566/566 PASS**.
- Store submission preflight: **10/10 PASS**.
- Release audit: **PASS**.
- Release gate: **PASS**.
- Permanent source seal: **PASS**.
- Source files sealed: **1,350**.
- Permanent source fingerprint: `2846a858e0e9dae611a28947aab4b1f78f61dc820f2de0ca7fbd55b809b7f6b6`.
- Android/iOS build: **6029**.

## Runtime limitation
Dependency-backed HTTP runtime, device/EAS and live-provider checks remain environment-dependent because project dependencies are not installed in this authoring workspace. They are not represented as product passes.

## Release identity
Version: V5.98.61
Batch: B209
Milestones: M3100–M3124
Android/iOS build: 6029

## Completion
CHECK → FIX → TEST → RECHECK → SEAL.
