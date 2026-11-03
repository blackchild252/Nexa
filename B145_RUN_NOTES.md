# B145 work-in-progress notes (on top of V5.98.5 / B144 WIP4)

Not a sealed release: no version bump, no release seal. Tests that need `better-sqlite3` were not run in the build sandbox (no node_modules, no network); run `npm test` and `node scripts/release-audit.mjs` before sealing.

## Run 1 — wallet
- Sandbox wallet deposit/withdrawal refused when NODE_ENV=production (`assertSandboxAllowed`, wallet.js).
- Launch check `pay.wallet-mode` (M658) now FAILS in production unless NEXA_WALLET_MODE=live.
- Wallet router receives `sendPush`; recipient gets "Money received" after a transfer.
- Recipient history reads "Received from <name>"; old rows with a raw id are shown with the name.
- Tests: `server/b145_wallet_run1.contract.test.js`; updated `wallet.test.js`, `v5_52_0_b89_launch_readiness.contract.test.js`.

## Run 2 — calls
- Ringtone for the callee and ringback for the caller (`assets/sounds/*.wav`, expo-av, `src/CallScreen.tsx`).
- 45 s ring timeout -> status `missed`, one "Missed NEXA call" push, 15 s server sweeper, late accept refused (`server/callSignaling.js`).
- Android high-importance `calls` channel registered in `app/index.tsx`; call pushes use it with priority high and ttl 45 (`server/notificationDelivery.js`).
- Group calls now push every other room member (`server/groupCallSignaling.js`).
- Tests: `server/b145_calls_run2.contract.test.js` (behavioural, uses node:sqlite).

## Still open (not done)
- Full-screen incoming-call UI when the app is closed needs a native build (expo-notifications alone cannot show it).
- No withdrawal provider exists, so live-mode withdrawals still can't work.
- CBN licensing for holding stored value: check with a Nigerian fintech lawyer.

## Run 3 — Paystack top-up removed; wallet controlled by a third-party provider
- `/api/wallet/topup/*` and `/api/wallet/topups` are no longer registered (`server/index.js`). `walletTopup.js` stays only so a top-up paid before this change is still credited once (webhook + reconciler).
- `send` now refuses (503) while no wallet provider is connected; deposit/withdraw already refused via the unconnected provider. `GET /api/wallet` returns `providerConnected`.
- Wallet screen: no Paystack flow; shows "coming soon" and disables Add Money / Send / Withdraw until a provider is connected.
- Tests: `server/b145_wallet_provider_control.contract.test.js`; updated `b144_wallet_topup.contract.test.js` and `b144_wallet_topup.http.test.js` (HTTP file needs better-sqlite3, not run in the build sandbox).
- NOT DONE: the third-party provider adapter itself (needs a chosen partner), and what pays NEXA fees/memberships while the wallet is unavailable.

## B144 WIP8 — checkpoint 1 (marketplace polish, on top of WIP7)
Not a sealed release: no version bump, no release seal.
- **Checkout bug fixed:** fee-estimate query lacked the `p` alias, so every Marketplace checkout threw `no such column: p.id` (server/index.js, checkout route). Regression test added.
- **Kitchen check:** the AI-illustrated receipt, unique referral code/link and first-buyer cashback are all still present and wired on every payment path (create, verify route, webhook, B143 reconciler). One gap fixed: the shared link `nexa://leisure/kitchen/ref/<code>` validated the code but then dropped it; it now pre-fills the code on the Kitchen screen.
- **Multiple photos per product:** see ADR-024.
- Tests: `server/b144_wip8_marketplace_gallery.contract.test.js` (11, PASS), `server/v5_21_0_kitchen_block.contract.test.js` (+1, 10 total PASS). Full server suite in this sandbox: 2544 pass / 24 fail; all 24 failures are `Cannot find module 'dotenv'|'better-sqlite3'` (HTTP boot tests need node_modules) — NOT TESTED here.
- NOT TESTED: the new gallery routes over HTTP, and the React Native screens (no device, no tsc in the sandbox). Run `npm install && npm test`, `npx tsc --noEmit` and `node scripts/release-audit.mjs` before sealing.
- Next checkpoints, in order: size/colour variants, delivery-fee estimates, coupons, then vendor-account integration (vendor product form: sale, variants, delivery settings, coupons). Alibaba-style bulk pricing/supplier quotes deliberately left out.

