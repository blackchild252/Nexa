# B300 — V5.99.54 (God Hand run 1, group 3: theme)

## What changed
- M4500: the appearance choice is now Default, Dark or Light (src/themeMode.ts ThemePreference). Default is the starting choice. The storage key is unchanged, so a saved Dark or Light from earlier versions is read back exactly as it was; nothing saved means Default.
- M4501: Default follows the phone (resolveThemeMode). app.json userInterfaceStyle changed from dark to automatic. The provider listens to the phone's colour scheme.
- M4502: the Appearance picker (ThemePicker) shows three tiles: Default (follows your phone, half dark and half light preview), Royal Dark, Earth Light. Radio semantics, selected state and an accessibility label on each. Profile passes the choice, not the resolved look.
- M4503 (PARTIAL): the status bar already follows the resolved look. The saved choice is now read at once where the phone allows (SecureStore.getItem), so the first frame has the right look, and the start-up background (before fonts and the choice finish loading) matches it (startupBackground).
- M4504: when the phone changes between light and dark while NEXA is open and the choice is Default, the look re-resolves live. Dark and Light ignore the phone. It uses the existing rebuild (see M4499 in B299).
- New guard file server/god_hand_run1_theme.contract.test.js (5 tests, including real logic tests for the three-way rule), registered in the release gate.
- Four older guard tests were updated because they asserted the two-tile picker: v5_21_0_dual_theme test 7, v5_98_30_current_state test 18, v5_21_0_profile_block tests 2 and 4, v5_99_4_b250_reading_comfort (M4111).

## TESTED / PASSED
- The new guard file (5 of 5), the four updated files, and the full release gate (341 of 342 before these notes; the one failure was the missing B300 notes).

## NOT tested
- Phone, new build, typecheck (no dependencies installed here), Playwright.
- That SecureStore.getItem is available and synchronous on the device build (the code falls back to the async read if not).
- Live switching on a real phone, and Android's brief colour-scheme change when the app goes to the background.

## NOT done (native)
- The native launch screen and the colour behind the app before any JavaScript runs. app.json has no splash settings, so this needs an expo-splash-screen setup and a new build to check. Logged for the phone re-check (M4515).

## Remaining in run 1
M4505 to M4514 (10 milestones).
