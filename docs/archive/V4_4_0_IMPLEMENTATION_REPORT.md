# NEXA V4.4.0 — Sky Money Independent Financial Hub

## Scope
Promote Sky Money from a renamed Money destination into a clearer independent financial hub by giving its existing financial/market tools direct navigation surfaces without creating duplicate backends.

## Changes
- Added dedicated Sky Market Watch and Sky Insights views to MoneyDashboard.
- Kept Sky Store Savings and Sky Group Savings in Sky Money.
- Removed market UI duplication from GroupsTab.
- Preserved existing authenticated market APIs and information-only boundaries.
- Updated version metadata and temporary roadmap.

## Validation
- Targeted Sky Money hub contracts: **3/3 PASS**.
- Full server regression: **348/348 PASS**.
- `node --check server/index.js`: **PASS**.
- Release audit: **PASS**.
- Builder gate: **PASS** for application release gate; project memory **PASS**.
- Frontend TypeScript: **BLOCKED** by missing Expo/React dependency tree (`expo/tsconfig.base`, React/React Native types).
- Playwright/device: **BLOCKED** because the configured browser/test dependency tree is not installed.
- Live Sentry: **BLOCKED** because no real DSN is configured.
- Real bank/PSP provider: not claimed; remains external-environment dependent.
