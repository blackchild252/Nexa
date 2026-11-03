# NEXA Architectural Decisions

## ADR-001 — Expo Router remains the active frontend surface
- **Status:** Accepted
- **Decision:** `src/app/` is the active Expo Router architecture.
- **Constraint:** The legacy `app/index.tsx` shell remains recoverable and must not be deleted without explicit approval.

## ADR-002 — Royal Dark is the centralized visual system
- **Status:** Accepted
- **Decision:** Visual primitives live in `src/theme.ts`.
- **Reference:** `assets/design/NEXA_ROYAL_DARK_VISUAL_REFERENCE.png`.
- **Constraint:** Prefer theme tokens over ad-hoc colors, spacing, radius, and elevation values.

## ADR-003 — Five primary navigation destinations
- **Status:** Accepted
- **Decision:** Primary tabs are Home, Money, Zeeza, Dream/Marketplace, and Profile.
- **Constraint:** Chat and Dami remain reachable as routes and are not deleted merely to simplify the tab bar.

## ADR-004 — Builder pipeline is additive infrastructure
- **Status:** Accepted
- **Decision:** Planner, project memory, coding-agent rules, browser QA, runtime monitoring, review, release gate, and seal contracts are layered around the application rather than embedded into unrelated product modules.
- **Constraint:** Infrastructure must not require rewrites of functioning application code.

## ADR-005 — External validation is evidence-based
- **Status:** Accepted
- **Decision:** Playwright, Sentry, device, provider, and production checks are reported as PASS, FAIL, or BLOCKED/NOT CONFIGURED.
- **Constraint:** No external validation may be represented as complete without evidence.

## ADR-006 — Runtime validation must distinguish configuration from connectivity
- **Status:** Accepted
- **Decision:** Sentry is considered runtime-connected only when a DSN is present; an auth token used for CI/source-map operations must not be treated as proof of runtime event delivery.
- **Decision:** Operational backups must be verifiable for SQLite integrity and required schema before being treated as a validated backup artifact.
- **Decision:** Deterministic preview identities remain development-only, and preview smoke must include representative authorization-denial checks alongside successful-role checks.
- **Constraint:** These safeguards remain additive and must not alter production UI or existing product flows.


## ADR-007 — AI Chat + Yaayz as permanent NEXA product surfaces
**Status:** Accepted — V3.86.1

### Decision
NEXA will not expose a separate generic Chat destination in the primary shell. Dami is the NEXA AI Chat surface; Zeeza remains the social communication surface for friends and rooms. Existing chat services remain where required by Zeeza and are not duplicated.

Yaayz is a permanent NEXA destination owned by the platform shell. Its first-level product choices are exactly **Adverts** and **Tickets**. Ticketing uses the existing server-side payment provider boundary rather than introducing a second payment system.

### Consequences
- The primary shell now has six destinations: Home, Money, Zeeza, Dream Marketplace, Yaayz, Profile.
- Dami remains a hidden route opened from Home/AI Chat rather than consuming another primary tab.
- Zeeza direct messages and rooms remain intact.
- Ticket inventory, reservations, payment verification, and ticket-code issuance are server-side and authenticated.
- Yaayz can grow into advertiser tooling and broader ticket providers without creating a parallel app shell.


## ADR-008 — V3.87.1 Leisure Arena / Kitchen
**Status:** Accepted — V3.87.1

- L.A. is a native NEXA destination, not a separate application shell.
- Kitchen orders reuse the existing authentication and payment boundaries.
- AI receipts are generated server-side and stored as private order media; mobile clients retrieve them through authenticated, user-scoped endpoints.
- Kitchen referral codes are unique server-owned identities.
- Referral qualification and 2.5% cashback are calculated and recorded server-side; cashback insertion is idempotent by source order.
- Money withdrawal/spending is not implicitly enabled by the cashback ledger; a future Money integration must use the existing Money authorization and ledger boundaries.


## ADR-009 — V3.88.0 Money Store Ajo
**Status:** Accepted — V3.88.0

Store Ajo is an item-specific zero-interest layaway capability inside Money. It reuses Dream Marketplace catalog/order and NEXA payment infrastructure instead of creating a parallel store or wallet. The item price is snapshotted at account creation and one unit is reserved. Contributions are server-verified payment records. A real Marketplace pickup order is created only when contributions reach 100%; pickup is rejected before then. Existing rotating-group Ajo remains a separate capability.


## ADR-010 — V3.89.0 Money Market Insights
**Status:** Accepted — V3.89.0
Money Market Insights remains information-only: no broker account, order execution, custody, transfers, or personalized trade instruction.


## ADR-011 — V3.90.0 Money Intelligence / Research Matches
**Status:** Accepted — V3.90.0

Market Insights may use the authenticated user's own NEXA expense categories to explain why a market theme or candidate was surfaced. This context is informational and transparent; it does not use external bank/broker holdings, does not create trades, and does not grant NEXA custody or transfer capabilities. The existing Money intelligence module remains the source for spending statistics.


## ADR-012 — V3.91.0 Market Data Intelligence
**Status:** Accepted — V3.91.0

Market Watch and Market Insights may expose provider/source timestamps, historical trend statistics, gainers/losers, and optional FX/gold adapters. Provider credentials remain server-side and are never returned to clients. User market preferences are authenticated, user-scoped, portable, and deleted during account closure. Historical preview series are explicitly labeled as preview data until an appropriately licensed historical feed is configured.


## ADR-013 — Zeeza Chase Reach is subscription-gated server-side
**Status:** Accepted — V4.14.0

- The user-facing Zeeza discovery surface is called **Chase**.
- Chase Reach is a transparent subscription feature, not a hidden fee. Free is limited to nearby discovery; Regular expands to country; Premium enables global discovery; VIP receives expanded global limits.
- The server derives the authenticated user's active plan before returning Chase candidates or accepting a Chase stranger request. Client visibility is not a security boundary.
- Exact addresses and GPS remain out of scope. Approximate self-entered location is used only for coarse ordering and safety limits, with a 72-hour change cooldown after an established location is changed.
- Chase UX is framed around friendship, shared interests and meeting people; a discoverable profile is not treated as consent to conversation, dating, or any response.


## ADR-013 — Cross-Module Navigation Continuity
**Status:** Accepted — V4.93.0

NEXA uses `src/nexaNavigation.ts` as the canonical client-side destination resolver for Dami, Notifications, Unified Search and future cross-module entry points. Navigation only resolves destinations; existing server authorities continue to own authorization and consequential mutations.

## ADR-021 — Global Navigation Keys
_Renumbered from ADR-016 in B144 to resolve a number collision. `docs/ADR-016-SKY-MONEY-RECONCILIATION-CONTINUITY.md` keeps ADR-016._

**Status:** Accepted — V5.19.0

Every inner screen shows one bar (Back · Search · Home · Menu) supplied by `NexaNavProvider` in the root layout. Home, Dami, calls and auth hide it. Back falls back to Home when there is no history. Destinations still come only from `src/nexaNavigation.ts`; the bar authorizes nothing.

## ADR-017 — Dual interface (Royal Dark + Earth Light) via a live theme
**Status:** Accepted — V5.21.0

`theme` (src/theme.ts) is a live view of the active interface; `src/themeMode.ts` holds the mode (pure, no React Native). Screens keep using `theme.*` and `s.*`, so no screen is rewritten. Module-level style sheets are built once per mode through `themedStyles()` and resolved lazily; leftover hard-coded dark literals are mapped for Earth Light by `tc()` / `mapColorForMode()`. Switching re-keys the navigation tree (`ThemedShell` in `_layout.tsx`) and restores the current route. The choice is a device display preference stored with expo-secure-store; it never touches account, money or authorization boundaries. New code must use theme tokens or `tc()`, never a raw dark hex.

## ADR-018 — Two designs, not two colour sets (design profiles)
**Status:** Accepted — V5.21.0 (B57 checkpoint 3)

