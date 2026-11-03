# NEXA V4.69.0 — Vendor Subscription + Payment Patch

## Implemented
- Server-side first-10 `FREE_LAUNCH` allocation with transactional slot records.
- New vendors after the first 10 require verified ₦30,000 NGN `PAID_ENTRY` before activation.
- Every activated vendor receives a 30-day server-controlled subscription period.
- Subsequent verified renewals cost exactly ₦10,000 NGN per 30-day period.
- Pre-expiry renewal extends from the current server `endAt`; post-expiry renewal starts a new 30-day period.
- Duplicate provider verification is idempotent; duplicate pending renewal clicks reuse one pending provider reference.
- Vendor access is blocked for pending/expired subscription states while retained vendor data remains available for renewal.
- Day-25 reminder is scheduled through the existing durable job queue and existing NEXA notification/inbox delivery path with a stable dedupe key.
- Expiry is derived from server timestamps, not device time.
- Vendor subscription/payment history is owner-scoped.
- Existing Paystack integration remains the payment provider authority; client success screens, amounts and dates are not trusted.
- Paystack webhook fulfillment includes vendor subscription activation with existing event idempotency protection.
- Permanent local NEXA logo SVG/PNG assets and non-destructive installer were added; the central `src/brand.ts` source references the local PNG, used by the Dami front-door header.

## QA status
### TESTED/PASSED
- Vendor subscription focused contract tests: **12/12 PASS**.
- First-10 allocation and #11 boundary.
- Existing-vendor free-slot reuse prevention.
- Server-defined payment amount/currency validation.
- Verified paid-entry activation and duplicate verification idempotency.
- Renewal-before-expiry extension.
- Expiry and post-expiry renewal.
- Day-25 reminder timing and deduplication.
- Duplicate renewal request deduplication.
- Owner-scoped subscription history.
- Pending payment cannot activate a vendor.
- Client-controlled pricing/date/active fields are ignored by registration logic.
- Scheduler reminder delivery retry/deduplication.
- Modified JavaScript syntax checks.
- Branding installer idempotency check.
- Local branding assets exist and are referenced from the app source.

### NOT TESTED
- Real Paystack production transaction and webhook delivery against live provider infrastructure.
- Physical-device/browser end-to-end payment return flow.
- Full production scheduler runtime over multiple server restarts.
- Full app build/reinstall visual QA.

### BLOCKED
- None for the focused patch contract suite.

### DEFERRED
- Production payment-provider and real-device validation remain deployment-stage checks.

## Version / roadmap
- Release: **4.69.0**.
- `package.json`, `server/package.json`, `app.json`, and `VERSION.md` synchronized.
- `MASTER_ROADMAP.md`, `PRIORITY_ROADMAP.md`, and `TEMPORARY_ROADMAP.md` updated with the patch.

## Files added/changed
- `server/vendorSubscriptions.js`
- `server/vendorSubscriptionScheduler.js`
- `server/vendorSubscriptionPatch.contract.test.js`
- `server/index.js`
- `server/staff.js`
- `server/accountLifecycle.js`
- `server/marketplaceDiscovery.js`
- `server/marketplaceOrders.js`
- `src/marketplace.ts`
- `src/useMarketplace.ts`
- `src/VendorDashboard.tsx`
- `src/brand.ts`
- `src/NexaAI.tsx`
- `scripts/install-nexa-branding.mjs`
- `branding/NEXA_permanent_logo.svg`
- `branding/NEXA_permanent_logo.png`
- `assets/branding/NEXA_permanent_logo.svg`
- `assets/branding/NEXA_permanent_logo.png`
- `assets/branding/nexa-logo.svg`
- `assets/branding/nexa-logo.png`
- version/roadmap files listed above
