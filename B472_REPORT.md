# NEXA MAIN APP — B472 Release Report

Release identity: V6.1.26 B472 (build code 6291)
Release purpose: checkpoint 1 of the owner-reported UI problem list.

## Delivered
- Icons: Ionicons font registered in `src/app/_layout.tsx` (cause of empty squares).
- Notification tap: panel stays open until the server action resolves; message shown on failure (`src/app/(tabs)/index.tsx`).
- Lifestyle moved from L.A. to a Zeeza tab; `/lifestyle` redirects to it.
- Marketplace Orders & payments / Saved / Sell / Admin disputes text made visible.
- Vendor Center renamed Business Hub (sidebar, Home dock, Profile, accessibility labels); contracts synced.
- YOUTUBE_API_KEY developer notes replaced with user wording.
- Kitchen demo shop is an ice cream shop (slug `iceland` kept; old rows migrated). Join the hub is a tab after Hub.
- Ball House Today button uses the server date. Gym library PDFs shown in one folder card. Home heading spacing increased.

- Sky Money: one tab bar (Overview to Sky Insights) on every Sky Money tab; old back-link contracts updated.

## NOT DONE
- Business Hub single sign-up then platform choice.

## TESTED/PASSED
- Devil's Walk: clean (841 JS, 221 TS syntax, routes 54/54).
- All 583 Main server test files compared before/after: every new failure was an old contract describing the previous layout; those were updated and now pass. Tests that need dotenv/better-sqlite3 fail the same way before and after.

## NOT TESTED
- Typecheck (no node_modules), full server suite, browser, device, Netlify. The "Failed to fetch" on Netlify is an environment issue and was left alone.
