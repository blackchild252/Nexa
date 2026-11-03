# NEXA V5.21.0 / B57 — Dual Interface, Checkpoint 1 (theme engine · Earth Light · Settings switch)

## Request
1. A second interface, **Earth Light** (white sky, blue water, brown land, green forest, touch of gold); Royal Dark stays the dark interface; a switch in Settings.
2. Each interface flows through the whole app with its own 3D/AI-style animation; per-block worlds (Sky Money = banking, Kitchen = restaurant, ...). Checkpoints continue per task.

## Checkpoint plan
- **CP1 (this zip):** theme engine, Earth Light palette, Appearance switch, whole-app reskin, Earth Light animated scene.
- **CP2..:** block-by-block scenes + 3D animation in BOTH interfaces (Sky Money, Kitchen, Ball House, Dream Marketplace, Fitness, Game House, Zeeza, Yaayz, Dami, Profile). Until then Earth Light uses one shared Earth scene on every world.

## What changed
- `src/themeMode.ts` (new, pure): mode state, subscribe, `themedStyles()` (one style sheet per mode, resolved lazily).
- `src/theme.ts`: `darkTheme` (values unchanged) + `lightTheme`; `theme` is now a live view of the active mode; `tc()` maps leftover dark literals; `themedStyles()`.
- `src/ThemeProvider.tsx` (new): loads the saved choice before first render, persists with expo-secure-store, `useThemeMode()`.
- `src/ThemePicker.tsx` (new) + `Profile & Settings → Appearance`: two live-preview tiles (radio buttons, 48px targets).
- `src/app/_layout.tsx`: `ThemeProvider` outermost; navigation tree re-keyed on switch and the current route restored; StatusBar follows mode. Provider order `AuthProvider > MotionProvider` unchanged.
- `src/NexaEarth.tsx` (new): sun with gold glow, drifting clouds, brown land, swaying green forest, shimmering blue water with gold sun path. Same subscription motion rules as the cosmos (Free = same scene, static; reduced-motion wins).
- `src/NexaWorldBackground.tsx` / `NexaDepthLayer.tsx`: pick cosmos/poster (dark) or Earth (light); depth rings become gold + water blue.
- 12 module-level style holders wrapped in `themedStyles()`; ~150 hard-coded dark colors converted to `tc()`; white text on cards in Wallet / Money / Market Watch / Groups now uses the text token.
- Earth Light alias mapping: `royalGold` = forest green (buttons), `brightGold/goldBright/goldHot` = water blue (active/accent), `gold/borderGold` = real gold (frames), text = land brown. Contrast checked ≥ 4.5:1 for the main pairs (test).
- Test: `server/v5_21_0_dual_theme.contract.test.js` (12 tests). Four older assertions updated for intended changes (B55 layout key, tabs `tc()`, B56 version range).

## Verification
- New tests: 12/12 pass. Source-reading suites (63 files): failures 26 before → 26 after, none new (the 26 are pre-existing stale version checks etc.).
- Syntax check of all `src` files with `tsc`: clean. `theme.ts`/`themeMode.ts` pass `--strict`.
- **NOT verified:** full `tsc` typecheck (no node_modules / RN types in this workspace) and any on-device run. The screen re-key + route restore and the way Earth Light looks are untested visually — please run `npx expo start`, open Profile → Appearance, and switch both ways on a device.

## Known / needs your OK
- Switching resets the back stack (route is restored, history is not).
- `NexaDamiRobot` / glossy orbs keep their current look in both interfaces until CP2 gives Earth Light its own 3D Dami.
- Two `/leisure` route files (from B55) still awaiting your OK to delete `src/app/leisure.tsx`.


---

# Checkpoint 2 — HOME block (sealed)

Order rule from the owner: one block per checkpoint, seal (zip) before starting the next. Home is first in the sidebar, so it is CP2. Next in sidebar order: Dami (CP3).

## What changed
- `src/NexaEarthHome.tsx` (new): three decorative, non-interactive layers used only for the Home world in Earth Light.
  - `EarthHomeSky`: gold sun rays turning slowly (90 s), three birds crossing the sky with flapping wings; VIP tier adds a gold ring round the sun.
  - `EarthHomeShore`: NEXA skyline on the far shore, 9 towers with gold-lit windows; the tallest has an antenna and a pulsing gold beacon.
  - `EarthHomeWater`: sailboat (white sails, brown hull, gold stripe) drifting and bobbing on the water.
- `src/NexaEarth.tsx`: mounts those layers when `variant === 'home'` (Dami and all other worlds are unchanged).
- `src/NexaDamiRobot.tsx`: colours moved into `DARK_PAL` (values identical to before) and `LIGHT_PAL` (gold shell, sky-glass face, deep water-blue eyes, water/forest/gold rings, forest-leaf crown). Chosen with `useThemeMode()`.
- `src/NexaGlossyOrb.tsx`: `LIGHT_TONES` (red -> forest green, blue -> water blue, glass -> sky glass, gold stays gold, all with a real-gold rim); `NexaBevel` gets a white-glass Earth Light look. Royal Dark tones and bevel values are unchanged. These two components are shared, so the same orbs/rails follow the theme wherever they are used.
- Test: `server/v5_21_0_home_block.contract.test.js` (8 tests).
- No version bump (still 5.21.0, batch B57); `VERSION.md` notes checkpoint 2.

## Verification
- New tests: 8/8 pass. The 12 CP1 theme tests still pass.
- Full `server/*.test.js` run: same failures before and after, none new (baseline captured before any edit).
- Syntax / undefined-name check with `tsc` on the four edited files: clean.
- NOT verified: full type check and any device run (no `node_modules` here). How Home actually looks and moves in Earth Light is untested visually.

## Watch on device
- The Calls orb (water blue) sits over the blue water at the bottom of Home. It has a gold rim and glow, but check it reads well.
- Sun rays are 10% opacity gold; if too faint or too strong on your phone, it is one number (`rgba(255,215,120,0.10)`).


---

# Checkpoint 3 — DESIGN LAYER (sealed)

Owner decision: each interface is its own complete design; switching switches the whole design. Scope chosen: **looks only** (shape, type, frame, shadow, icons, motion, scenes). Layout and navigation are the same in both. Royal Dark must not change.

## What changed
- `src/themeDesign.ts` (new, pure): a design profile per interface plus `designStyle()`, `scaleRadius()`, `designIcon()`, `motionProfile()`. Royal Dark is the identity (returns the same object).
- Earth Light rules: corner radius x1.3 (pills/circles >= 100 and hairlines <= 2 untouched); fontWeight 900/800/700 -> 800/700/600; letterSpacing x0.5; thick borders thinned (1.5 -> 1, 2 -> 1.5); shadowRadius x1.4, shadowOpacity x0.7, shadow lifted x1.25, elevation x0.7; filled icons from a fixed safe list (inactive tabs stay outline; unknown names stay as-is); calmer motion (softer spring, +80 ms enter, 1.5x float travel, lighter press).
- `src/theme.ts`: `theme.design` profile; Earth `radius`, `typography`, `layout` (page/section/card padding 20/16/20, controls 50/58); full remap = colours then design (`remapStylesForMode`); new helpers `ds(style)` (design an inline style) and `di(iconName, focused)`. While a style sheet is being built, `theme.radius` / `theme.typography` resolve to base tokens so nothing is scaled twice; inline reads get the designed values.
- `src/themeMode.ts`: `isBuildingStyles()`.
- `src/motion.tsx`: `NexaPressable` and `NexaAnimatedView` read the motion profile; with the dark profile the numbers are exactly the old ones.
- `src/app/(tabs)/_layout.tsx`: Earth Light tab bar has rounded top corners, a water-wash pill indicator, filled active icon, lighter labels. Royal Dark lines are unchanged and asserted by test. Home still hides the bar.
- `src/NexaNavKeys.tsx`, `src/HomeCommandCenter.tsx`: menu and nav-key icons go through `di()`.
- Tests: `server/v5_21_0_design_layer.contract.test.js` (11). One older test edited: the theme loader in `server/v5_21_0_dual_theme.contract.test.js` now also loads `themeDesign.ts` (theme.ts imports it). Its 12 tests are unchanged and pass.

## Reach
Corners, weights, frames and shadows switch in every style sheet built with `themedStyles()` (the shared `s` sheet used by Wallet, Money, Marketplace, Subscription, Market Insights and others, plus 11 more sheets). Not reached yet, by design: inline `style={{...}}` objects in screens such as `NexaAI.tsx` (Dami) and a few others. They keep the right colours but not the new shapes; each block checkpoint converts its own screens with `ds()`.

## Verification
- New tests 11/11 pass; CP1 (12) and CP2 (8) tests still pass.
- Full `server/*.test.js`: 828 tests, 797 pass, the same 31 fail as the baseline captured at the start of CP2. No new failures.
- Strict `tsc` on `themeDesign.ts`, `themeMode.ts`, `theme.ts`: clean. Syntax/undefined-name check on the edited screens: clean (the only message is the existing `__DEV__` global in `motion.tsx`).
- NOT verified: full type check and any device run (no `node_modules`). The Earth filled icon names were not checked against the real Ionicons glyph map; they are limited to standard names, and anything unknown falls back to the outline icon.

## Watch on device
- Earth Light tab bar: the rounded top corners and the 46x30 pill indicator.
- Text that used weight 900 in Royal Dark now reads 800 in Earth Light; if any label looks too light, the map is in `themeDesign.ts`.
- Any card that looks too round: change `radiusScale` (1.3) in one place.


---

# Checkpoint 4 — DAMI block (sealed)

Order rule from the owner: one block per checkpoint, from the top of the sidebar (Home, Dami, Zeeza, Sky Money, ...). Home was CP2; Dami is next in the directory (`HOME_DIRECTORY`), so it is CP4. Next: Zeeza (CP5).

