# B91 Repair 1 - deep-dive fixes

1. **Fonts never loaded** - `useFonts` lived only in legacy `app/_layout.tsx`, which Expo Router ignores because `src/app` exists. Fonts now load in `src/app/_layout.tsx` (render gated until loaded or failed; no splash-screen dependency).
2. **Web shell not applied** - `+html.tsx` was only in `app/`. Copy added to `src/app/+html.tsx` (viewport-fit, ScrollViewStyleReset, overflow rules).
3. **`/staff` route broken** - `src/app/staff.tsx` imported `../../X` (one level too high). Fixed to `../X`.
4. **Home screen parse error** - `HomeCommandCenter.tsx` opened `NexaFocusPressable` twice but closed with `TouchableOpacity`. Fixed.
5. **Marketplace hook parse error** - `useMarketplace.ts` had `setError,,query`. Fixed.
6. New `server/b91_repair1.contract.test.js`: font registration, +html location, every relative import resolves, every src file parses.

Not changed (noted): legacy `app/` folder is inert; duplicate logos in `assets/branding` + `branding/`; duplicate archive files in `docs/archive`; duplicate imports in HomeCommandCenter.tsx / NexaAI.tsx; fontFamily + fontWeight pairing in theme.ts/styles.ts (pinned by design-layer tests).

## Step 2 - Blaca Essentials
- `server/seedFashionVendors.js`: `status` (read-only report on whether a Blaca shop exists / is hidden), `apply` (creates Blaca Essentials with 12 products: watches, suits, hats, shoes, pants, jackets), `apply --demo` (adds 4 demo vendors). Idempotent.
- Not yet run against a live database (no dependencies installed in the build sandbox).

## Step 3 - Marketplace shops + modern grid, more runtime fixes
- Fixed 3 more runtime ReferenceErrors found by an undeclared-identifier scan: `setError` in `useVendorDashboard` (vendor dashboard never finished loading), `useModalFocus` not imported in `HomeCommandCenter.tsx`, `setNexaTextScale` not imported in `NexaTextSizeControl.tsx` (text-size buttons crashed).
- Server: `GET /api/mall/vendors` (public shop directory) and `vendorId` filter on `GET /api/mall/products`.
- Client: Shops rail, shop header with "All shops", two-column product grid with SALE / Only N left / Sold out states.
- Updated the pinned ds() count in `v5_21_0_market_block.contract.test.js` (64 -> 81; every new inline style is ds()-wrapped).
- Suite: 237 test files pass. Not run on a device.

## Step 4 - Blaca attached automatically 
- `server/index.js` calls `ensureBlacaAtStartup()` before listen: creates Blaca Essentials (12 products) if no Blaca shop exists; idempotent; never blocks startup.
- Env: `BLACA_OWNER_EMAIL` (attach to your account), `NEXA_SKIP_BLACA_SEED=1`, `NEXA_SEED_DEMO_VENDORS=1`.
- A paused Blaca shop is left paused and reported in the log.
- Verified by executing the seed against SQLite with the project's schema: create, second-run no-op, attach to existing account, bad-email fallback, paused stays paused.