Each interface has a design profile (`src/themeDesign.ts`): shape, type weight, frame, shadow, icon look and motion feel. Royal Dark is the identity profile and cannot drift. Earth Light's profile is applied to every style sheet built with `themedStyles()` after colours are mapped, so it reaches the whole app without rewriting screens. Layout and navigation are deliberately the same in both (owner decision: looks only). Style sheets are built from base tokens and then designed, so tokens are never scaled twice; inline styles use `ds()` and icons use `di()`. Per-block scenes and inline-style conversion continue one block per checkpoint.


## ADR-019 — Historical release tests assert "at least", not "exactly"
**Status:** Accepted — V5.22.0 (B58 documentation reconciliation)

Batch tests from earlier releases pinned the exact version they shipped (for example `5.8.0`), so every later release turned them red. They now use `server/versionAtLeast.js` and assert that the package, app and `VERSION.md` versions are at least the version the batch introduced. Historical facts (roadmap headings, per-release reports) are asserted against the roadmap or the release report, not the always-current `VERSION.md`. Tests that pointed at moved code now read the current file: Chase filters in `ZeezaChase.tsx`, DM threads in `zeezaMessaging.js`.

## ADR-020 — Admin Disputes route
**Status:** Accepted — V5.22.0 (B58 documentation reconciliation)

`/marketplace/disputes` renders `AdminDisputesScreen`. The only entry is the existing admin-only "Admin disputes" button in Dream Marketplace (`onAdmin`), and the route re-checks `/api/mall/admin/status` so a deep link shows "Administrator access required" to non-admins. Authorization stays server-side (`requireMallAdmin`); the screen grants no new access.

## ADR — B89 production launch-readiness guard (V5.52.0)
- **Decision:** production configuration is evaluated by a pure module (`server/launchReadiness.js`) with 25 checks (M650–M674) returning pass / warn / fail / skip. It never reads secrets into its output and never touches the network.
- **Enforcement:** always logged at startup in production; blocks startup only when `NODE_ENV=production` and `NEXA_STRICT_LAUNCH=1` and at least one check fails. Default behaviour is unchanged, so existing deployments do not break on upgrade.
- **Exposure:** `/api/admin/launch-readiness`, behind `auth.authMiddleware` and `isConfiguredAdmin`. Authorization stays server-side.
- **Not covered:** external services (Paystack, OpenAI, Sentry, TURN) are checked for configuration shape only, never for live reachability.

## ADR — B90 backup integrity and recovery drills (V5.53.0)
- **Decision:** backups are created with `VACUUM INTO`, immediately checksummed (SHA-256) into a manifest holding only table names and row counts, and self-verified. `server/recoveryOps.js` works with both better-sqlite3 and `node:sqlite`.
- **Safety:** restore only ever writes to a NEW path; the live database is never modified. Pruning is dry-run by default and matches only our own file-name pattern.
- **Exposure:** `/api/admin/recovery-status` (auth + `isConfiguredAdmin`) returns base names and counts only, never filesystem paths.
- **Not covered:** off-host/off-site copy, encryption at rest and scheduling are deployment concerns and remain the operator's responsibility.

## ADR — B91 abuse resistance and HTTP surface hardening (V5.54.0)
- **Decision:** the inline in-memory rate limiter moved to `server/rateLimiter.js` with the same options and 429 contract, plus a bounded key store, key normalisation, failure-safe keys and RateLimit-* headers. `server/httpSurface.js` adds a JSON 404, disables `X-Powered-By` and sets explicit server timeouts.
- **Trade-off:** when the store is full of live keys the oldest is evicted, which can briefly reset an old client's counter under a flood of unique keys; this is preferred to unbounded memory growth. Limits remain per process; a multi-instance deployment needs a shared store.
- **Unchanged:** all existing limiter call sites, error envelope, auth and payment boundaries.

## V5.76.0 / B117 — Managed transient audio-upload lifecycle
The `/api/transcribe` upload path now uses a dedicated managed scratch directory instead of the host-wide temporary directory. The lifecycle manager bounds individual and aggregate storage, reserves capacity before streaming, creates files with exclusive/private permissions, tracks active files, removes failed uploads at the global request-error boundary, performs startup and periodic stale-file cleanup, and confines deletion to generated NEXA audio names inside the managed root. This remains transient storage: transcription behavior and the existing server-side authorization boundary are unchanged.


## V5.77.0 / B118 — Account closure and post-closure isolation
Account closure now uses an explicit delete-vs-retain contract. Personal workspaces, AI action state, savings automation, credentials/sessions, direct messaging and closed-user room messages are removed. Financial transaction history that must remain for integrity is retained, but wallet accounts are closed and wallet free-text history is redacted. Closure is blocked when a wallet has a non-zero balance, a wallet transaction is pending, or a Store Ajo payment remains settled but unresolved. Owned chat rooms and shared money groups transfer to an active member where possible; otherwise the group/room is closed or removed without orphaning ledger references. Persistent rate-limit state keyed by the user is purged during closure.

## ADR-022 — Wallet top-up through Paystack (in-app funds only)
**Status:** Accepted — B144