## What changed
- `src/NexaAI.tsx` (the Dami screen): all 117 inline `style` / `contentContainerStyle` objects now go through `ds()`, so Earth Light's design layer (rounder corners, lighter weights, thinner frames, softer shadows) reaches Dami. The change is wrapper-only (proved by reversing the edit and comparing to the original file). Every colour literal was already in `tc()` and every one has an Earth Light mapping; button text is white on water blue (5.18:1). No handler, API call or confirm-flow logic touched.
- `src/NexaEarthDami.tsx` (new): two decorative, non-interactive layers used only for the Dami world in Earth Light.
  - `EarthDamiSky`: gold halo behind the header robot (breathing glow + steady ring; VIP adds an outer water-blue ring), five gold / water-blue sparks orbiting the robot (24 s), and five light motes floating up.
  - `EarthDamiWater`: three soft white "listening" ripples spreading across the water.
- `src/NexaEarth.tsx`: mounts those layers when `variant === 'dami'` (Home and calm worlds unchanged).
- Royal Dark Dami is unchanged (cosmos, gold rings). Same subscription motion rules: Free is static, reduced motion wins; loops stop on unmount.
- Test: `server/v5_21_0_dami_block.contract.test.js` (11 tests).
- No version bump (still 5.21.0, batch B57).

## Verification
- New tests 11/11 pass. CP1 (12), CP2 Home (8), CP3 design layer (11) still pass.
- Full `server/*.test.js`: 839 tests, 808 pass, 31 fail. The failing test NAMES are identical to the untouched CP3 zip (31 before, 31 after, none new).
- Syntax check (`tsc` transpile) of `NexaAI.tsx`, `NexaEarth.tsx`, `NexaEarthDami.tsx`: clean; undefined-name check: clean.
- NOT verified: full type check and any device run (no `node_modules`). How Dami looks and moves in Earth Light is untested visually.

## Watch on device
- Halo position is fixed at the header robot (x 58, y 70). If your phone's safe area moves the robot, change `HALO_CX` / `HALO_CY` in `NexaEarthDami.tsx`.
- Ripples sit 46 px under the horizon; the chat bubbles and input bar sit on top of them, so check they still read clearly.


---

# Checkpoint 5 — ZEEZA block (sealed)

Order rule from the owner: one block per checkpoint, from the top of the sidebar. Directory order is Home, Dami, Zeeza, Sky Money, ... so Zeeza is CP5 (Home = CP2, Dami = CP4). Next: Sky Money (CP6).

Scope of "Zeeza block" = the Zeeza tab (Inbox / Friends / Chase / Profile keys), Inbox, Friends, Chase, Profile, DM thread, Room, 1:1 call, group call, and the share-link screen. Groups (`GroupsTab`, `GroupScreen`) belong to Sky Money and are left for that checkpoint.

## What changed
- Design layer: all 46 inline `style` / `contentContainerStyle` objects on the Zeeza screens now go through `ds()` (zeeza tab 3, Inbox 5, Friends 11, Chase 6, Profile 6, Thread 5, Room 7, GroupCall 1, share 1, inbox route 1). Wrapper-only edit, proved by reversing it against the previous files (inbox route differs only by brace spacing in its import). Message bubbles, sub-tabs and cards already follow through the shared `ss` sheet.
- Bug fix (Earth Light, call screen): Decline / Accept used the neutral text style, which becomes land brown in Earth Light; on the red Decline button that is 2.9:1 (unreadable). Added `onSolid` (`theme.colors.black`: exactly the original black in Royal Dark, white in Earth Light = 5.4:1 on red). Accept also gets a darker green in Earth Light only (`#237A48`, 5.3:1 with white; the stock green gave 4.25:1). Royal Dark values are identical to before. No call logic touched.
- Icons: the four Zeeza section keys go through `di()`; active key is filled in Earth Light, inactive stays outline. `chatbubbles` and `compass` added to the filled-icon list in `themeDesign.ts`.
- Scene: `src/NexaEarthZeeza.tsx` (new), used only for the Zeeza world in Earth Light.
  - `EarthZeezaSky`: four soft white chat bubbles with a gold rim drifting up and down; one shows three "typing" dots that pulse in turn; VIP adds a small gold spark.
  - `EarthZeezaWater`: two linked rings (white-blue and gold) drifting together on the water ("friends first").
  - Kept faint and under the readability wash so Inbox / Friends / Chase stay readable. Same calm horizon as before.
- `src/NexaEarth.tsx`: new `zeeza` variant. `src/NexaWorldBackground.tsx`: maps world `zeeza` to it, keeps the readability wash and 0.18 dim.
- Royal Dark Zeeza is unchanged (world poster). Same subscription motion rules: Free is static, reduced motion wins; loops stop on unmount.
- Test: `server/v5_21_0_zeeza_block.contract.test.js` (12 tests). One older assertion in the Dami test was loosened only because the world-to-variant chain gained a `zeeza` branch after `dami`.
- No version bump (still 5.21.0, batch B57).

## Verification
- New tests 12/12 pass; CP1 (12), CP2 Home (8), CP3 design layer (11), CP4 Dami (11) still pass.
- Full `server/*.test.js`: 851 tests, 820 pass, 31 fail. The failing test NAMES are identical to the untouched original zip (none new, none fixed).
- Syntax check of all edited/new files: clean. Undefined-name check: clean. `themeDesign.ts` / `themeMode.ts` pass `--strict`.
- NOT verified: full type check and any device run (no `node_modules`). How Zeeza looks and moves in Earth Light is untested visually.
- ASSUMED: Ionicons glyphs `chatbubbles` and `compass` exist in the installed icon set (standard names, but not checked against the real glyph map here).

## Watch on device
- Bubble positions are fractions of the screen; if one lands behind the header or a card edge on your phone, change its entry in `BUBBLES` in `NexaEarthZeeza.tsx`.
- The two rings sit 52 px under the horizon, behind the lists.
- Call screen in Earth Light: check Decline / Accept and Mute / Camera buttons read well over the video area.


---

# Checkpoint 6 — SKY MONEY block (sealed)

Order rule from the owner: one block per checkpoint, from the top of the sidebar, and each block gets BOTH interfaces (Royal Dark and Earth Light) following the same theming pattern and subscription motion tiers. Directory order is Home, Dami, Zeeza, Sky Money, ... so Sky Money is CP6 (Home = CP2, Dami = CP4, Zeeza = CP5). Next: Dream Marketplace (CP7).

Scope of "Sky Money block" = the Money tab and all its views (Overview, Activity, Planning, Sky Store Savings, Sky Group Savings with group detail, Sky Market Watch, Sky Insights) and the Sky Wallet screen (`/wallet`). Subscription is not in this block (it is reached from Profile).

## What changed
- Design layer: all 105 inline `style` / `contentContainerStyle` objects on the Sky Money screens now go through `ds()` (MoneyDashboard 21, Wallet 18, MarketWatch 13, MarketInsights 25, FinancialPlanning 8, StoreAjo 6, GroupsTab 3, GroupScreen 11). Wrapper-only edit, proved by reversing it against the previous files (identical). Every colour literal on these screens was already in `tc()` and every one has an Earth Light mapping.
- Earth Light scene: `src/NexaEarthMoney.tsx` (new). `EarthMoneySky`: five gold coins bobbing and turning edge-on to face-on (VIP adds a small gold spark). `EarthMoneyWater`: five growth bars (shortest to tallest) rising out of the water, gold caps glow in turn. Faint, native views, never receive touches.
- Royal Dark scene: `src/NexaDarkMoney.tsx` (new), mounted over the Sky Money poster and under the depth layer / readability wash: six small gold sparks rising slowly, one thin gold ledger gleam sweeping down every ~9 s (VIP: slightly brighter and thicker). The poster itself, cosmos and all other Royal Dark worlds are untouched.
- Wiring: `NexaEarth.tsx` gets a `money` variant; `NexaWorldBackground.tsx` maps world `sky-money` to it, keeps the readability wash and 0.18 dim, and mounts the dark layer only in Royal Dark for `sky-money`.
- Scene visibility fix: the Market Watch / Insights wrapper and the Group Savings wrapper in `MoneyDashboard.tsx` painted a solid `theme.colors.background`, hiding the world scene on those views (Overview, Planning and Ajo already showed it). Both are now transparent. `src/app/wallet.tsx` had a plain solid background; it now sits inside `NexaWorldBackground world="sky-money"`. This is a visible change in Royal Dark too (those views now show the Sky Money poster + vault layer behind the cards, as Overview already did).
- Bug fix: `FinancialPlanning.tsx` used `theme.colors...` (loading spinner, comparison line) but only imported `tc`, so opening Planning would throw a ReferenceError. Added `theme` to its import. This came from an earlier checkpoint's import edit, not from this one.
- Same subscription motion rules: Free is static, reduced motion wins; loops stop on unmount.
- Test: `server/v5_21_0_money_block.contract.test.js` (10 tests). Two older Zeeza assertions loosened only because the world-to-variant chain gained a `sky-money` branch (same kind of change as CP5 made to the Dami test).
- No version bump (still 5.21.0, batch B57).

## Verification
- New tests 10/10 pass; all B57 tests (64) pass.
- Full `server/*.test.js`: 861 tests, 830 pass, 31 fail. The failing test NAMES are identical to the untouched CP5 zip (31 before, 31 after, none new, none fixed).
- Syntax + undefined-name check (`tsc` transpile + name check) of all 13 edited/new files: clean after the FinancialPlanning fix.
- NOT verified: full type check and any device run (no `node_modules` here). How Sky Money looks and moves in either interface is untested visually.

