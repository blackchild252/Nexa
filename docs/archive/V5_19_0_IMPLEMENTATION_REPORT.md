# NEXA V5.19.0 / B55 — Navigation Keys Everywhere

## Problems found in V5.18.0
1. **Home crash risk** — `HomeCommandCenter` rendered `{media}` (undefined variable) inside the call sheet and called `Alert` without importing it.
2. **Menu only on Home** — the NEXA directory could only be opened from Home. Every other screen had no menu key.
3. **Dead ends** — Ball House, Kitchen, Yaayz, L.A., Dream Marketplace, Zeeza etc. had no Back key; several screens used `router.back()`, which silently does nothing after a push-notification tap or deep link.
4. **Dead Search key** — the Search screen's close/back key was `onClose={() => {}}`.
5. **Stray 8th tab** — `search.tsx` sat inside `(tabs)` without being declared, so it was auto-added to the tab bar as an unlabeled 8th tab.
6. **Notifications directory row** just re-opened Home instead of the Notification Center.

## What changed
- `src/nexaNavKeys.ts` (new, pure logic): where the bar shows, titles, active-menu detection, never-dead-end back decision.
- `src/NexaNavKeys.tsx` (new): global bar (Back · title · Search · Home · Menu, 44px targets, safe-area aware), shared directory drawer with active-row highlight, `nexaGoBack()` / `nexaGoHome()`.
- `src/app/_layout.tsx`: wraps the existing Stack in `NexaNavProvider` (provider order `AuthProvider > MotionProvider` unchanged).
- Bar is hidden on Home, Dami, calls and auth screens (they own their chrome).
- `(tabs)/_layout.tsx`: `search` hidden from the tab bar (`href:null`).
- `router.back()` → `nexaGoBack()` in Wallet, Subscription, Vendor, Extensions, Developer, Ball House, Game House, Fitness, CallScreen decline.
- `nexaNavigation.ts`: `notifications` → `/(tabs)` with `panel=notifications`; Home opens the Notification Center from that flag.
- Test: `server/v5_19_0_navigation_keys.contract.test.js`.

## Known / not changed (needs your OK)
- Two files resolve to `/leisure`: `src/app/leisure.tsx` and `src/app/(tabs)/leisure.tsx`. Not deleted (AGENTS rule 11). Recommend deleting `src/app/leisure.tsx`.
- Screens with their own "‹ Back" text keep it; the global bar sits above them.

## Verification
- Full server suite: see checkpoint summary. Device/TypeScript run: NOT CLAIMED (no node_modules in this workspace).
