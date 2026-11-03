# B289 — V5.99.43 (checkpoint 2, M4465, M4466, M4468)

## Changed
- New NEXA crash screen (src/NexaErrorScreen.tsx), used as the root ErrorBoundary in src/app/_layout.tsx instead of the plain default. It shows the error message and the top of the stack ("WHERE IT FAILED"), a gold Retry button and a Home button, in the dark NEXA look. It uses no app providers, so it still works when the app's own shell is what failed.
- Yaayz ads: each ad is wrapped in src/YaayzAdBoundary.tsx, so a failing ad renders nothing instead of crashing the Yaayz screen. src/YaayzNativeAd.tsx now starts the ads SDK with the documented default import (`import mobileAds from 'react-native-google-mobile-ads'`); before it used a named import that the library may not export.
- New guard v5_99_43_b289_crash_screen (5 checks), registered in the release gate.

## What this does NOT claim
The cause of "undefined is not a function" after a menu tap is NOT confirmed. The video shows the crash right after a tap from the Home menu but not which row. The Yaayz ad is the strongest suspect found by reading the code, so it is contained, but only the new crash screen will show the real cause on your phone. M4465 stays open until a build shows the stack.

## Checked
- Guard test 5 of 5; 9 older navigation and readiness tests that read the touched files pass.

## NOT tested
Phone, a new build, full typecheck, Playwright.

## Next
Build this version, open the menu rows (especially Yaayz). If it crashes again, send a screenshot of the new screen.