## Reseal addendum — Extensions / Developer Console crash fix (owner asked for it before moving on)
The undefined-name check over all of `src` had found screens that would throw a ReferenceError on open. Fixed the two the owner named, with import-only edits (no style or behaviour change; they were already in the uploaded CP5 zip):
- `ExtensionsScreen.tsx`: added `useRef` to the `react` import and `theme` to the `./theme` import.
- `ExtensionDeveloperScreen.tsx`: added `theme` to the `./theme` import.
- Test: `server/v5_21_0_import_guard.contract.test.js` (3 tests) — every `src` file that reads `theme.*` imports `theme`; every file that calls a React hook imports it; the two screens' imports. Proved it fails on the broken imports and passes on the fixed ones.
- Full `server/*.test.js`: 864 tests, 833 pass, 31 fail — the same 31 failing names as the untouched CP5 zip (none new, none fixed).
- Still open, NOT changed (belongs to Dream Marketplace, CP7): `MarketplaceScreen.tsx` uses `targetOrderId` / `setTargetOrderId` that are not declared in the file. These two screens' looks (ds() design layer) also stay for their own checkpoints.

## Watch on device
- Earth Light: coins sit in the upper sky (left / centre); the growth bars sit right of centre, just under the horizon. If either lands behind a card edge on your phone, change `COINS` / `left0` in `NexaEarthMoney.tsx`.
- Royal Dark: the ledger gleam is 10% gold (16% VIP); if it is too faint or too strong, it is one colour value in `NexaDarkMoney.tsx`.
- Market Watch, Insights, Group Savings and Wallet now show the scene behind them: check text on the cards still reads well in both interfaces.


---

# Checkpoint 7 — DREAM MARKETPLACE block (sealed)

Order rule from the owner: one block per checkpoint, from the top of the sidebar, each block in BOTH interfaces with the subscription motion tiers. Directory order is Home, Dami, Zeeza, Sky Money, Dream Marketplace, ... so Dream Marketplace is CP7. Next: Yaayz (CP8).

Scope of "Dream Marketplace block" = the Marketplace tab (storefront: catalog, cart, checkout, My orders & payments, refunds, disputes) and the vendor dashboard (`/marketplace/vendor`). Yaayz reuses the same poster image but is its own sidebar block and gets nothing from this checkpoint (asserted by test). Staff / Store savings screens belong to their own blocks.

## What changed
- Design layer: all 64 inline `style` objects on the Dream Marketplace screens now go through `ds()` (MarketplaceScreen 51, VendorDashboard 13). Wrapper-only, proved by reversing the edit against the previous files (VendorDashboard identical; MarketplaceScreen identical except the one declared-state line below). Every colour literal was already in `tc()` and every one has an Earth Light mapping.
- Earth Light scene: `src/NexaEarthMarket.tsx` (new). `EarthMarketSky`: nine bunting pennants swaying from the string across the top (VIP adds a small gold spark). `EarthMarketWater`: a market stall boat (striped awning with gold trim, brown hull) drifting and bobbing (VIP lights a small gold lantern). Faint, native views, never receive touches.
- Royal Dark scene: `src/NexaDarkMarket.tsx` (new), over the Dream Marketplace poster and under the depth layer / readability wash: three faint gold spotlight beams breathing in turn, one slow diagonal gold glint crossing the screen every ~8 s (VIP: a little brighter and wider). Poster and all other Royal Dark worlds untouched.
- Wiring: `NexaEarth.tsx` gets a `market` variant; `NexaWorldBackground.tsx` maps world `dream-marketplace` to it (readability wash + 0.18 dim kept, calm horizon) and mounts the dark layer only in Royal Dark for that world.
- Vendor route: `src/app/marketplace/vendor.tsx` now sits inside `NexaWorldBackground world="dream-marketplace"` (it was on a bare screen).
- BUG FIX (real crash): `MarketplaceScreen.tsx` used `targetOrderId` / `setTargetOrderId` but never declared them. Opening "My orders & payments", or opening an order from a notification, would throw a ReferenceError. Added `const [targetOrderId,setTargetOrderId]=useState<string|null>(null);` directly before the effect that sets it. Nothing else in that logic touched; the notification "Opened from notification" ordering behaviour is unchanged. (It was already broken in the uploaded CP5 zip.)
- Self-check on my own code: the first draft of the bunting swung from an offset pivot, which would have slid the flags instead of swinging them; corrected to a zero-size pivot on the string and pinned by test.
- Test: `server/v5_21_0_market_block.contract.test.js` (9 tests). Three older assertions (Zeeza x2, Sky Money x1) loosened only to allow the new `market` branch in the world-to-variant chain.
- No version bump (still 5.21.0, batch B57).

## Verification
- New tests 9/9 pass; all B57 tests (76) pass.
- Full `server/*.test.js`: 873 tests, 842 pass, 31 fail. The failing test NAMES are identical to the untouched CP5 zip (none new, none fixed).
- Syntax + undefined-name check of every file under `src`: clean (only tool limitations remain, e.g. `Proxy` / `URLSearchParams` because the checker has no type libraries). No known missing-import or undeclared-name crash is left.
- NOT verified: full type check and any device run (no `node_modules` here). How Dream Marketplace looks and moves in either interface, and the checkout / order flows against a live server, are untested.

## Watch on device
- Earth Light: bunting runs along the top of the sky (about 7.5% down); if it sits behind the header or nav keys on your phone, change `top` in `EarthMarketSky`. The stall boat is left of centre, 44 px under the horizon, behind the lists.
- Royal Dark: the glint is 6% gold (9% VIP); if too faint or strong it is one colour value in `NexaDarkMarket.tsx`.
- Product cards with photos: check card text and prices still read well with the scene behind them in both interfaces.


---

# Checkpoint 8 — YAAYZ block (sealed)

Order rule from the owner: one block per checkpoint, from the top of the sidebar, each block in BOTH interfaces with the subscription motion tiers. Directory order is Home, Dami, Zeeza, Sky Money, Dream Marketplace, Yaayz, L.A., ... so Yaayz is CP8. Home was cross-checked first (see below). Next: L.A. (CP9).

Scope of "Yaayz block" = the Yaayz tab (`/(tabs)/yaayz`): Yaayz home tiles, Adverts, Tickets (search, type pills, buy flow with service-fee preview, verify payment, retry fee, My tickets, "opened from notification" highlight). Yaayz reuses the Dream Marketplace poster image but got nothing from CP7 (asserted); it now has its own layers.

## Home cross-check (owner asked to confirm before continuing)
Home is first in the sidebar and was sealed in CP2. Its 8 contract tests plus the 12 theme-engine tests still pass in this zip; nothing in Home was edited. Nothing needed redoing.

## What changed
- Design layer: all 14 inline `style` / `contentContainerStyle` objects in `YaayzScreen.tsx` now go through `ds()`. Wrapper-only edit, proved by reversing it and comparing byte-for-byte with the previous file (identical). There were no colour literals in the file; every colour already comes from the theme tokens. No handler, endpoint or purchase / fee logic touched.
- Earth Light scene: `src/NexaEarthYaayz.tsx` (new). `EarthYaayzSky`: airplane with a six-dash fading contrail crossing the sky (22 s), VIP adds a small gold spark on the wing. `EarthYaayzWater`: ferry drifting and bobbing above a dotted gold route line (seven dots glowing in turn), VIP lights a small gold lantern. Native views, never receive touches, kept faint.
- Royal Dark scene: `src/NexaDarkYaayz.tsx` (new), mounted over the Yaayz poster and under the depth layer / readability wash: three thin gold route lines at different tilts, each with one gold dot travelling along it (11 / 14 / 17 s), six gold event lights twinkling in turn near the top (VIP a little brighter). The poster, cosmos and all other Royal Dark worlds are untouched.
- Wiring: `NexaEarth.tsx` gets a `yaayz` variant (calm horizon kept); `NexaWorldBackground.tsx` maps world `yaayz` to it, keeps the readability wash and 0.18 dim, and mounts the dark layer only in Royal Dark for `yaayz`.
- Same subscription motion rules: Free renders the same layers static, reduced motion wins, loops stop on unmount.
- Test: `server/v5_21_0_yaayz_block.contract.test.js` (9 tests). Four older assertions (Dream Marketplace x2 incl. the "Yaayz gets nothing" line, Sky Money x1, Zeeza x1 regex group) loosened only to allow the new `yaayz` branch in the world-to-variant chain; the Dream Marketplace test still asserts its layers never mount for Yaayz.
- No version bump (still 5.21.0, batch B57).

## Verification
- New tests 9/9 pass; all B57 tests (85) pass.
- Full `server/*.test.js`: 882 tests, 851 pass, 31 fail. Baseline captured on the untouched CP7 zip before any edit: 873 tests, 842 pass, 31 fail. The 31 failing test NAMES are identical before and after (none new, none fixed).
- Syntax check (`tsc` transpile) of all 5 edited/new source files: clean. Import guard test (every file reading `theme.*` imports it, every hook user imports React hooks) passes.
- NOT verified: full type check and any device run (no `node_modules` here). How Yaayz looks and moves in either interface, and the ticket purchase / payment flow against a live server, are untested.

## Watch on device
- Earth Light: the airplane flies about 17% down the sky, the ferry sits right of centre 30 px under the horizon, the route dots run 96 px under it. If any lands behind a card edge on your phone, change `top` / `left` in `NexaEarthYaayz.tsx`.
- Royal Dark: route lines are 9% gold and the event lights sit in the top 15%; if too faint or strong it is one colour value each in `NexaDarkYaayz.tsx`.
- Ticket cards: check type label, price and Buy button still read well with the scene behind them in both interfaces.


---

# Checkpoint 9 — L.A. (Leisure Arena) block (sealed)

Order rule from the owner: one block per checkpoint, from the top of the sidebar, each block in BOTH interfaces with the subscription motion tiers. Directory order is Home, Dami, Zeeza, Sky Money, Dream Marketplace, Yaayz, L.A., Ball House, Kitchen, ... so L.A. is CP9. Next: Ball House (CP10).

