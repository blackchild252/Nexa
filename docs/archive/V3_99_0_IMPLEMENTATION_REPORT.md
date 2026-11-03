# NEXA V3.99.0 Implementation Report — Server-Bound Fee Preview Integrity

## A. Current version
NEXA V3.99.0, built forward from V3.98.0.

## B. Already present
- NEXA Wallet and append-only ledger.
- Shared subscription/service-fee catalog.
- Store Ajo, Dream Marketplace, Yaayz tickets and The Kitchen fee integrations.
- Existing provider verification boundaries.

## C. Changed
- Added `nexa_fee_previews` as the server-owned fee-preview registry.
- Added expiring preview identifiers tied to user, service code, action amount, currency and active plan.
- Added `assertFeePreview()` and made metered `chargeServiceFee()` settlement require a matching preview.
- Preview records are consumed only after successful Wallet fee settlement.
- Wallet transfer/withdrawal, Store Ajo, Marketplace, Yaayz and Kitchen now carry the preview identifier through confirmation/provider-payment lifecycles.
- Added migration fields for `feePreviewId` on Marketplace orders, Yaayz ticket orders, Kitchen orders and Store Ajo contributions.
- Updated client confirmation requests to send the server-issued preview identifier.

## D. Preserved
- Existing fee amounts and subscription tiers.
- Existing provider payment amounts and seller/customer pricing.
- Existing idempotency and retry behavior.
- Existing Royal Dark UI and navigation.
- No new charge codes were invented. Zeeza/Dami/Extension codes remain deferred until a concrete billable action is defined.

## E. Tests
- Full server regression: **329/329 PASS**.
- Static release contracts: **40/40 PASS**.
- Release gate: **PASS**.
- Builder gate: **PASS**.
- Targeted fee-boundary suite: **53/53 PASS**.
- Changed server syntax checks: **PASS**.

## F. Security/access control
- Preview records are scoped to the authenticated user.
- Exact service/action/currency matching prevents replaying a preview for a different operation.
- Expiry prevents stale confirmation.
- Plan changes invalidate the old preview.
- Preview consumption is server-side and occurs only after successful fee settlement.

## G. Untested / blocked
- Expo/TypeScript validation: **BLOCKED**; `tsc --noEmit` reaches the project but the Expo dependency tree is unavailable (`expo/tsconfig.base`, `react`, and `react-native` type packages are missing), with additional pre-existing lib/type errors.
- Playwright/device validation: **BLOCKED** by unavailable installed browser/dependency tree.
- Live Paystack/bank/PSP: **NOT CLAIMED**.
- Live Sentry: **NOT CLAIMED**.

## H. Next
Concrete user-facing definitions for the deferred Zeeza premium action, Dami enhanced action and Extension service codes; then provider-backed Wallet validation when an authorized provider is connected.