- **Decision:** a user can fund their NEXA Wallet through Paystack. `POST /api/wallet/topup/initialize` creates a pending `wallet_topups` row and a Paystack checkout. The ledger is credited only after Paystack confirms the payment, and only once.
- **Confirmation paths:** the Paystack webhook (`charge.success`), `POST /api/wallet/topup/verify` (owner only), and `POST /api/wallet/topup/recheck` (re-checks the caller's own pending top-ups, used when the wallet screen opens). All three go through `settleTopup`, which checks reference, currency and amount with `payments.matchesExpectedPayment` and uses a guarded `pending -> completed` update plus a unique idempotency key (`topup:<reference>`), so retries and races cannot double-credit.
- **In-app only:** Paystack-funded money cannot be withdrawn. Withdrawable balance is `balance - min(balance, total completed top-ups)`; money is treated as spent first. Wallet-to-wallet sends are still allowed (they are in-app use).
- **Decided (B144):** the restriction travels with transfers. The in-app-only part of a send (spent first, after the fee) is recorded as `inAppOnlyMinor` on both wallet transactions, so a friend who receives Paystack-funded money cannot withdraw it either. Restricted balance is `min(balance, topups + restricted received - restricted sent)`; when restricted and unrestricted money are mixed this errs on the side of restricting.
- **Unchanged:** the sandbox wallet provider, withdrawals, service-fee previews, Kitchen/Yaayz/Mall payment flows and the webhook's other branches.

## ADR-023 — Dream Marketplace storefront redesign (Temu-style discovery on Walmart-style structure)
**Status:** Implemented — pending release sealing (no version bump yet)

- **Decision:** the customer storefront now behaves like a full marketplace. Home shows hero banners, shop-by-department tiles, flash deals with live countdowns, best sellers, top rated, new arrivals and an endless "Just for you" feed. Search/category views get sort + filter (price range, deals, 4★ and up, in stock), saved items (heart), a full product page (price + savings, rating, sold count, seller rating, quantity, reviews, ask-seller, report, more from this shop) and a cart grouped by seller with remove and stock-capped quantities.
- **Server (additive only):** `GET /api/mall/products` gained `onSale`, `inStock`, `minRating` and `ids` filters (all `WHERE` clauses, so cursor pagination is unchanged); products now carry `soldCount` (cancelled and refunded lines excluded); new `GET /api/mall/storefront` returns server-ranked `deals`, `bestSellers`, `topRated`, `newArrivals` using the same `toClientProduct` shape and the same public-visibility rules (active product, active seller). Index `idx_mallorderitems_product` supports `soldCount`.
- **Authority unchanged:** prices, fees, stock checks, checkout, payment verification, refunds and disputes are still decided by the existing server routes. The client only presents data; "Buy now" adds to the cart and opens the existing checkout. Hero banners are generated from real catalogue data so a banner never links to an empty page.
- **Code layout:** `MarketplaceScreen.tsx` stays the orchestrator (cart, checkout, orders, refunds, disputes untouched); new presentation components live in `MarketplaceStorefront.tsx`; pure helpers (discount %, sold label, countdown, grid columns, cart grouping, banner builder) live in `marketplaceStoreUtils.ts` and are unit-tested in Node.
- **Not included (needs schema/product decisions):** bulk/tiered pricing and supplier quotes (Alibaba-style), multiple images per product, product variants (size/colour), coupons, and delivery-fee estimates.
- **Update (B144 WIP8):** multiple images per product is now implemented, see ADR-024. Still open: variants, coupons, delivery-fee estimates (being done next, in that order), and Alibaba-style bulk pricing/supplier quotes (deliberately deferred).
- **Update (B144 WIP9):** size/colour variants with per-variant stock are now implemented, see ADR-025. Still open: delivery-fee estimates, coupons (next, in that order), the vendor-side variant editor (vendor-account checkpoint), and Alibaba-style bulk pricing/supplier quotes (deferred).

## ADR-024 — Product photo gallery (B144 WIP8)
**Status:** Implemented — pending release sealing (no version bump yet)

- **Decision:** a product keeps its cover photo in `mall_products.imageUrl` (unchanged, so every existing reader keeps working). Up to 5 extra photos (6 total) live in the new `mall_product_images(productId, position, imageData)` table.
- **API (additive):** `POST /api/mall/vendor/products/:id/images` (one photo per request, so a phone never pushes several photos in one body and the 3 MB JSON limit is untouched), `DELETE .../images/:n`, `POST .../images/:n/cover` (swap with the cover), public `GET /api/mall/products/:id/images/:n` (same visibility rules as the cover photo). All vendor routes use `requireVendorAccess` (staff-aware) and check the product belongs to the caller's shop.
- **Response shape:** products gain `imageUrls` (cover first, then extras, cache-busted by `imageRev`) **only when extras exist**; single-photo products keep the exact shape they had.
- **Client:** `ProductGallery.tsx` (swipeable, position badge) on the product page; `VendorPhotos.tsx` (add / make cover / remove) on each vendor product card.
- **Bug fixed in the same checkpoint:** the checkout fee-estimate query selected `PRODUCT_COLS` (which references the `p` alias) from `mall_products` without defining `p`, so SQLite threw "no such column: p.id" and every Marketplace checkout failed before an order was created. Fixed by aliasing the table; regression test asserts every `PRODUCT_COLS` query defines `p`.

## ADR-025 — Size / colour variants and one stock helper (B144 WIP9)
**Status:** Implemented — pending release sealing (no version bump yet)

- **Decision:** a product may have size and/or colour options, each with its own stock, in `mall_product_variants(id, productId, size, colour, stock, position)`, unique per (product, size, colour). `mall_products.stock` stays and **equals the sum of the options** whenever a product has any, so every existing reader (in-stock filter, sold-out flag, low-stock warning, vendor stats, storefront ranking, watch alerts) is unchanged. Order lines gain `variantId` and `variantLabel` (a snapshot, so the order still reads correctly after the vendor edits the options). No variant price: all options share the product price.
- **One helper:** `server/productStock.js` is the only code that changes stock. `reserve()` takes units with guarded updates (`stock >= qty`) on the option and the product and refuses with a code (`unavailable`, `variant_required`, `variant_unknown`, `insufficient`); `release()` puts units back. Both run inside the caller's transaction. Call sites moved onto it: Marketplace checkout, checkout rollback after a failed payment start, buyer cancel (two routes), vendor cancel, the legacy `/api/marketplace/orders` create and cancel/reject, Store Ajo reserve and delete, and account closure. A test fails if raw stock arithmetic appears anywhere else.
- **Rules worth knowing:** release never restocks an option the vendor has since removed, and never restocks a pre-variant order line on a product that later gained variants (either would break total = sum of options). Store Ajo refuses products that need a choice. While a product has options, the vendor edit form's single stock number is ignored.
- **API (additive):** `GET`/`PUT /api/mall/vendor/products/:id/variants` (PUT replaces the whole list; an option whose size+colour is unchanged keeps its id, so carts and orders stay valid; max 60 options, 30 characters per label, stock 0–100,000). Lists return `hasVariants`; the product page and vendor list return `variants`. Checkout lines accept an optional `variantId`; two options of one product are two lines.
- **Client:** cards of products with options say "Choose options" and open the product page; the page shows size and colour chips (a value is greyed out when every matching option is sold out), caps quantity by the chosen option, and the cart keys lines by product + option (`marketplaceStoreUtils.ts`, unit-tested in Node). The vendor's order list shows each line's option.
- **Not in this checkpoint:** the vendor-side editor for options (comes with the vendor-account checkpoint; until then variants can only be set through the API), per-option low-stock alerts, per-option price.

## ADR-026 — Service fees are waived while no wallet money can exist (B146 / CP2)
**Status:** Implemented — pending release sealing (no version bump yet)

- **Problem:** every NEXA service fee (Marketplace, Kitchen, Yaayz, Ajo, Zeeza, Dami, extensions, wallet transfer/withdrawal) is debited from the wallet ledger. B145 removed Paystack top-ups and the sandbox wallet is refused in production, so in production nobody can hold wallet money. Marketplace checkout rejected every buyer with an empty wallet ("Add enough funds to your NEXA Wallet…"); Kitchen and Yaayz fees stayed `pending`; paid plans could not be bought.
- **Decision:** `wallet.serviceFeesWaived()` is true when no wallet money can exist (provider unconnected, or the sandbox adapter in production). `subscriptions.feeMinor()` returns 0 while waived. That one choke point feeds `feePreview`, `assertFeePreview` and `chargeServiceFee`, so a waived fee takes the existing `bundled` path: no wallet row is read or debited, order `feeStatus` becomes `bundled`, and the checkout gate (`fee > balance`) passes because 0 is never greater than a balance.
- **Override:** `NEXA_FEES_WAIVED=1` always waives, `=0` always charges, unset = automatic. When a wallet partner is connected (live adapter) fees return by themselves.
- **Paid plans:** `createSubscription` for a paid plan while waived and the wallet cannot cover it returns 503 `plans_not_open` ("Paid NEXA plans open together with Sky Wallet."). Money credited before B145 can still pay for a plan. The free plan is unaffected. `GET /api/subscription` returns `feesWaived`; the membership screen shows a one-line notice.
- **Not changed:** Paystack webhook, verify routes and the B143 reconciler (they never read fees). Development and tests (sandbox, not production) charge fees exactly as before.
- **Cost:** about ₦100 of NEXA revenue per Marketplace/Yaayz order until a wallet partner is connected. Rejected alternatives: adding the fee to the Paystack charge (misses pay-seller orders, alters the amounts the webhook matches) and bringing top-ups back (reverses the B145 decision).
- **Not tested:** over HTTP (needs `better-sqlite3`), and the client screens on a device.
- **Update (B146 CP3):** Store Ajo refuses products with options on the server (unchanged) and the Ajo screen no longer lists them. Covered by `b146_store_ajo_variants.contract.test.js`.

## ADR — Release identity has one mechanical authority (B253)
**Status:** Implemented

- **Problem:** version, Batch and build code lived in ~40 places updated by hand. A previous run missed LAUNCH_HANDOFF.md, and every release needed old tests re-edited because they pinned old versions.
- **Decision:** `scripts/release-identity.mjs` implements the locked AGENTS.md rule and defines no competing one. `check` verifies every location agrees (version-agnostic); `bump` applies patch+1, Batch+1, build code+1 together and re-checks. It refuses to run on inconsistent state or when the next version's seal exists. `server/releaseIdentity.json` carries the identity to the Docker runtime; `/health` reports `batch` and `build` so a cloud server can be matched to its build.
- **Release procedure:** `npm run release:bump` -> write notes/roadmap -> `npm run release:identity` -> `npm run release:seal` -> `npm run release:seal:verify` -> zip as `NEXA-V<version>.zip`.
- **Tests:** never pin a literal release version in a new test; use the authority.

## ADR — Release identity is enforced by the project, not by memory (B254)
**Status:** Implemented

- **Problem:** the coding is done by AI sessions that start with no memory of earlier ones. A tool that exists but is not run does not protect the release.
- **Decision:** enforcement is mechanical and adds no rule beyond the locked AGENTS.md section. `npm run session:start` (first action of every session) runs the identity authority and reports whether the current version is sealed. `npm run release:ship` is the single finish line: identity check, release-note placeholders refused, `B<batch>_REPORT.md` required, seal created once and verified, zip named `NEXA-V<version>.zip`, extracted zip re-verified. `CLAUDE.md` and the AGENTS.md "Session protocol" section point every agent to both. CI runs `release:identity` before anything else and `npm run test:server` runs it first (`pretest:server`).
- **Not changed:** the locked naming/versioning section; the bump and check logic.
- **Limit:** an agent that ignores CLAUDE.md/AGENTS.md can still edit files; the CI step, the server-test pre-check and the ship step then catch the drift before a release is delivered.

## ADR — EAS may not own the build code (B255, delivered in B256)
**Status:** Implemented

- **Problem:** `eas.json` production had `autoIncrement: true` with `appVersionSource: local`. In that mode EAS reads `versionCode`/`buildNumber` from `app.json`, adds 1 and writes it back, so a production build would move the build code without `release:bump` and break the locked +1 rule and the build-minus-Batch invariant.
- **Decision:** `autoIncrement` removed. `scripts/release-identity.mjs check` now fails if any EAS profile enables `autoIncrement` or `cli.appVersionSource` is not `local`. No new naming rule: this only enforces the locked one.

## ADR — Push taps route through one map; Devil's Walk and God Hand are the full-sweep pair
**Status:** Implemented

- **Push taps:** `src/pushRouting.ts` says what a payload means; `src/pushTapRouting.ts` maps that onto routes that exist under `src/app`; `src/pushTaps.tsx` listens (foreground display, tap, launch tap) and waits for an authenticated session. Unknown payloads only open the app.
- **Devil's Walk** is the in-depth full sweep (find only, `scripts/devils-walk.mjs`). **God Hand** is the in-depth full sweep fix (`scripts/god-hand.mjs`): it plans 25 milestones per run and checks the result; it never edits files and never touches version, Batch, build code or archive names. `release:ship` runs the quick walk before sealing. No new naming rule: the locked section still decides everything about names.


## ADR-026 — Admin commerce moderation is separate from vendor subscription state

**Status:** Accepted — V5.99.85 (B331)

Shop moderation is an administrative trust decision, while vendor subscription status is a commercial entitlement. They must not share one mutable flag as the authority for both. A vendor can therefore have an active paid period while still being administratively suspended. `vendors.moderationStatus` is the moderation authority; `vendors.status` continues to represent commercial/vendor lifecycle state. Vendor entitlement refuses a moderated shop, and verified subscription payment cannot reactivate it until an administrator reinstates the shop. Marketplace product and Yaayz ticket takedowns reuse their existing `active` flags so records remain available for order/history/audit purposes rather than being deleted.


## ADR-027 — YaayzAdvert uses the existing advert inventory with a vendor-owned moderation lifecycle

**Status:** Accepted — V5.99.86 (B332)

- **Decision:** extend the existing `yaayz_ads` table additively with vendor ownership, Yaayz hub and moderation metadata instead of introducing a second advertising store.
- **Lifecycle:** vendor submissions are `pending` + inactive; owner approval sets `approved` + active; rejection and takedown remain inactive and preserve the record for history/audit.
- **Authority:** vendor entitlement controls who may submit; owner-only `vendors_moderate` controls review; public Yaayz reads only approved active rows.
- **Compatibility:** existing seeded rows default to `approved`, so the historical Yaayz feed does not disappear during the additive schema upgrade.
- **Safety:** external destination URLs remain HTTPS-only and moderation decisions are written to the existing admin audit ledger.


## ADR-028 — YaayzAdvert lifecycle transitions are explicit and bounded

**Status:** Accepted — V5.99.87 (B333)

- **Decision:** keep the existing `yaayz_ads` store and make pagination/input limits and moderation transitions explicit at the advert boundary.
- **Lifecycle:** pending -> approved/rejected; approved -> taken_down; rejected/taken_down -> approved. Invalid transitions return a conflict rather than silently rewriting state.
- **Input safety:** vendor/admin pages are integer validated and capped; inline image data is capped at 1.5 MB; external destinations remain HTTPS-only and length-bounded.
- **Not changed:** the public response shape, vendor entitlement gate, owner moderation permission, audit ledger, and approved-only public visibility.

## ADR-029 — Admin Approval Center is the NEXA governance bus stop

**Status:** Accepted — V5.99.91 (B337)

- **Decision:** the Admin app is the central approval surface for approval-bearing NEXA activity. Existing domain authorities remain server-side and their existing Admin decision routes are reused rather than duplicated.
- **Subscription authority:** paid new subscriptions and paid plan changes are represented as durable pending requests. They do not activate or charge until an owner approves them in Admin. Rejection requires an administrator reason.
- **Payment authority:** provider verification remains the technical source of truth for whether money was actually received. Admin payment review records the business/governance decision for payment-attention events but cannot mark an unverified provider payment as settled.
- **Central queue:** the Approval Center aggregates pending verification, Yaayz advert, Fitness gym, Kitchen Hub, paid subscription and payment-attention work into one Admin destination. Domain-specific pages remain available for deeper review.
- **Security:** the central approval permission is owner-only; server authorization remains authoritative on every route. All subscription and payment review decisions are written to the existing admin audit authority.
- **Compatibility:** vendor self-service remains responsible for submitting requests; Admin is responsible for approval. Existing vendor moderation, Mall, Yaayz, Lifestyle and operational authorities are preserved.

## ADR-030 — Admin Staff Work is a server-authoritative delegated-work queue

**Status:** Accepted — V5.99.94 (B340)

- **Decision:** Admin Staff work remains in the shared NEXA server as an explicit `admin_work` queue. Admin owns assignment, reclaim and final resolution; Staff only examines work assigned to its identity and capability set.
- **Batch assignment:** an owner may assign multiple work IDs in one transaction, but the server validates every item and every required capability before any selected item is assigned.
- **Reclaim:** Admin may reclaim active delegated work into a `reclaimed` state. Resolved and cancelled work cannot be reclaimed.
- **Resolution:** only Admin may move delegated work to `resolved`, and a written resolution note is mandatory. Staff submissions remain recommendations/evidence, not platform enforcement.
- **Filtering:** queue filters are server-side for status, priority and capability, with bounded results and aggregate counts returned with the filtered queue.
- **Audit:** batch assignment, reclaim and resolution actions use the existing Admin audit authority.
- **Not changed:** consumer subscription state, provider payment truth, vendor product self-service, platform-removal authority or the separate vendor Staff model.

## ADR-031 — NEXA uses separate Consumer and Admin AI behavior profiles

**Status:** Accepted — V5.99.95 (B341)

- **Decision:** maintain two server-owned AI profiles: `consumer_dami` and `admin_operations`. Dami resolves the Consumer profile before provider execution; Admin AI resolves the Admin Operations profile.
- **Training boundary:** fine-tuning/evaluation data is curated, provenance-tagged and sanitized. Raw private conversations, credentials, payment secrets and unnecessary PII are not accepted as training data.
- **Knowledge boundary:** mutable balances, orders, payments, identities, Staff assignments and other current business truth remain live server retrieval/tool data, not model weights.
- **Authority:** model output is untrusted. Existing server-side ownership, capability, state, consent, confirmation, concurrency and financial/provider checks remain authoritative.
- **Staff:** Admin AI receives only the active Staff capability and assigned work context; AI recommendations cannot elevate Staff authority.
- **Lifecycle:** candidate configurations require a passing evaluation before promotion and retain a rollback target. The registry can resolve a server-promoted model when lifecycle state exists, otherwise it safely falls back to configured base/fine-tuned environment references.
- **Observability:** AI telemetry records profile/version/evaluation metadata and correlation identifiers without persisting prompts or other sensitive payloads through the normal telemetry path.
- **Not changed:** existing Dami confirmation, replay safety, receipts, specialist boundaries, provider failover policy, Admin decision routes or server authorization.

## ADR-032 — AI training packages are provider-neutral and owner-governed

**Status:** Accepted — V5.99.96 (B342)

- **Decision:** NEXA stores a provider-neutral training-job record for `consumer_dami` and `admin_operations`, including dataset version, package SHA-256, base model reference, candidate model, bounded state and evaluation metadata.
- **Dataset authority:** only validated, provenance-tagged, profile-isolated synthetic/authorized examples may enter a training package. Live balances, orders, payments, identities and Staff assignments remain retrieval/tool truth.
- **Lifecycle:** prepared -> submitted -> running -> succeeded/failed/cancelled. A candidate cannot be promoted until a passing evaluation is persisted and the training job is succeeded.
- **Promotion:** owner Admin only. Promotion is profile-specific and records the previous promoted model as the rollback target.
- **Rollback:** owner Admin only and profile-specific; it restores the previous promoted model without crossing Consumer/Admin boundaries.
- **Audit:** preparation, job state changes, evaluation, promotion and rollback use the existing Admin audit authority.
- **Provider boundary:** B342 deliberately does not hard-wire live external fine-tuning execution. Provider execution can be attached later behind the training-job boundary without changing governance or dataset rules.
- **Not changed:** Consumer Dami confirmation/replay/receipt safety, Admin AI recommendation-only authority, Staff capability scope, server authorization, provider payment truth or existing Admin decision routes.


## ADR-033 — NEXA uses internal adaptive learning instead of requiring an external trainer

**Status:** Accepted — V5.99.97 (B343)

- **Decision:** NEXA AI learns through a server-governed adaptive memory layer built from verified activities and explicit teaching. A separate external trainer is not required for the AI to become more useful over time.
- **Profiles:** Consumer Dami uses `consumer_dami` learning memory; Admin Operations AI uses `admin_operations` learning memory. They never share adaptive memory records.
- **Learning rule:** ordinary activity can be observed as a bounded event, while actual lessons are created only from explicit teaching or an explicitly supplied lesson. Repeated confirmation raises confidence rather than silently changing model weights.
- **Self-model:** the system may report adaptive state such as learned-lesson count, confidence and recent activity. This is operational self-awareness, not a claim of consciousness.
- **Follow-up:** NEXA can schedule and surface owner-scoped follow-ups; Dami may remind the user but cannot claim that a follow-up was completed unless the server records completion.
- **Context:** learned lessons and pending follow-ups are soft model context. Current instructions, server authorization, live business truth, confirmation requirements and financial/provider state always outrank adaptive memory.
- **Privacy:** learning metadata is sanitized; prompts, credentials, payment data and unnecessary personal data are not persisted by the learning layer.
- **Model lifecycle:** the existing candidate/evaluation/promotion/rollback infrastructure remains available but is optional. Adaptive learning does not depend on an external fine-tuning job.


## ADR-034 — Repeated activity becomes bounded adaptive behavior context

**Status:** Accepted — V5.99.100 (B346)

- **Decision:** expose a dedicated behavior-context layer that converts repeated, server-observed activity into bounded adaptive signals for Consumer Dami and Admin Operations AI.
- **Consumer signals:** Dami intent, navigation, multi-step workflow usage and confirmed consequential-action types may be counted as activity patterns. Raw prompts are not used as pattern context.
- **Admin signals:** Admin AI operational scope may be counted as an activity pattern, while Staff capability and assigned work remain server-authoritative.
- **Threshold:** patterns are supplied to AI context only after repeated evidence/confidence reaches the learning layer's bounded threshold.
- **Boundary:** behavior patterns are soft context. They cannot authorize actions, alter financial truth, override current instructions, bypass confirmations, or cross profile/user ownership boundaries.
- **Learning relationship:** explicit lessons remain separate from derived activity patterns; users/Admins can forget or reset adaptive learning without changing canonical application records.
- **Follow-up:** existing owner-scoped follow-up scheduling and completion remain authoritative; adaptive activity can inform context but cannot claim a follow-up happened.
- **Not changed:** provider model weights, external training requirements, server authorization, payment/provider truth, Admin decision authority or existing Dami action receipts.

## ADR-035 — Adaptive learning is governed by provenance, freshness and owner export

**Status:** Accepted — V5.99.101 (B347)

- **Decision:** every adaptive lesson carries a bounded source classification (`explicit`, `derived`, or `event`) and may carry an owner-defined topic key for future reconciliation.
- **Freshness:** adaptive confidence is effective rather than permanent. Stale memory decays in model context; stored history is not silently deleted solely because it is old.
- **Context gate:** low-effective-confidence lessons are excluded from Dami/Admin AI adaptive context while remaining visible in owner state until explicitly forgotten or reset.
- **Correction:** explicit correction feedback creates an auditable learning event and lowers confidence; it never silently changes canonical application truth.
- **Follow-ups:** overdue follow-ups are surfaced as overdue context, never as completed work.
- **Privacy:** Consumer and Admin learning state can be exported only for the authenticated owner of that learning profile. No cross-user or cross-profile export is permitted.
- **Migration:** existing adaptive-memory databases receive missing learning metadata columns through a safe additive migration before the new index is created.
- **Not changed:** model weights, authorization, financial truth, provider settlement, confirmations, receipts, Admin enforcement authority or external training requirements.

## ADR-032 — Consumer API transport remains separate from Admin API client

**Status:** Accepted — V6.0.3 (B349)

The phone application's `src/api.ts` is the consumer transport authority for authenticated NEXA app calls, while `admin-web/src/api.js` remains the Admin-web transport. Consumer screens must not depend on the Admin client/session model. Dami adaptive-learning calls use the consumer transport and remain owner-scoped by the server. This prevents Admin-only token semantics from leaking into the consumer app and keeps adaptive-learning authority on the server.

## ADR-036 — Adaptive learning follows the canonical privacy lifecycle

**Status:** Accepted — V6.0.6 (B352)

- **Decision:** Consumer Dami adaptive-learning records are treated as user-owned personal data throughout account portability and account closure.
- **Export:** eligible Dami learning records are included in the authenticated user's account export, with profile ownership preserved.
- **Import:** adaptive learning remains outside the generic account-import allowlist because event/source lineage and profile authority are server-owned; exports are portable evidence, not trusted import instructions.
- **Closure:** learning events, feedback, patterns, follow-ups and adaptive memories are deleted at the account-closure boundary.
- **Integrity:** existing financial/transactional retention, wallet closure/redaction, session revocation and closed-account export blocking are unchanged.
- **Not changed:** server authorization, canonical business truth, provider payment truth, Admin authority, model weights or the governed-learning boundary.


## ADR-037 — Adaptive learning topic controls and audit lineage

**Status:** Accepted — V6.0.7 (B353)

- **Decision:** adaptive memories may carry an optional owner-defined topic key so users can forget a bounded topic without resetting unrelated learning.
- **Ownership:** topic forgetting is profile- and user-scoped and also removes pending/overdue follow-ups attached to memories in that topic.
- **Lineage:** learning mutations emit bounded `platform_event_log` events with the learning profile/action and opaque entity identifiers; raw credentials and sensitive account fields are not copied into audit metadata.
- **Source:** exported/state memory surfaces expose source-event lineage so adaptive lessons remain traceable to the server-owned learning event that produced or updated them.
- **Not changed:** canonical application truth, authorization, financial records, model weights, provider training, or Admin decision authority.


## ADR-039 — Corrective adaptive learning replaces the learned lesson with explicit provenance

**Status:** Accepted — V6.0.10 (B356)

- **Decision:** a `correct` learning signal may carry a user/Admin-provided replacement lesson. When supplied, the existing memory is updated in place and marked `corrected`; it does not create an uncontrolled second memory.
- **Lineage:** the correction creates a dedicated learning event, and the memory's `sourceEventId` points to that correction event. The original lesson is retained only as bounded audit metadata.
- **Empty correction:** a correction with no replacement text remains a confidence-only correction for backward compatibility.
- **Topic continuity:** corrected memories retain their existing owner, AI profile and topic key.
- **Authorization:** Consumer and Admin routes remain owner/profile scoped; adaptive correction never grants capability or changes canonical business truth.
- **Privacy:** correction metadata passes through the existing sanitizer; credentials and sensitive account fields are not copied into learning audit metadata.
- **Model boundary:** corrective adaptive memory remains soft context and does not rewrite model weights or require an external trainer.


## ADR-040 — Adaptive learning uses explicit, owner-scoped retention cleanup

**Status:** Accepted — V6.0.11 (B357)

- **Decision:** adaptive learning supports an explicit retention cleanup operation rather than silently deleting data during ordinary reads.
- **Memory policy:** only active memories older than 180 days with confidence below 0.2 are expired. Fresh or higher-confidence memories are preserved.
- **Follow-ups:** completed/cancelled follow-ups older than 90 days may be pruned; pending/overdue follow-ups remain actionable.
- **Patterns:** weak patterns older than 180 days are pruned while repeated/stronger patterns remain.
- **Feedback/events:** stale feedback may be pruned after 365 days; learning events older than 365 days are pruned only when no active memory references them.
- **Ownership:** cleanup is strictly scoped to the requested AI profile and authenticated owner.
- **Audit:** cleanup emits a bounded platform audit event with counts and retention policy, without copying sensitive credentials or account fields.
- **UX:** Consumer Dami and Admin Operations expose explicit cleanup controls; cleanup never changes preferences, authorization, financial truth or model weights.
- **Not changed:** account-closure deletion policy, portability policy, server authorization, canonical business records, provider settlement or external training.

## ADR-041 — Governed Adaptive Learning Pause Control

B358 adds owner/profile-scoped pause state for implicit adaptive learning. Paused profiles do not create activity-derived learning memories or promote repeated activity. Explicit teaching remains available because it is an intentional user/Admin instruction. The pause control is not an authorization mechanism and does not alter canonical business truth.


## ADR-042 — Adaptive Learning Provenance Transparency

Status: Accepted

B359 exposes bounded provenance for active adaptive-learning memories so users can understand why Dami learned a lesson. Provenance is resolved only from the memory's owner/profile-scoped source event and returns activity, source timestamp, and outcome; sensitive event metadata remains excluded. The feature is informational only and cannot authorize actions, alter canonical business truth, or change model weights.


## ADR-043 — Adaptive Learning Governance Summary

Status: Accepted

B360 exposes a bounded, owner/profile-scoped governance summary alongside the existing adaptive-learning state/export surface. The summary reports active-memory source categories, feedback signal counts, active topics, pending/overdue follow-ups, pause state and the fixed retention policy. It contains aggregate counts only, does not introduce a second data store or authorization path, and remains informational rather than authoritative.


## ADR-044 — Combined Consumer/Admin Navigation Authority

**Status:** Accepted — V6.0.15 (B361)

- **Decision:** consumer navigation targets are validated against the canonical `NEXA_ROUTE_INVENTORY` before directory/primary navigation helpers return a destination.
- **Route truth:** the inventory is contract-tested against the actual Expo Router screen tree so declared routes cannot silently drift into dead screens.
- **Safety:** unknown navigation targets resolve to `null`; navigation validation does not authorize server actions or bypass screen-level permissions.
- **Admin:** the Admin web page registry remains a separate permission-filtered navigation surface; its keys, labels, permissions and view implementations are contract-checked independently and together with the consumer navigation authority.
- **Boundary:** Consumer and Admin transport/session models remain separate. Navigation authority is a destination contract, not an authorization mechanism.
## ADR-045 — Combined Consumer Navigation Uses One Canonical Target Validator

**Status:** Accepted — V6.0.16 (B362)

- **Decision:** every Consumer navigation helper that returns a concrete `NavigationTarget` must pass that target through `validateNavigationTarget` or another canonical helper that does so before returning it.
- **Coverage:** Add actions, Dami destinations, notifications and search results are covered in addition to directory, leisure and subscription navigation.
- **Safety:** unknown routes resolve to `null`; valid parameters are preserved by the validator.
- **Boundary:** this is destination validation only. Screen-level and server-side authorization remain authoritative for actions and protected resources.
- **Admin:** Admin Web navigation remains separately permission-filtered and is not merged into Consumer session/transport authority.



## ADR-046 — Global Typography Readability Baseline

**Status:** Accepted — V6.0.17 (B363)

- **Decision:** increase every existing numeric Consumer `fontSize` token by exactly 2 points and treat the resulting size as the new `100% Default` reading baseline.
- **Scaling:** existing 115%, 130% and 145% user text-size options remain multiplicative above the new baseline; device accessibility scaling remains supported.
- **Admin:** Admin Web base and explicit typography sizes receive the same +2-point readability treatment while retaining its separate web visual implementation.
- **Boundary:** this changes presentation/readability only; it does not alter navigation, authorization, financial truth, AI authority, account lifecycle or security boundaries.
- **No parallel system:** the existing NEXA typography/theme and text-scale controls remain the source of truth.


## ADR-047 — Readability Residual Font-Size Guard

**Status:** Accepted — V6.0.18 (B364)

- **Decision:** after the B363 global +2-point baseline, remaining Consumer explicit 11–13px font sizes are normalized by the same +2 rule rather than introducing another typography scale.
- **Guard:** a regression contract prevents new explicit Consumer `fontSize` values below 14px in the residual range; 13px is allowed only where it is the intentional result of an original 11px token under the locked +2 rule.
- **Scaling:** the existing 100%, 115%, 130% and 145% model remains authoritative; B364 does not add a second user-facing scale.
- **Boundary:** this is presentation-only and does not change navigation, authorization, financial truth, AI authority, privacy or account lifecycle.

## ADR-046 — Shared 44px Compact Interaction Floor

NEXA's shared accessibility contract defines 44px as the minimum interactive touch target and 48px as preferred. Compact controls must not undercut that floor merely for visual density. Typography readability remains governed separately by the 100% baseline and user scaling.


## ADR-048 — Shared Focus Primitive for Direct Consumer Controls

**Status:** Accepted — V6.0.20 (B366)

- **Decision:** Consumer controls that previously bypassed `NexaPressable` should use `NexaFocusPressable` when they need the same accessibility floor and keyboard-focus behavior without changing their native visual presentation.
- **Interaction:** the primitive enforces the shared 44px minimum target, preserves disabled-state focusability rules, and supplies a visible React Native Web focus ring.
- **Semantics:** accessibility roles, labels and states remain owned by the calling control; the primitive does not invent authorization or navigation behavior.
- **Scope:** authentication, password visibility and offline retry were migrated in B366; existing `NexaPressable` controls remain unchanged.
- **Admin:** Admin Web keeps its independent CSS `:focus-visible` contract and 44px form/control floor.
- **Boundary:** presentation and accessibility only; no change to authentication authority, financial truth, privacy, AI authority or server authorization.

## ADR-047 — Accessibility Contrast and Recovery-Control Parity

**Status:** Accepted — B367 / V6.0.21

The Consumer and Admin interfaces keep a shared interaction contract: actionable recovery/auth controls use the shared focus primitive, Admin keyboard-entry surfaces are at least 44px, and canonical Royal Dark/Earth Light text mappings are covered by WCAG-AA regression contracts. Decorative artwork remains exempt from interaction sizing and text-contrast assertions when it is not user-actionable.


## ADR-049 — Canonical Interaction Floor and Yaayz Gesture Separation

**Status:** Accepted — B368 / V6.0.22

- **Decision:** shared Consumer button, secondary-button, pill and legacy action styles must explicitly respect the canonical 44px minimum interaction floor; the existing `NexaPressable` primitive remains the enforcement layer for all pressable controls.
- **Gesture separation:** Yaayz Social post media/content uses a dedicated double-tap pressable while Share, Comment and text input remain independent controls. Nested interactive controls are not placed inside the post's parent pressable.
- **Parity:** Home directory dismissal and live-call controls use the same minimum interaction floor without changing their business actions.
- **Boundary:** presentation and interaction semantics only. This does not change authorization, financial truth, privacy, AI authority, moderation authority or navigation authority.

## ADR-050 — Accessible Status Communication for Loading Surfaces

**Status:** Accepted — V6.0.23 (B369)

- **Decision:** standalone Consumer loading states that communicate an in-progress operation expose an accessible progressbar role and a concise operation-specific label.
- **Coverage:** authentication restoration, messaging, Marketplace, Kitchen, Extensions, Staff, Groups, Dami, Friends, verification, Lifestyle, Zeeza, Sky Money, financial planning and Vendor Dashboard status surfaces were normalized.
- **Boundary:** button-contained spinners remain owned by their parent control's accessible label/state and are not redundantly exposed as separate progress controls.
- **Images:** remaining user-relevant profile imagery receives explicit accessible image labels; decorative world/background imagery remains excluded from the accessibility tree.
- **Authority:** this is presentation/status semantics only. It does not alter authorization, financial truth, privacy, moderation, AI authority, navigation or account lifecycle behavior.

## ADR-051 — Contextual Status and Input Semantics

**Status:** Accepted — V6.0.24 (B370)

- **Decision:** loading indicators and contextual text inputs must expose operation-specific accessibility semantics rather than relying on nearby visual copy alone.
- **Status rule:** standalone in-progress indicators use the accessible progressbar role and concise labels; polite live regions are used where a state transition should be announced without interrupting the user.
- **Context rule:** repeated/commentary inputs identify the object they act on when multiple similar inputs can appear on the same screen.
- **Boundary:** button-contained spinners remain part of the parent control semantics; this release does not change business behavior, authorization, financial truth, privacy, moderation, AI authority or navigation authority.

## ADR-052 — Reversible Preview Workflow Data

B372 formalizes preview/demo data as a reversible testing layer. Preview mode is opt-in, demo records are identifiable, real workflow authorities remain in force, provider-dependent modules do not fabricate live truth, and cleanup covers both the new `demo_*` records and legacy deterministic preview identities/vendors such as NEXA Preview Store and Blaca Essentials.


## ADR-053 — Angels Duty Permanent Cleanup Layer

**Status:** Accepted — V6.0.31 (B377)

- **Decision:** NEXA permanently includes Angels Duty as the cleanup layer beside Devil’s Walk and God Hand.
- **Audit:** `npm run angels-duty` scans for explicit temporary/generated junk and exact duplicate files.
- **Deletion boundary:** `npm run angels-duty -- --apply` may remove only the safe-junk allowlist in `scripts/angels-duty.mjs`. Exact duplicates are reported only; they are never auto-deleted.
- **Protection boundary:** release seals/reports, roadmap authorities, project memory, source/runtime files, dependencies, build output and historical archives are protected from automatic cleanup.
- **Release integration:** `npm run release:ship` runs Angels Duty in apply mode before Devil’s Walk.
- **Rationale:** make cleanup continuous without introducing heuristic or irreversible deletion of working code, user data, historical evidence or intentional assets.

## ADR-054 — YouTube Credential-Required Live Feed Boundary

**Status:** Accepted — V6.0.53 (B399)

- **Decision:** NEXA does not pretend to have a live YouTube feed when `YOUTUBE_API_KEY` is absent. The shared YouTube integration exposes an explicit `credential_required` state and blocks live sync with a clear server response.
- **Narrativia:** the founding channel remains approved and retains its existing 120-day placement rule, but automatic synchronization waits for the server-side API credential.
- **Consumer:** Yaayz exposes integration readiness without exposing the secret. Creator playback continues to use YouTube-controlled URLs.
- **Admin:** Creator Content shows credential readiness and provides channel sync only when the server integration is ready; last sync errors remain visible.
- **Security:** API credentials never cross the Consumer/Admin API response boundary. Public channel reads require no creator OAuth write access, but live ingestion requires the configured server secret.
- **Boundary:** this changes provider-readiness and error handling only. It does not fabricate provider data, change Aami authority, moderation authority, payment truth, account lifecycle or privacy rules.

## Admin authority and account lifecycle — 2026-10-08

NEXA Admin is the authority for privileged Admin and operational Staff identities. The first Admin is bootstrapped server-side from deployment secrets and persisted as an owner; no Main App self-registration is required for the bootstrap owner. Additional Admin and Staff accounts are created by an authorized Admin through server-side routes, with password hashes stored in the NEXA database. Staff accounts are permanent until deactivated by Admin and use the existing capability-scoped Staff work system. The standalone Admin web client never receives or stores account passwords beyond the active sign-in form.

## ADR — Vendor Staff credential-backed accounts

Vendor Staff now supports an owner-created credential-backed NEXA account in addition to the historical invite-code path. The owner creates the user's name, email, password and scoped Staff/Manager role from the vendor dashboard. The server creates the normal NEXA user record, hashes the password with the existing auth authority, and creates the active `vendor_staff` relationship. Plaintext credentials are never returned by the API. Vendor Staff authorization continues to derive from the `vendor_staff` relationship and `requireVendorAccess`; staff access is removed by removing that relationship, not by deleting the underlying NEXA user. The existing invite flow remains for already-registered NEXA users.

## Smart auto-refresh — B422
Main uses one process-wide, foreground-aware refresh coordinator rather than independent per-screen polling timers. Active screens subscribe to bounded refresh signals; the coordinator pauses while backgrounded and emits one guarded refresh on foreground return. Existing request sequence guards, authentication handling, mutation retry boundaries and network policies remain authoritative.

### Adaptive smart-refresh efficiency — B424
Main smart-refresh remains process-wide and foreground-aware. Per-listener failures use bounded exponential backoff, successful refresh resets that backoff, and listener executions are staggered to reduce request bursts. Authentication, mutation and stale-response boundaries remain authoritative.

## CEO Global Readiness Block 02 — server-side configuration boundary

NEXA Main uses `server/productionConfig.js` as a safe configuration inventory and readiness boundary. It reports configured/missing/placeholder states without serializing values, treats production database/public HTTPS/CORS requirements as blockers, and requires a non-placeholder Paystack key only when live checkout is explicitly enabled. Provider slots are owner-supplied later through deployment secrets. This inventory does not claim all listed provider adapters are already integrated; each integration remains behind its own server-side adapter and signature verification boundary.

## Block 03 — authentication recovery and identity lifecycle

- Decision: keep identity authority in the Main server/database; Admin consumes the same authenticated endpoints and must not create a second credential store.
- Decision: persist only hashes of email-verification/password-reset tokens, use bounded purpose-specific expiry, invalidate older outstanding tokens, and revoke all active sessions after a password reset or change.
- Decision: expose generic public recovery responses to avoid account enumeration; rate-limit requests persistently and record security events without storing raw email/IP/user-agent values in anomaly telemetry.
- Decision: email delivery is provider-neutral. A server-side webhook can be configured later; production never returns a raw token when delivery is not configured. Local console previews are development-only.
- Verification boundary: source/contract tests passed in this build; database-backed integration, provider delivery and deployed deep-link behavior remain not tested.


## Block 04 — Admin Security Center authority boundary

NEXA Main remains the identity/session authority used by the separate Admin web app. Admin MFA TOTP secrets are AES-256-GCM encrypted at rest with a server-only configured key; login creates no Admin session until a valid one-time TOTP challenge is completed when MFA is enabled. Step-up grants are one-use, five-minute, and bound to the user, active session and action. Session tokens and raw network/device identifiers are never returned by security review endpoints. WebAuthn tables are preparatory only; passkey registration and signature verification must not be described as enabled until implemented and tested.


## CEO Global Readiness Block 06 — financial operations authority

Main remains the sole authority for wallet transactions, ledger entries, provider adapters, settlement and any future refund/chargeback execution. The new reconciliation scan compares canonical Main wallet transactions with ledger entries, persists idempotent exception findings, and audits reconciliation/review actions. Admin receives sanitized, permission-gated summary, exception, transaction-search and timeline routes. Exception assignment is accepted only for a user Main verifies already has the `payments` permission; Staff/client-selected authority is rejected and assignment is audited. Marking an exception reviewed is an auditable acknowledgement only; it never repairs balances or represents a provider-side resolution. Provider-side transaction/settlement comparison, true financial correction, chargeback lifecycle and deployed cross-app acceptance remain NOT TESTED until their canonical authorities exist.


## Block 07 — currency display is source-currency driven

Money-facing UI must format a value only when the source supplies a supported currency code. A missing or unsupported currency is shown as unavailable; UI components must not silently label an amount as NGN. Formatting is display-only and does not authorize FX conversion. Main remains the authority for wallet/ledger values and fee/refund execution; Admin may format Main-supplied values only. The Membership screen now uses this shared display contract. Broad legacy migration, persistent currency preference, provider-backed FX, and deployed acceptance remain open until separately implemented and tested.

## Block 12 — marketplace exception provenance and triage

Main is the sole authority for marketplace exception creation and triage state. Exception records require canonical order linkage, category, source type/source ID, authenticated actor, summary, evidence metadata and an idempotency key. Triage transitions use expected-version checks, globally unique request keys and terminal-state protection; they never mutate orders, inventory, refunds, payouts or provider state. Admin receives only a bounded read-only projection, safe actor roles and diagnostic counts. Raw actor IDs and arbitrary evidence payloads are not exposed to Admin. Payout-hold lineage is reported as unavailable because the current schema has no canonical payout-hold source; no substitute source is invented.


## Block 13 — emergency logout contract

Emergency logout must revoke every non-revoked session owned by the authenticated account, clear outstanding step-up grants for that account, audit the action, emit a security event, and return an explicit signed-out result. Source contract tests do not replace database-backed session middleware and live acceptance.


## 2026-10-10 — Atomic single-use OAuth code consumption

The provider exchange-code update must include both `consumedAt IS NULL` and an unexpired predicate, and session creation is permitted only when the conditional update reports exactly one changed row. This closes the local race where two requests could read the same unused code and both proceed to session creation. Regression coverage asserts the conditional update and ordering.

## ADR — AAMI Central activation-code delivery into Zeeza secure Local inbox (2026-10-11)

- **Decision:** NEXA Main exposes one server-to-server `POST /zeeza/v1/central/activation-code` receiver. It accepts only a signed AAMI Central envelope, validates scope and freshness, checks the applicant against Main's own active user record, and deduplicates delivery by `eventId`.
- **Signing configuration:** Main reads `NEXA_CENTRAL_ZEEZA_KEYS` as a JSON object mapping `keyId` to a shared secret of at least 16 characters. An absent/invalid key map fails closed. The sender's `AAMI_CENTRAL_ZEEZA_KEY_ID` and `AAMI_CENTRAL_ZEEZA_KEY` must match one entry.
- **Storage/privacy:** the code appears only in the dedicated `zeeza_central_secure_inbox.message` field. The Local inbox preview is fixed generic text. Expired message rows are deleted; a separate code-free `eventId` ledger preserves retry idempotency after message expiry. The receiver never writes code to logs, notification payloads, push messages, DM/room tables, or API responses.
- **Access boundary:** this implementation adds no client-facing create/read route. Consequently, user-visible Local inbox rendering of these records remains NOT TESTED and is not claimed as connected; a future UI/read integration must reconcile this with the explicit no-client-read restriction before being built.
- **Verification boundary:** focused receiver tests cover canonical JSON/HMAC, fail-closed configuration, valid delivery, idempotency, scope/freshness failures, identity mismatch, unknown data keys, hidden preview and expiry deletion. A real SQLite-backed run, deployed HTTPS endpoint and live Central-to-Main delivery remain NOT TESTED.


## ADR-014 — AAMI Central may resolve only verified active Main identities
**Status:** Accepted — local server contract only; external integration NOT VERIFIED

- AAMI Central identity resolution is a server-to-server POST protected by a key-ID-selected HMAC-SHA256 key, exact field allowlists, a five-minute request window, and a strict audience/issuer contract.
- Main returns only an opaque user ID and username when the account is active and `emailVerifiedAt` is present. Missing, unverified, suspended, and closed identities share the same signed `found: false` shape. The request email is not echoed.
- The resolver does not create users, set passwords, grant roles, or create sessions. It cannot substitute for Central approval or the LORDGISTICS target's own provisioning/activation checks.
- The matching Central adapter, production HTTPS/key management, and target-side account provisioning are not configured or tested.

## ADR — Signed AAMI Central privileged-access events for NEXA Main (2026-10-11)

- **Decision:** Main accepts only signed, fresh, exact-scope Central role/access-state events at `POST /central/v1/privileged-access/events`. The receiver binds events to an existing active email-verified Main identity and the fixed `nexa` / `nexa-main` scope; it never creates users or writes the global Main `admin_users` table.
- **Replay and lifecycle:** each event is fingerprinted and idempotent by event ID, and per-application sequence numbers must increase. Grant/revoke/suspend/restore transitions are state-checked. Revoke/suspend invalidate all active sessions for the affected user because the current session model has no privileged-role binding.
- **Least privilege:** company-scoped state is recorded separately from Main's unrelated global administrator roles. The receiver alone does not establish that all downstream authorization guards consume this state.
- **Verification boundary:** local SQLite-backed contract tests cover HMAC, fixed company/product scope, freshness, exact keys, verified target identity, replay conflict, sequence ordering, transition guards, and session revocation. Central's sender, deployed secrets/URL, downstream authorization consumption, browser/device acceptance and production integration remain NOT TESTED.


## ADR — Admin AAMI API namespace on the Main identity authority (2026-10-12)

- **Decision:** Reuse the existing NEXA Main backend and identity/session authority while implementing a separate `/api/admin-aami` namespace and an independent `admin_aami_privileged_access` grant store. Admin AAMI is an umbrella portal, not a company; every grant is bound to either `nexa` or `lordgistics` and the fixed `admin-aami` product scope.
- **Security:** Central events use their own `AAMI_CENTRAL_ADMIN_AAMI_ROLE_GRANT_KEYS` HMAC key map and audience, distinct from the NEXA Main role receiver. The receiver requires an existing active email-verified Main identity, a fresh signed envelope, exact fields, monotonic per-application sequence, and idempotent event IDs. A grant remains pending until a separate signed activation event. Revocation/suspension invalidates active Main sessions.
- **Authorization:** `createAdminAamiRoleGuard` fails closed and checks an active, activation-confirmed grant for a fixed supported company and allowlisted role. The authenticated self-access endpoint returns only the requesting user's scoped grant status. No grant creates an identity or writes global `admin_users`.
- **NEXA business route bridge:** after the company guard attaches the verified grant, a strict method/path allowlist rewrites selected `/api/admin-aami/nexa/*` calls to existing NEXA-only handlers. Those handlers enforce a separate Admin AAMI role-permission matrix. Owner-only administration, platform diagnostics, destructive account removal and non-migrated cross-module routes are not bridged. The Admin client uses the existing Main session and falls back to active grant discovery only when legacy `/api/admin/me` returns 403.
- **Rationale:** reuse identity infrastructure without conflating Admin AAMI permissions with Main global administrator privileges or treating a company selector as authorization.
- **Verification boundary:** focused Main route/permission tests and Admin API fallback/workspace tests pass locally. Full Main server regression is BLOCKED by missing `better-sqlite3` and also reports unrelated existing contract failures. Central sender live wiring, production secrets/HTTPS, full 36-tile route migration, browser/device acceptance and deployment remain NOT TESTED.


## ADR — Fail closed on malformed Admin AAMI request context (2026-10-12)

- **Decision:** if a request has an `adminAamiAccess` property, the permission resolver must authorize exclusively from a valid `admin-aami` / `nexa` grant and the Admin AAMI role permission set. An invalid, malformed, or cross-company grant denies the permission instead of falling through to a legacy/global Main Admin role.
- **Rationale:** scoped authorization context is a boundary, not a hint; invalid scoped context must not inherit unrelated global authority. Requests with no scoped grant retain the existing legacy Admin path.
- **Verification:** `server/adminAccess.aami.test.js` adds invalid-role and LORDGISTICS-scope denial assertions while preserving the legacy no-grant path.