Scope of "L.A. block" = the L.A. hub tab (`/(tabs)/leisure`, `LeisureArenaScreen`): the four activity cards and the upcoming Yaayz tickets box. Ball House, Kitchen, Game House and Fitness are their own sidebar blocks and get nothing here (asserted by test).

## What changed
- World separation: the L.A. tab was mounted in the `ball-house` world. Putting L.A. layers on that world would have leaked into the Ball House block, so L.A. now has its own world `leisure` (`nexaWorlds.ts`) that uses the SAME poster image (`ball_house_world.jpg`). Royal Dark L.A. looks exactly as before; Ball House is untouched.
- Design layer: the 2 plain inline `style` / `contentContainerStyle` objects in `LeisureArenaScreen.tsx` now go through `ds()`. Wrapper-only, proved by reversing the edit against the previous file (identical). The activity cards use array styles (`[s.card, {...}]`) like the other blocks; they take the Earth Light shapes through the shared `s` sheet. No colour literals in the file. No route, card or request logic touched.
- Earth Light scene: `src/NexaEarthLeisure.tsx` (new). `EarthLeisureSky`: four balloons (one per activity) bobbing out of step (VIP: gold spark above the gold one). `EarthLeisureWater`: pier with nine pilings and four lamp posts, gold lamps glowing in turn (VIP: soft gold halos). Native, never receive touches, faint.
- Royal Dark scene: `src/NexaDarkLeisure.tsx` (new), over the poster and under the depth layer / readability wash: four thin gold rings pulsing in turn, one slow searchlight swinging from a zero-size pivot on the bottom edge (VIP a little brighter). The poster and all other Royal Dark worlds are untouched.
- Wiring: `NexaEarth.tsx` gets a `leisure` variant (calm horizon kept); `NexaWorldBackground.tsx` maps world `leisure` to it, keeps the readability wash and 0.18 dim, mounts the dark layer only in Royal Dark for `leisure`.
- Same subscription motion rules: Free renders the same layers static, reduced motion wins, loops stop on unmount.
- Test: `server/v5_21_0_leisure_block.contract.test.js` (8 tests). Five older chain assertions (Zeeza, Sky Money, Dream Marketplace, Yaayz: the world-to-variant chain and the readability-wash / dim patterns) loosened only to allow the new `leisure` branch.
- No version bump (still 5.21.0, batch B57).

## Verification
- New tests 8/8 pass; all B57 tests (93) pass.
- Full `server/*.test.js`: 890 tests, 859 pass, 31 fail. Baseline on the untouched CP7 zip: 873 tests, 842 pass, 31 fail. The 31 failing test NAMES are identical (none new, none fixed).
- Syntax check (`tsc` transpile) of all 7 edited/new source files: clean.
- NOT verified: full type check and any device run (no `node_modules` here). How L.A. looks and moves in either interface is untested visually.

## Still open (not changed)
- `src/app/leisure.tsx` (old duplicate `/leisure` route with no world background) still waits for your OK to delete.

## Watch on device
- Earth Light: balloons sit in the top 8-16% of the sky, the pier is 52 px under the horizon left of centre. If a balloon lands behind the header or nav keys, change its entry in `BALLOONS`.
- Royal Dark: rings sit in the top 6-8%; the searchlight is 4.5% gold (6% VIP). If too faint or strong it is one colour value in `NexaDarkLeisure.tsx`.
- Activity cards: check title and description text still read well with the scene behind them in both interfaces.


---

# Checkpoint 10 — BALL HOUSE block (sealed)

Order rule from the owner: one block per checkpoint, from the top of the sidebar, each block in BOTH interfaces with the subscription motion tiers. Directory order is Home, Dami, Zeeza, Sky Money, Dream Marketplace, Yaayz, L.A., Ball House, Kitchen, Game House, Fitness, ... so Ball House is CP10. Next: Kitchen (CP11).

Scope of "Ball House block" = `/leisure/ball-house` (`src/app/leisure/ball-house/index.tsx`): league and state filters, date filter, Football now, upcoming fixtures, recent results, league table, Ball House arena tickets link, football news, refresh, back key. The L.A. hub (own world since CP9), Kitchen, Game House and Fitness get nothing here (asserted).

## What changed
- Design layer: all 15 plain inline `style` / `contentContainerStyle` objects now go through `ds()`. Wrapper-only, proved by reversing the edit against the previous file (identical). No colour literals in the file. No fetch, filter, request-guard, ticket-link or refresh logic touched. Array styles (`[s.card, {...}]`) take Earth Light shapes through the shared `s` sheet, as in the other blocks.
- Earth Light readability check: the active filter pill draws `deepBlack` (pale sky in Earth Light) on `goldBright` (water blue): 4.88:1, pinned by test (>= 4.5).
- Earth Light scene: `src/NexaEarthBall.tsx` (new). `EarthBallSky`: white football with dark patches and a gold rim arcing across the sky (10 s, up 50 px, spinning) with three fading trail dots (VIP: gold spark). `EarthBallWater`: floating pitch (six mown stripes, white lines, centre circle, two goals, brown float) bobbing gently with a floodlight pole at each end, gold lamps lighting in turn (VIP: soft halos). Native, never receive touches, faint.
- Royal Dark scene: `src/NexaDarkBall.tsx` (new), over the stadium poster and under the depth layer / readability wash: two gold floodlight beams angled in from the top corners (zero-size pivot on the corner), breathing in turn; one small gold ball on an arc every 10 s with two fading dots (VIP a little brighter). The poster and all other Royal Dark worlds are untouched.
- Wiring: `NexaEarth.tsx` gets a `ball` variant (calm horizon kept); `NexaWorldBackground.tsx` maps world `ball-house` to it, keeps the readability wash and 0.18 dim, mounts the dark layer only in Royal Dark for `ball-house`.
- Same subscription motion rules: Free renders the same layers static, reduced motion wins, loops stop on unmount.
- Test: `server/v5_21_0_ball_block.contract.test.js` (8 tests). Seven older chain assertions (Zeeza x2, Sky Money, Dream Marketplace, Yaayz, L.A. x2) loosened only to allow the new `ball` branch; the L.A. test still asserts the L.A. and Ball House layers never mount for each other's world.
- No version bump (still 5.21.0, batch B57).

## Verification
- New tests 8/8 pass; all B57 tests (101) pass.
- Full `server/*.test.js`: 898 tests, 867 pass, 31 fail. Baseline on the untouched CP7 zip: 873 tests, 842 pass, 31 fail. The 31 failing test NAMES are identical (none new, none fixed).
- Syntax check (`tsc` transpile) of all 5 edited/new source files: clean.
- NOT verified: full type check, any device run (no `node_modules` here), and live football / ticket data. How Ball House looks and moves in either interface is untested visually.

## Still open (not changed)
- `src/app/leisure.tsx` (old duplicate `/leisure` route) still waits for your OK to delete.

## Watch on device
- Earth Light: the ball flies about 20% down the sky; the pitch sits left of centre 40 px under the horizon. If either lands behind the header or a card edge, change `top` / `left` in `NexaEarthBall.tsx`.
- Royal Dark: beams are 5% gold (VIP a little brighter); the ball crosses at about 30% down. If too faint or strong it is one colour value in `NexaDarkBall.tsx`.
- Match cards: check league name, score and status text still read well with the scene behind them in both interfaces.


---

# Checkpoint 11 — KITCHEN block (sealed)

Order rule from the owner: one block per checkpoint, from the top of the sidebar, each block in BOTH interfaces with the subscription motion tiers. Directory order is Home, Dami, Zeeza, Sky Money, Dream Marketplace, Yaayz, L.A., Ball House, Kitchen, Game House, Fitness, ... so Kitchen is CP11. Ball House (CP10) was cross-checked first: its 8 tests still pass and nothing in it was edited. Next: Game House (CP12).

Scope of "Kitchen block" = `/leisure/kitchen` (`LeisureKitchenScreen`): menu with quantity keys, total, NEXA service fee preview, referral code / share / friend code, orders and AI receipts, verify order payment, retry NEXA service fee. Ball House, L.A., Game House and Fitness get nothing here (asserted by test). The referral landing route (`kitchen/ref/[code].tsx`) has no inline styles and no world background; it was left as is.

## What changed
- Design layer: all 9 plain inline `style` / `contentContainerStyle` objects in `LeisureKitchenScreen.tsx` now go through `ds()`. Wrapper-only, proved by reversing the edit against the previous file (byte-for-byte identical). No colour literals in the file. No fetch, request guard, fee-preview, payment, referral, receipt or retry logic touched. Array styles (`[s.card, {...}]`) take the Earth Light shapes through the shared `s` sheet, as in the other blocks.
- Earth Light readability check (pinned by test): button text on forest green 5.04:1, body text on card 15.8:1, muted text on card 6.0:1.
- Earth Light scene: `src/NexaEarthKitchen.tsx` (new). `EarthKitchenSky`: four soft white steam wisps with a gold rim rising, swaying and fading above the horizon (VIP: small gold spark beside one). `EarthKitchenWater`: a small kitchen boat (brown hull with gold stripe, white cabin with green roof and gold trim, brown chimney) bobbing on the water; three smoke puffs leave the chimney in turn and the two cabin windows glow gold (VIP: soft gold halo behind the windows). Native, never receive touches, faint.
- Royal Dark scene: `src/NexaDarkKitchen.tsx` (new), over the Kitchen poster and under the depth layer / readability wash: three warm gold heat-lamp glows across the top, lit in turn (left, middle, right, 9 s cycle), and four very faint gold steam wisps rising from the lower screen (VIP: a little brighter). The poster and all other Royal Dark worlds are untouched.
- Wiring: `NexaEarth.tsx` gets a `kitchen` variant (calm horizon kept). `NexaWorldBackground.tsx` maps world `kitchen` to it (it used the plain `calm` scene before), keeps the readability wash and 0.18 dim, and mounts the dark layer only in Royal Dark for `kitchen`.
- Same subscription motion rules: Free renders the same layers static, reduced motion wins, loops stop on unmount.
- Test: `server/v5_21_0_kitchen_block.contract.test.js` (8 tests). Seven older chain assertions (Zeeza x2, Sky Money, Dream Marketplace, Yaayz, L.A., Ball House) loosened only to allow the new `kitchen` branch; the Ball House test now only asserts Game House / Fitness get nothing.
- No version bump (still 5.21.0, batch B57).

