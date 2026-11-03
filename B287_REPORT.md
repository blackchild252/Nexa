# B287 — V5.99.41 (checkpoint 16, planning only)

## What this release is
No code changed. The owner's eight requests and the issues seen in Screen_Recording_20261004_012335.mp4 (4:07, reviewed every 2 seconds, plus half-second frames around the crashes) are written into MASTER_ROADMAP, PRIORITY_ROADMAP and TEMPORARY_ROADMAP as M4465 to M4484, in six turns.

## Seen in the video
- 0:22 and 0:32: crash screen "Something went wrong · Error: undefined is not a function" right after a menu tap from Home. After Retry the app shows "Restoring your NEXA session..." (white), then the sign-in screen, then Home. The video does not show which row was tapped.
- 0:00 to 0:02: Home rails start their text in the middle of the rail.
- 0:24, 0:33: sign-in has no show-password eye, no remember option.
- 0:58 to 1:04: Ball House "Loading live football..." never ends, then "An unexpected server error occurred."
- 1:36 to 2:06: subscription tier prices run past the card border.
- 2:36 to 2:54: Sky Money Overview and Activity show "subscriptions.currentSubscription is not a function". Cause found in the code: server/subscriptions.js defines currentSubscription but does not export it; server/aamiEconomy.js calls it.
- 2:36: Sky Money tab row is cut off at "Sky Store Sav...".
- All menu frames: chevron on its own line under each label.
- 3:40 to 4:06: Dream Marketplace "Request failed (502)" after category taps.

## Not found yet
The exact function behind "undefined is not a function" (M4465) and the cause of Yaayz not opening (M4466). The error text has no stack, so the first step is to make the error screen show it.

## NOT tested
Everything. Planning only; no phone, no typecheck, no Playwright.