## B144 WIP9 — checkpoint 2 (size/colour variants, one stock helper, on top of WIP8)
Not a sealed release: no version bump, no release seal. The package name moves to WIP9.
- **One stock helper:** `server/productStock.js` now owns every stock change (10 places, not 8: Store Ajo and account closure count too). See ADR-025.
- **Variants:** per-option stock, product total = sum of options, `variantId`/`variantLabel` on order lines, vendor routes `GET`/`PUT /api/mall/vendor/products/:id/variants`.
- **App:** product page size/colour picker, "Choose options" on cards, cart lines per option, option shown on the vendor's order list.
- **Tests:** `server/b144_wip9_variants.contract.test.js` (22, PASS; behavioural against real SQLite via node:sqlite). Updated for the new code location/signature: `storeAjo.test.js`, `v4_18_0_batch.contract.test.js`, `v5_50_0_b87_account_lifecycle.contract.test.js`, `v5_99_0_marketplace_storefront.contract.test.js`; inline-style audit count 178 -> 181 in `v5_21_0_market_block.contract.test.js`. Full server suite in this sandbox: 2566 pass / 24 fail, the same 24 as WIP8 (missing `dotenv`/`better-sqlite3`/`node_modules`, including M1130 which fails identically on the untouched WIP8 zip).
- **Type check:** `src/marketplaceStoreUtils.ts` passes `tsc --strict` on its own; the edited screens were only syntax-checked (no node_modules here), so run the full `npx tsc --noEmit` before sealing.
- **NOT TESTED:** the new variant routes and checkout over HTTP, and the React Native screens on a device.
- **Open:** no vendor-side UI to create options yet (checkpoint 5); Store Ajo does not support products with options.
- Next checkpoints, in order: delivery-fee estimates, coupons, vendor-account integration.

## B146 CP2 — fee waiver (on top of WIP9)
Not a sealed release: no version bump, no release seal.
- **Fixed:** Marketplace checkout no longer needs wallet money in production. All wallet-debited service fees are waived while no wallet money can exist (production without a wallet partner). See ADR-026.
- `server/wallet.js`: `walletCanHoldMoney()`, `serviceFeesWaived()`. `server/subscriptions.js`: `feeMinor()` returns 0 when waived; paid plans give a clear 503 instead of "Insufficient wallet balance"; `/api/subscription` returns `feesWaived`. `src/Subscription.tsx`: one-line notice. `server/.env.example`: `NEXA_FEES_WAIVED`.
- **Tests:** `server/b146_fee_waiver.contract.test.js` (11, PASS; behavioural against real SQLite via node:sqlite in child processes, including a checkout fee path on a database with no wallet tables). Full server suite in this sandbox: 2577 pass / 24 fail, the same 24 as WIP9 (`dotenv` / `better-sqlite3` missing).
- **NOT TESTED:** the checkout route over HTTP and the screens on a device. Screens still print "NEXA service fee: ₦0.00" and some copy says "charged separately from your Sky Wallet" (Yaayz, Marketplace); cosmetic, left alone.
- **Open:** what pays NEXA fees and memberships once a wallet partner is connected is a business decision; waiver turns itself off then (or set `NEXA_FEES_WAIVED=0`).

## B146 CP3 — Store Ajo and size/colour options (on top of CP2)
Not a sealed release: no version bump, no release seal.
- **Premise check:** the server already refused Store Ajo for products with options (`variant_required` -> 409 "comes in sizes or colours, which Store Ajo does not support yet"); nothing needed blocking there. The gap was that the Ajo screen still listed such products, so a buyer could tap one and only then see the error.
- **Fixed:** `src/StoreAjo.tsx` no longer lists products with `hasVariants`.
- **Checked, no change:** the Ajo contribution fee gate only demands wallet money when the fee is above zero, so it already passes under the CP2 waiver.
- **Tests:** `server/b146_store_ajo_variants.contract.test.js` (5, PASS). It calls the real `POST /api/money/ajo/store` handler against a real SQLite database (node:sqlite, fake app): a product with options is refused with 409 and the clear message, no account is created, product and option stock are unchanged; all-sold-out options are refused; a plain product still works (201, one unit reserved, price locked, 0% interest/discount); out-of-stock is refused. Full server suite in this sandbox: 2582 pass / 24 fail, the same 24 as before (`dotenv` / `better-sqlite3` missing).
- **NOT TESTED:** the Ajo screen on a device, and the route over real HTTP.