## Verification
- New tests 8/8 pass; all B57 tests (109) pass.
- Full `server/*.test.js`: 906 tests, 875 pass, 31 fail. Baseline on the untouched CP10 zip: 898 tests, 867 pass, 31 fail. The 31 failing test NAMES are identical (none new, none fixed).
- Syntax check (`tsc` transpile) and undefined-name check of all 5 edited/new source files: clean (the only message is `encodeURIComponent`, a checker limitation: no type libraries here).
- NOT verified: full type check, any device run (no `node_modules` here), and the live Kitchen menu / fee / payment / receipt flows. How Kitchen looks and moves in either interface is untested visually.

## Still open (not changed)
- `src/app/leisure.tsx` (old duplicate `/leisure` route) still waits for your OK to delete.

## Watch on device
- Earth Light: steam wisps start about 46% down the sky and rise ~90 px; the kitchen boat sits right of centre, 36 px under the horizon. If either lands behind a card edge, change `WISPS` / `left` in `NexaEarthKitchen.tsx`.
- Royal Dark: heat lamps sit in the top 4-14%, glow 6% gold (VIP a little brighter); the steam is 7% gold. If too faint or strong it is one colour value in `NexaDarkKitchen.tsx`.
- Menu rows, cart total, fee text and order cards: check they still read well with the scene behind them in both interfaces.


---

# Checkpoint 12 — GAME HOUSE block (sealed)

Order rule from the owner: one block per checkpoint, from the top of the sidebar, each block in BOTH interfaces with the subscription motion tiers. Directory order is Home, Dami, Zeeza, Sky Money, Dream Marketplace, Yaayz, L.A., Ball House, Kitchen, Game House, Fitness, ... so Game House is CP12. Kitchen (CP11) was cross-checked first: its 8 tests still pass and nothing in it was edited. Next: Fitness (CP13).

Scope of "Game House block" = `/leisure/game-house` (`src/app/leisure/game-house/index.tsx`): Game House entry (Yaayz ticket link), featured games, community leaderboard note, "No livestreaming" note, back key. Kitchen, Ball House, L.A. and Fitness get nothing here (asserted by test).

## What changed
- Design layer: both plain inline `style` / `contentContainerStyle` objects now go through `ds()`. Wrapper-only, proved by reversing the edit against the previous file (byte-for-byte identical). No colour literals in the file. No ticket link, game list, honest-data notes or back key touched. Array styles (`[s.card, {...}]`) take the Earth Light shapes through the shared `s` sheet, as in the other blocks.
- Earth Light readability check (pinned by test): featured game names (water blue) on card 5.18:1, button text on forest green 5.04:1, body text 15.8:1, muted text 6.0:1.
- Earth Light scene: `src/NexaEarthGame.tsx` (new). `EarthGameSky`: three little puzzle pieces (four blocks each: green, water blue, gold) drifting down the sky and fading one after another (VIP: small gold spark by the gold piece). `EarthGameWater`: a small game raft (white controller with gold cross pad and four round buttons, brown float with gold stripe) bobbing on the water; the four buttons light in turn (VIP: soft gold halo on the lit button). Native, never receive touches, faint.
- Royal Dark scene: `src/NexaDarkGame.tsx` (new), over the Game House poster and under the depth layer / readability wash: three very faint gold puzzle pieces drifting down and fading, and a diamond of four gold controller-button glows near the top right, lit in turn (VIP: a little brighter). Poster and all other Royal Dark worlds untouched.
- Wiring: `NexaEarth.tsx` gets a `game` variant (calm horizon kept). `NexaWorldBackground.tsx` maps world `game-house` to it (it used the plain `calm` scene before), keeps the readability wash and 0.18 dim, and mounts the dark layer only in Royal Dark for `game-house`.
- Self-check on my own code: the first draft of the button ramps spaced the four buttons 0.25 apart, so button 4's ramp ended `... 1, 1` (not strictly ascending). The new test caught it; spacing is now 0.24 in both scenes.
- Same subscription motion rules: Free renders the same layers static, reduced motion wins, loops stop on unmount.
- Test: `server/v5_21_0_game_block.contract.test.js` (8 tests). Eight older chain assertions (Zeeza x2, Sky Money, Dream Marketplace, Yaayz, L.A., Ball House, Kitchen) loosened only to allow the new `game` branch; the Ball House and Kitchen tests no longer forbid `game-house` in the world background and now only assert Fitness gets nothing.
- No version bump (still 5.21.0, batch B57).

## Verification
- New tests 8/8 pass; all B57 tests (117) pass.
- Full `server/*.test.js`: 914 tests, 883 pass, 31 fail. Baseline on the untouched CP10 zip: 898 tests, 867 pass, 31 fail. The 31 failing test NAMES are identical (none new, none fixed).
- Syntax check (`tsc` transpile) and undefined-name check of all 5 edited/new source files: clean.
- NOT verified: full type check, any device run (no `node_modules` here). How Game House looks and moves in either interface is untested visually.

## Still open (not changed)
- `src/app/leisure.tsx` (old duplicate `/leisure` route) still waits for your OK to delete.

## Watch on device
- Earth Light: pieces start 6-12% down the sky and fall about a third of the screen; the game raft sits left of centre, 44 px under the horizon. If either lands behind the header or a card edge, change `PIECES` / `left` in `NexaEarthGame.tsx`.
- Royal Dark: pieces are 10% gold with a thin frame, the button diamond sits at about 84% across, 7% down (behind the header on tall notches: change `left` / `top` in `NexaDarkGame.tsx`). If too faint or strong it is one colour value.
- Featured game cards and the Yaayz ticket box: check text still reads well with the scene behind them in both interfaces.


---

# Checkpoint 13 — FITNESS block (sealed)

Order rule from the owner: one block per checkpoint, from the top of the sidebar, each block in BOTH interfaces with the subscription motion tiers. Directory order is Home, Dami, Zeeza, Sky Money, Dream Marketplace, Yaayz, L.A., Ball House, Kitchen, Game House, Fitness, Notifications, Search, Profile, ... so Fitness is CP13 and the last of the L.A. family. Game House (CP12) was cross-checked first: its 8 tests still pass and nothing in it was edited. Next: Notifications (CP14).

Scope of "Fitness block" = `/leisure/fitness` (`src/app/leisure/fitness/index.tsx`): Fitness library (three PDF guides), Gym wear (Dream Marketplace link), Find a gym (city search), Register an offline gym, back key. Kitchen, Game House, Ball House and L.A. get nothing here (asserted by test).

## What changed
- Design layer: all 4 plain inline `style` / `contentContainerStyle` objects now go through `ds()`. Wrapper-only, proved by reversing the edit against the previous file (byte-for-byte identical). No colour literals in the file. No request guard, gym search, registration, PDF sharing, marketplace link or back key touched. Array styles (`[s.card, {...}]`, `[s.smallButton, {...}]`, `[s.targetInput, {...}]`) take the Earth Light shapes through the shared `s` sheet, as in the other blocks.
- Earth Light readability check (pinned by test): guide / gym names (water blue) on card 5.18:1, button text on forest green 5.04:1, body 15.8:1, muted 6.0:1, and, because this screen has text inputs, typed text on the input background 14.07:1 and placeholder text 5.34:1.
- Earth Light scene: `src/NexaEarthFitness.tsx` (new). `EarthFitnessSky`: three little dumbbells (gold bar, green / water-blue / gold plates) lifting in turn like a set of reps (VIP: small gold spark above the middle one). `EarthFitnessWater`: a small rowing boat (brown hull with gold stripe, white rower) bobbing on the water; two oars swing from zero-size pivots at the hull sides; a soft wake trails behind (VIP: gold pennant on the stern). Native, never receive touches, faint.
- Royal Dark scene: `src/NexaDarkFitness.tsx` (new), over the Fitness poster and under the depth layer / readability wash: three faint gold dumbbell outlines lifting in turn across the top, and one gold heartbeat ring near the top left doing a lub-dub double pulse every 2.4 s (VIP: a little brighter). Poster and all other Royal Dark worlds untouched.
- Wiring: `NexaEarth.tsx` gets a `fitness` variant (calm horizon kept). `NexaWorldBackground.tsx` maps world `fitness` to it (it used the plain `calm` scene before), keeps the readability wash and 0.18 dim, and mounts the dark layer only in Royal Dark for `fitness`.
- Same subscription motion rules: Free renders the same layers static, reduced motion wins, loops stop on unmount.
- Test: `server/v5_21_0_fitness_block.contract.test.js` (8 tests). Eight older chain assertions (Zeeza x2, Sky Money, Dream Marketplace, Yaayz, L.A., Ball House, Kitchen, Game House) loosened only to allow the new `fitness` branch. The three old lines that said "Fitness gets nothing from this checkpoint" (Ball House, Kitchen, Game House tests) were removed because Fitness now has its own block; each of those tests still asserts the other blocks' layers never mount for their own world.
- No version bump (still 5.21.0, batch B57).

