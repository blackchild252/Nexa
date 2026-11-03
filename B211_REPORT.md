# NEXA V5.98.63 B211 — Aami-Only Reward Terminology Consolidation

## Objective
Remove the obsolete alternate reward label from active NEXA product/source files so **Aami** is the only internal reward-balance name presented to users, without changing the underlying Aami economy.

## Scope
- SkyMoney Cash remains the real financial balance.
- Aami remains the sole internal reward balance.
- The Aami ledger, reward rules, idempotency, daily caps, claims and redemption authorities were not changed.
- Kitchen cashback-to-Aami migration was not changed.
- Marketplace Aami payment was not changed.
- Subscription Centre remains a SkyMoney sub-block.
- Yaayz and all Aami earning activities remain unchanged.
- Historical B209/B210 release evidence remains frozen and was not rewritten.

## Active files reconciled
- `server/skyMoneyHub.js`
- `src/MoneyDashboard.tsx`
- `src/MarketplaceScreen.tsx`
- `src/Subscription.tsx`
- `PROJECT_MEMORY.json` active SkyMoney architecture state
- `VERSION.md`
- current roadmap metadata

## Validation
- B209 + B210 + B211 focused regression: **75/75 PASS**.
- Full static release suite: **PASS**.
- Release audit: **PASS**.
- Permanent release seal: **PASS**.
- Dependency lock: **PRESENT**.
- Environment/device/live-provider checks: excluded from release certification under the standing authoring-environment limitation.

## Release identity
- Version: V5.98.63
- Batch: B211
- Milestones: M3150–M3174
- Android/iOS build: 6031
- Permanent source fingerprint: `6828936a8685906390f6e3a68a3d0b46702c7157cdb5079d492551916ed11116`

## Completion
CHECK → FIX → TEST → RECHECK → SEAL.
