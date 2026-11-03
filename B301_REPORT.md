# B301 — V5.99.55 (theme hardening, Default follows any phone)

## What this is
Default was already the starting choice and already followed the phone (B300). This release makes that reliable on any phone.

## What changed
- src/ThemeProvider.tsx: the phone's light or dark setting is read with Appearance and AppState instead of the useColorScheme hook. A change is taken only while the app is on screen, and the phone is read again when the app returns. Some Android phones briefly report the other scheme as the app goes to the background; that no longer flips the look.
- Dark and Light still ignore the phone. Saved Dark or Light choices are untouched. A missing or unknown phone setting counts as dark.
- server/god_hand_run1_theme.contract.test.js M4501 now checks the new reading method.

## Checked, no change needed
- Nothing else in src forces dark: no setColorScheme call, and app.json says automatic.

## TESTED / PASSED
- Theme guard file and the dual-theme guard file (17 of 17).

## NOT tested
- Any real phone, light or dark, iOS or Android. This is the first thing to check on a build.
- Web: src/app/+html.tsx still has a fixed black theme-color. Web is out of scope for this change.
- Hard-coded colours that ignore the theme (M4513) can still look wrong in Light and Default until group 4.

## Remaining in run 1
M4505 to M4514 (10 milestones), unchanged.