## Verification
- New tests 8/8 pass; all B57 tests (125) pass.
- Full `server/*.test.js`: 922 tests, 891 pass, 31 fail. Baseline on the untouched CP10 zip: 898 tests, 867 pass, 31 fail. The 31 failing test NAMES are identical (none new, none fixed).
- Syntax check (`tsc` transpile) and undefined-name check of all 5 edited/new source files: clean (only `encodeURIComponent`, a checker limitation: no type libraries here).
- NOT verified: full type check, any device run (no `node_modules` here), live gym search / registration, and opening the PDF guides on a device. How Fitness looks and moves in either interface is untested visually.

## Still open (not changed)
- `src/app/leisure.tsx` (old duplicate `/leisure` route) still waits for your OK to delete.

## Watch on device
- Earth Light: dumbbells sit in the top 9-15% of the sky and lift 16 px; the rowing boat is right of centre, 34 px under the horizon. If either lands behind the header or a card edge, change `BELLS` / `left` in `NexaEarthFitness.tsx`.
- Royal Dark: dumbbells are 6-12% gold at about 10% down; the heartbeat ring is at 8% across, 22% down and may sit behind the title on some phones (change `left` / `top` in `NexaDarkFitness.tsx`).
- Library cards, the gym search box and the registration form: check text and typed input still read well with the scene behind them in both interfaces.


---

# Checkpoint 14 — HOME block, Royal Dark scene (sealed)

Owner asked to cross-check CP13 (Fitness) and then keep the order from the top of the sidebar without redoing finished work. Cross-check result: Fitness passes (125 B57 tests). Audit from the top found that Home, Dami and Zeeza have an Earth Light scene but **no Royal Dark scene of their own** (Sky Money to Fitness have both). One block per checkpoint, so this checkpoint is **Home only**. Next: Dami dark scene (CP15), then Zeeza dark scene (CP16), then Notifications.

## What changed
- `src/NexaDarkHome.tsx` (new): native, decorative layer over the Royal Dark cosmos (Home has no poster), under the depth layer and readability wash. Two thin gold shooting streaks crossing the upper sky in turn (12 s), five gold command nodes twinkling in turn along an arc (7 s), one gold beacon ring pulsing on the horizon centre (2.6 s; echo of the Earth Light skyline beacon). VIP: brighter gold. Free: same layer static. Reduced motion wins. Loops stop on unmount. Never receives touches.
- `src/NexaWorldBackground.tsx`: mounts it only for `!light && world === 'home'`.
- `HomeCommandCenter.tsx`: its 3 remaining inline styles are pure layout/animation (translateX, marginTop, flex), so `ds()` would change nothing; left as is (pinned by test).
- Test: `server/v5_21_0_home_dark_block.contract.test.js` (8 tests).
- Royal Dark cosmos, Earth Light Home, Dami robot and all other blocks untouched. No version bump (5.21.0, B57).

## Self-check on my own code
First draft of the node twinkle ramp began with 0 and 0 for the first node (not strictly ascending). Offset by 0.02; the test now checks all five nodes.

## Verification
- New tests 8/8 pass; all B57 tests 133/133 pass.
- Full `server/*.test.js`: 930 tests, 899 pass, 31 fail. Previous seal: 922 / 891 / 31. Same 31 failing, none new.
- Syntax check (`tsc` transpile) of both edited files: clean.
- NOT verified: full type check, any device run (no `node_modules`). How the Home dark layer looks is untested visually.

## Watch on device
- Nodes sit in the top 10-20% of the screen; the beacon is at the horizon centre (60% down). If a node lands behind the header, change `NODES`. If too faint or strong, it is the alpha in `NexaDarkHome.tsx`.
- Check the beacon ring does not clash with the Home Dami robot or the rails.


---

# Checkpoint 15 — DAMI block, Royal Dark scene (sealed)

Order rule: from the top of the sidebar, one block per checkpoint. Home dark scene was CP14; Dami is second in the directory, so its Royal Dark scene is CP15 (its Earth Light scene and design layer were CP4, untouched). Next: Zeeza dark scene (CP16), then Notifications.

## What changed
- `src/NexaDarkDami.tsx` (new): native, decorative layer over the Royal Dark Dami cosmos (no poster), under the depth layer and readability wash. Five small gold thought-sparks orbiting the header Dami robot (ring turns once per 26 s, same robot point as Earth Light: x 58, y 70); three faint gold listening ripples spreading across the cosmos water (6 s, same horizon 50% + 46 px); four gold motes floating up. VIP: brighter gold plus one thin outer ring round the robot. Free: same layer static. Reduced motion wins. Loops stop on unmount. Never receives touches.
- `src/NexaWorldBackground.tsx`: mounts it only for `!light && world === 'dami'`.
- `NexaAI.tsx` and all chat / confirm-flow logic untouched (its inline styles were already wrapped in CP4). Royal Dark cosmos, robot, Earth Light Dami and every other block untouched. No version bump (5.21.0, B57).
- Test: `server/v5_21_0_dami_dark_block.contract.test.js` (7 tests).

## Verification
- New tests 7/7 pass; all B57 tests pass (see totals below).
- Syntax check (`tsc` transpile) of both edited files: clean.
- NOT verified: full type check, any device run (no `node_modules`). How the Dami dark layer looks is untested visually.

## Watch on device
- Orbit radius is 64 px round (58, 70); if your phone's safe area moves the header robot, change `HALO_CX` / `HALO_CY` in `NexaDarkDami.tsx` (same numbers as Earth Light).
- Ripples sit under the horizon behind the chat bubbles and input bar: check they stay faint enough. Alpha is in the `opacity` ramp.


---

# Checkpoint 16 + 17 — ZEEZA dark scene and NOTIFICATIONS block (sealed, two blocks in one checkpoint)

Owner asked to do both remaining items in one go. Order stays from the top of the sidebar: Zeeza (3rd) then Notifications (12th, right after Fitness). Home dark = CP14, Dami dark = CP15. Next: Search (CP18), then Profile.

## CP16 — Zeeza, Royal Dark scene
- `src/NexaDarkZeeza.tsx` (new): over the Zeeza poster, under the depth layer / readability wash. Four thin gold chat-bubble outlines drifting up and down, one showing three typing dots pulsing in turn, two linked gold rings drifting together near the bottom ("friends first"). VIP: brighter gold plus a small gold spark by the typing bubble. Same bubble positions as the Earth Light scene.
- Mounted only for `!light && world === 'zeeza'`. Search and Profile use the separate `profile` world (same poster) and get nothing (asserted).
- Zeeza screens, calls, messaging and Earth Light Zeeza untouched.

## CP17 — Notifications block (both interfaces)
- Before: the Notification Center (Directory -> Notifications, on Home) rendered on a bare screen with no world. Now `src/app/(tabs)/index.tsx` wraps it in `NexaWorldBackground world="notifications"`. Home branch, deep-link (`panel=notifications`), notification action authority (`/api/notifications/:id/action`) and all Notification Center logic untouched.
- New world `notifications` (`nexaWorlds.ts`): no poster, not cosmos, own prompt entry, so nothing leaks to Zeeza / Profile / Search.
- Design layer: all 8 plain inline `style` / `contentContainerStyle` objects in `NotificationCenter.tsx` go through `ds()` (wrapper-only; no colour literal or handler changed; colours already in `tc()`).
- Royal Dark: `src/NexaDarkNotifications.tsx` (new). One gold bell upper right swinging from a zero-size pivot with a faint ring pinging out as it rings (4.2 s), three gold badge dots blinking in turn down the left edge. Royal Dark base stays plain black (it was before) with the depth layer and readability wash.
- Earth Light: `src/NexaEarthNotifications.tsx` (new). `EarthNotificationsSky`: three small white envelopes with a gold seal arriving one after another (drift down, fade), VIP gold spark. `EarthNotificationsWater`: a bell buoy (brown/white float, mast, gold bell swinging from a zero-size pivot, gold lamp) bobbing on the water with two sound rings spreading; VIP gold halo on the lamp. `NexaEarth.tsx` gets a `notifications` variant.
- `NexaWorldBackground.tsx`: the `notifications` branch is added at the FRONT of the world-to-variant chain and of the readability / dim conditions, so every older test that pins the tail of those chains still matches. Readability wash + 0.18 dim kept in Earth Light.
- Same subscription motion rules everywhere: Free renders the same layers static, reduced motion wins, loops stop on unmount, nothing receives touches.

## Tests
- `server/v5_21_0_zeeza_notifications_dark.contract.test.js` (13 tests): sidebar order, single-world mounting for all 12 dark layers, world isolation, ds() coverage and logic preserved on Notification Center, Earth Light wiring and chain tails, zero-size bell pivots, ramp checks.
- One older assertion loosened only to allow the new variant: the `EarthVariant` union pin in the CP5 Zeeza test now accepts a trailing `| 'notifications'`.

## Self-checks on my own code
- First draft of the buoy sound-ring ramp used a 0.5 window, so ring 2 ended `..., 1.0, 1` (not ascending). Now 0.4, pinned by test.
- First draft of my "untouched" assertions matched header comments that mention the sibling scene; changed to import checks.

## Verification
- New tests 13/13; all B57 tests 153/153.
- Full `server/*.test.js`: 950 tests, 919 pass, 31 fail. The 31 failing test NAMES are identical to the uploaded CP13 zip (compared by name: none new, none fixed).
- Syntax check (`tsc` transpile) of all 9 edited/new source files: clean.
- NOT verified: full type check, any device run (no `node_modules`), live notifications API. How the Zeeza dark layer, the Notifications layers and the wrapped Notification Center look and move is untested visually.

## Watch on device
- Notifications Royal Dark: the bell sits at 78% across, 7.5% down; the Close button is top right, so check the bell does not clash with it (change `bellX` / `bellY` in `NexaDarkNotifications.tsx`).
- Notifications Earth Light: envelopes sit in the top 6-13%; the buoy is at 60% across, 34 px under the horizon, behind the cards. Change `MAIL` / `bx` in `NexaEarthNotifications.tsx` if any lands behind a card edge.
- Zeeza Royal Dark: bubble outlines are 30% gold on a 4% fill; the linked rings sit at 30% across, 80% down. Check text on Inbox / Friends / Chase still reads.
- Notification cards: read/unread text and the filter pills in both interfaces with the new background behind them.

## Still open (not changed)
- `src/app/leisure.tsx` (old duplicate `/leisure` route) still waits for your OK to delete.


---

# Checkpoint 17 addendum — duplicate `/leisure` route removed (owner OK)

Owner gave the OK that every checkpoint since CP6 had asked for.
- Deleted `src/app/leisure.tsx` (a bare copy of the L.A. screen with no world background). `/leisure` is served by `src/app/(tabs)/leisure.tsx`, which sits inside the `leisure` world and is the route the L.A. tests already cover. Nothing else imported the deleted file; the only link to `/leisure` in `src` (`nexaNavKeys.ts`, `YaayzScreen.tsx`) is a URL, not a file import.
- One older test edited: `server/v4_93_0_batch_b28.test.js` test 141 read the deleted file. Same intent (no stale relative import), now pointed at the tab route and also asserts the duplicate is gone.
- Verification: B57 tests 153/153; full `server/*.test.js` 950 tests, 919 pass, 31 fail, failing names identical to the uploaded CP13 zip.
- NOT verified: opening `/leisure` on a device (no `node_modules` here). If Expo Router shows a warning about a missing route, tell me the exact text.


---

# Checkpoint 18 — SEARCH block (sealed)

Order rule from the owner: one block per checkpoint, from the top of the sidebar, each block in BOTH interfaces with the subscription motion tiers. Directory order is Home, Dami, Zeeza, Sky Money, Dream Marketplace, Yaayz, L.A., Ball House, Kitchen, Game House, Fitness, Notifications, Search, Profile, ... so Search is CP18 (Notifications was CP17). Nothing from Home to Notifications was redone. Next: Profile (CP19).

Scope of "Search block" = the Search tab (`/(tabs)/search`, `UnifiedSearch`): title and Close key, search box, filter pills, grouped result cards, "No authorized results found.", error text. Profile gets nothing here (asserted).

## What changed
- World separation: Search shared the `profile` world with Profile. Putting Search layers on that world would have leaked into Profile, so Search now has its own world `search` (`nexaWorlds.ts`) using the SAME poster (`zeeza_world.jpg`), plus its own prompt entry. Royal Dark Search keeps its picture; Profile is untouched.
- Design layer: all 21 plain inline `style` / `contentContainerStyle` objects in `UnifiedSearch.tsx` now go through `ds()`. Wrapper-only, proved by reversing the edit (and the two changes below) against the previous file: byte-for-byte identical. No fetch, stale-response guard, filter, result-navigation or authorization logic touched.
- Scene visibility: the screen's root `View` painted a solid `theme.colors.background`, which hid the world scene. It is now transparent (same fix CP6 made on Money views). VISIBLE CHANGE IN ROYAL DARK TOO: Search now shows the poster + magnifier layer behind the cards, as the other blocks already do.
- BUG FIX (Earth Light readability): Search drew its "Close" key, the section labels (ZEEZA / GROUPS / ...), "TAP TO OPEN" and the ACTIVE filter pill with `theme.colors.gold`, which is real gold in Earth Light: 2.3-2.4:1 on the pale page and cards (and white text on the gold pill 2.4:1). Added token `goldText` in both palettes: Royal Dark `#D4AF37` (exactly the old gold, so nothing changes there), Earth Light `#1A70B8` (water blue: 4.9-5.2:1; white on it 5.2:1). Used in the four places above. Same approach as CP5's `onSolid`. `theme.ts` palettes keep identical key sets (CP1 test passes).
- Earth Light scene: `src/NexaEarthSearch.tsx` (new). `EarthSearchSky`: white-glass magnifying glass (gold rim, brown handle) drifting slowly across the upper sky, a glint blinking on the lens (VIP: small gold spark). `EarthSearchWater`: lighthouse (brown rock, white tower with gold band, gold lamp) at the right; a soft gold beam sweeps from a zero-size pivot at the lamp (VIP: gold halo round the lamp). Native, never receive touches, faint.
- Royal Dark scene: `src/NexaDarkSearch.tsx` (new), over the poster and under the depth layer / readability wash: one thin gold magnifying glass drifting across the upper area with a faint ring pinging out of the lens, three small gold result dots blinking in turn down the right edge (VIP: a little brighter).
- Wiring: `NexaEarth.tsx` gets a `search` variant (calm horizon kept). `NexaWorldBackground.tsx` maps world `search` to it, keeps the readability wash and 0.18 dim, mounts the dark layer only in Royal Dark for `search`. `src/app/(tabs)/search.tsx` now uses `world="search"`.
- Same subscription motion rules: Free renders the same layers static, reduced motion wins, loops stop on unmount.
- Test: `server/v5_21_0_search_block.contract.test.js` (10 tests). Four older assertions loosened only to allow the new branch: the `calm || zeeza` adjacency (Zeeza x1, Sky Money x1), the `EarthVariant` union (Zeeza x1), and the CP16 test that said Search sits on the `profile` world (now: Search on `search`, Profile on `profile`, neither gets the other's layer).
- No version bump (still 5.21.0, batch B57).

## Self-check on my own work
- My first wrapping script dropped the inner braces of each style object (it would have produced `style={ds(flex:1,...)}`). Caught before any test ran, restored from the original, redone, and the reverse-edit proof above is what confirms the final file.
- First draft of the CP18 readability test sliced the Royal Dark palette from a name that does not exist in `theme.ts`; fixed to read everything above the Earth Light palette.

## Verification
- New tests 10/10 pass; all B57 tests (163) pass.
- Full `server/*.test.js`: 960 tests, 929 pass, 31 fail. Baseline on the untouched uploaded zip: 950 tests, 919 pass, 31 fail. The 31 failing test NAMES are identical (compared by name: none new, none fixed).
- Syntax check (`tsc` transpile) of all 8 edited/new source files: clean.
- NOT verified: full type check, any device run (no `node_modules` here), and live search results against the server. How Search looks and moves in either interface is untested visually.

## Watch on device
- Earth Light: the magnifier flies about 11% down the sky and drifts across half the screen; the lighthouse is at 82% across, 24 px under the horizon, behind the lists. If the magnifier lands behind the title or Close key, change `top` in `EarthSearchSky`; if the lighthouse clashes with a card edge, change `lx` in `EarthSearchWater`.
- Royal Dark: the magnifier flies about 10% down; the result dots sit at 94% across, 30-46% down and may touch a card edge on narrow phones (change `HITS`). If too faint or strong, it is one alpha each in `NexaDarkSearch.tsx`.
- Search box, filter pills (active one is now water blue in Earth Light), result cards and the empty / error text: check they read well with the scene behind them in both interfaces.


---

# Checkpoint 19 — PROFILE block (sealed)

Order rule from the owner: one block per checkpoint, from the top of the sidebar, each block in BOTH interfaces with the subscription motion tiers. Directory order is ... Notifications, Search, Profile, Extensions, Developer Console, so Profile is CP19 (Search was CP18). Nothing from Home to Search was redone. Next: Extensions (CP20), then Developer Console.

Scope of "Profile block" = the Profile tab (`/(tabs)/profile`): Profile & Settings title, NEXA workspace card, Appearance switch (`ThemePicker`), Membership / Extensions / Developer Console link cards, Sessions list with "Sign out other sessions", Sign out. Extensions and Developer Console screens are their own sidebar blocks and get nothing here.

## What changed
- Design layer: the 4 plain inline `style` / `contentContainerStyle` objects in `profile.tsx` and 5 in `ThemePicker.tsx` (radio group, tile frame, label row, title, sub-label) now go through `ds()`. Wrapper-only, proved by reversing the edit against the previous files (import line aside): both byte-for-byte identical. Left raw on purpose and pinned by test: the 7-piece mini-preview drawing in the picker (a preview of the OTHER interface must not change with the active one) and one pure-layout `{ flex: 1 }` wrapper where `ds()` would change nothing. No session, revoke, sign-out, navigation or theme-switch logic touched; the radio-group accessibility roles and 48 px tile height are pinned.
- Earth Light readability check (pinned by test): titles / muted copy on card, picker title + sub-label on the tile, red sign-out text on card, all >= 4.5:1; selected checkmark / frame (water blue on the tile) >= 3:1 as a graphic.
- Earth Light scene: `src/NexaEarthProfile.tsx` (new). `EarthProfileSky`: two white-glass gear rings with gold teeth meshing in the upper right, turning in opposite directions (VIP: small gold spark). `EarthProfileWater`: a small harbour cottage on a pier (brown walls, forest-green roof, gold window glowing, gold flag swaying from a zero-size pivot at the top of the pole), bobbing gently (VIP: soft halo behind the window). Native, never receive touches, faint.
- Royal Dark scene: `src/NexaDarkProfile.tsx` (new), over the poster and under the depth layer / readability wash: two thin gold gear outlines turning in opposite directions in the upper right, one thin gold shield outline (with a keyhole) low on the left, breathing, and three small gold session dots blinking in turn down the right edge (VIP: a little brighter).
- Wiring: `NexaEarth.tsx` gets a `profile` variant. Profile used the plain `calm` scene before. To keep every older chain pin intact, the profile branch is added at the FRONT of the world-to-variant chain in `NexaWorldBackground.tsx`, the readability wash is extended with an outer `|| (light && earthVariant === 'profile')`, and the 0.18 dim for Profile is applied inside `NexaEarth` (`variant === 'profile' ? Math.max(dim, 0.18) : dim`). `NexaWorldBackground.tsx` mounts the dark layer only in Royal Dark for `profile`.
- Same subscription motion rules: Free renders the same layers static, reduced motion wins, loops stop on unmount.
- Test: `server/v5_21_0_profile_block.contract.test.js` (10 tests). Four older assertions loosened only to allow the new branch: the `EarthVariant` union (Zeeza x1, Search x1), and two lines that said Profile gets no layer of its own (the CP16 Zeeza test now asserts Profile never gets the ZEEZA layer; the CP18 Search test asserts Search never gets the Profile layer).
- No version bump (still 5.21.0, batch B57).

## Self-check on my own work
- My first Profile test counted 7 raw styles in `ThemePicker`; the file has 8 (the extra one is the `{ flex: 1 }` layout wrapper). Corrected the test and documented why that one is left raw.

## Verification
- New tests 10/10 pass; all B57 tests (173) pass.
- Full `server/*.test.js`: 970 tests, 939 pass, 31 fail. Baseline on the untouched uploaded zip: 950 / 919 / 31. The 31 failing test NAMES are identical (compared by name: none new, none fixed).
- Syntax check (`tsc` transpile) of all 6 edited/new source files: clean.
- NOT verified: full type check, any device run (no `node_modules` here), live sessions / sign-out against the server, and the Appearance switch on a device (the CP1 note still applies: switching resets the back stack). How Profile looks and moves in either interface is untested visually.

## Watch on device
- Earth Light: the gears sit about 10% down at 74% across and turn slowly; the cottage is 20% across, 30 px under the horizon, behind the cards. If the gears land behind the title or a card edge, change `gx` / `gy` in `EarthProfileSky`; for the cottage change `cx` in `EarthProfileWater`.
- Royal Dark: gears at 78% across, 9% down; shield at 8% across, 80% down (may sit behind the Sign out card); dots at 95% across, 50-66% down. All are faint; if too faint or strong it is one alpha each in `NexaDarkProfile.tsx`.
- Appearance tiles, session rows and the Sign out card: check they read well with the scene behind them in both interfaces.


---

# Checkpoint 20 - EXTENSIONS block (sealed)

Order rule from the owner: one block per checkpoint, from the top of the sidebar, each block in BOTH interfaces with the subscription motion tiers. Directory order is ... Search, Profile, Extensions, Developer Console, so Extensions is CP20 (Profile was CP19). Nothing from Home to Profile was redone. Next: Developer Console (CP21), the last sidebar block.

Scope of "Extensions block" = the Extensions screen (`src/ExtensionsScreen.tsx`, route `/extensions`): register form, extension cards (status pill, compatibility line, permission pills, consent / enable / edit / audit / revoke keys, edit form, audit list). Developer Console is its own sidebar block and gets nothing here.

## What changed
- World: Extensions had NO world before (plain screen). It now sits inside its own world `extensions` (`nexaWorlds.ts`). No poster on purpose, like Notifications, so Royal Dark keeps its plain black look and gets only the new native layer; nothing can leak to Profile or Notifications.
- Design layer: all 16 plain inline `style` objects in `ExtensionsScreen.tsx` go through `ds()`. Wrapper-only, proved by reversing the edit (import line, world wrapper and the 16 wrappers) against the previous file: byte-for-byte identical. Register, consent, enable / disable, revoke (with its confirm alert), edit, audit and back logic untouched. Every colour literal was already in `tc()`, pinned by test.
- Earth Light scene: `src/NexaEarthExtensions.tsx` (new). `EarthExtensionsSky`: three white-glass module tiles with gold rims in the upper right, joined by thin gold links, a small gold pulse travelling along the links (VIP: soft gold halo on the middle tile). `EarthExtensionsWater`: a small module barge (brown hull with gold rail, three module blocks in forest green, water blue and gold lighting in turn like permissions being granted, mast with a gold lamp), bobbing gently (VIP: halo round the lamp). Native, never receive touches, faint.
- Royal Dark scene: `src/NexaDarkExtensions.tsx` (new), under the depth layer / readability wash: three thin gold module outlines joined by thin gold links with one small gold pulse travelling, and three small gold permission switches down the right edge whose knobs slide across in turn (VIP: a little brighter).
- Wiring: `NexaEarth.tsx` gets an `extensions` variant. As in CP19, the branch is added at the FRONT of the world-to-variant chain in `NexaWorldBackground.tsx`, the readability wash gets `(light && (profile || extensions))`, and the 0.18 dim is applied inside `NexaEarth`. The dark layer mounts only in Royal Dark for `extensions`.
- Same subscription motion rules: Free renders the same layers static, reduced motion wins, loops stop on unmount.
- Test: `server/v5_21_0_extensions_block.contract.test.js` (9 tests). Five older assertions loosened only to allow the new branch (the `EarthVariant` union in Zeeza, Search and Profile tests, the Profile chain / dim / readability pins, and the CP6 import-guard now accepts `ds` in the Extensions import).
- No version bump (still 5.21.0, batch B57).

## Verification
- New tests 9/9 pass; all B57 tests (182) pass.
- Full `node --test server/*.test.js` from the project root: 979 tests, 948 pass, 31 fail. Baseline on the untouched uploaded zip: 970 / 939 / 31. The 31 failing test NAMES are identical (compared by name: none new, none fixed).
- Syntax check (`tsc` transpile) of the 6 edited/new source files: clean.
- NOT verified: full type check, any device run (no `node_modules` here), live extension calls against the server, and how the Extensions screen looks and moves in either interface (untested visually).

## Watch on device
- Earth Light: the module tiles sit about 9-23% down at 66-84% across (they may touch the "Add" key at the top right; change `P` in `EarthExtensionsSky`); the barge is at 60% across, 26 px under the horizon, behind the cards (change `bx` in `EarthExtensionsWater`).
- Royal Dark: module outlines at 70-86% across, 10-23% down (same "Add" key caution); the three switches at 90% across, 50-66% down may touch a card edge (change `SWITCHES`). All faint; one alpha each in `NexaDarkExtensions.tsx`.
- Register form inputs, permission pills, the "Consent required" line and the audit list: check they read well with the scene behind them in both interfaces.


---

# Checkpoint 21 - DEVELOPER CONSOLE block (sealed) - LAST SIDEBAR BLOCK

Directory order ends ... Profile, Extensions, Developer Console (16 entries). Developer Console is CP21, so the one-block-per-checkpoint sweep of the sidebar is COMPLETE (Home CP2 through Developer Console CP21). Nothing from Home to Extensions was redone.

Scope = the Developer Console screen (`src/ExtensionDeveloperScreen.tsx`, route `/developer`): manifest validation, capabilities, extension list, API identities and key creation, audit.

## What changed
- World: Developer Console had NO world before. It now sits inside its own world `developer` (`nexaWorlds.ts`, no poster, own prompt), so Royal Dark keeps its plain black look plus the new native layer and nothing leaks to Extensions / Profile / Notifications.
- Design layer: all 18 plain inline `style` objects go through `ds()`. Wrapper-only, proved by reversing the edit against the previous file: byte-for-byte identical. Manifest validation, API key creation (key shown once in the alert, never stored or logged), identities, audit and back logic untouched. No bare colour literals (pinned).
- Earth Light scene: `src/NexaEarthDeveloper.tsx` (new). Sky: a white-glass code window (gold rim, three little dots) upper right, three code lines lighting in turn and a blinking gold cursor (VIP: gold spark). Water: a small workshop on a pier (brown walls, green roof, gold window glowing) with a gold key swinging from a zero-size pivot over the door, bobbing gently (VIP: halo on the window).
- Royal Dark scene: `src/NexaDarkDeveloper.tsx` (new): thin gold code window with three lines lighting in turn and a cursor, one thin gold key outline low on the left breathing, three small gold request dots blinking in turn down the right edge (VIP: a little brighter).
- Wiring as in CP19 / CP20: `developer` variant in `NexaEarth.tsx`, branch at the front of the variant chain, readability wash and 0.18 dim extended, dark layer mounted only in Royal Dark for `developer`.
- Same subscription motion rules: Free static, reduced motion wins, loops stop on unmount.
- Test: `server/v5_21_0_developer_block.contract.test.js` (9 tests). Older pins loosened only to allow the new branch (Profile x4, Search x2, Zeeza x1, Extensions CP20 x5, CP6 import guard now accepts `ds` in the Developer import).
- No version bump (still 5.21.0, batch B57).

## Verification
- New tests 9/9; all B57 tests 191/191 pass.
- Full `node --test server/*.test.js` from the root: 988 tests, 957 pass, 31 fail. Untouched-zip baseline (run the same way): 970 / 939 / 31. The 31 failing test NAMES are identical (none new, none fixed).
- Syntax check (`tsc` transpile) of the 6 edited/new source files: clean.
- NOT verified: full type check, any device run (no `node_modules` here), live manifest / API-key calls against the server, and how the screen looks and moves in either interface.

## Watch on device
- Earth Light: code window at 66% across, 8% down (may touch the back key or title at the top; change `lx` / `ly` in `EarthDeveloperSky`); workshop at 14% across, 30 px under the horizon, behind the cards (`cx` in `EarthDeveloperWater`).
- Royal Dark: window at 68% across, 8% down; key at 8% across, 80% down (may sit behind the last card); dots at 95% across, 50-66% down. All faint; one alpha each in `NexaDarkDeveloper.tsx`.
- Manifest text box, capability list and API-key rows: check they read well over the scene in both interfaces.

## Sidebar sweep status
All 16 directory entries are done in both interfaces. Still NOT visually verified on a device anywhere in B57. Screens outside the directory (Wallet, Subscription, Staff, Group and call screens) were handled inside their parent blocks or were not in scope.
