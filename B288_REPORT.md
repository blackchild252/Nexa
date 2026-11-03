# B288 — V5.99.42 (checkpoint 1, M4469 and M4470)

## Fixed
- server/subscriptions.js now exports currentSubscription. server/aamiEconomy.js calls it for the Sky Money Overview, Activity and reward windows; before, the call failed with "subscriptions.currentSubscription is not a function" (video 2:36 to 2:54). The Sky Money Overview and Activity screens should load without the red error.
- New guard v5_99_42_b288_subscription_exports (3 checks), registered in the release gate. It also fails if any other server file calls a subscriptions function that is not exported.

## Checked
- Guard test passes (3 of 3). Full release gate and seal pass on ship.

## NOT tested
The Sky Money screens on a phone (needs a new build and a running server), full typecheck, Playwright, the dotenv and better-sqlite3 files.

## Next
M4465 and M4466 (menu crash, Yaayz). The error text has no stack, so the next checkpoint makes the error screen show where it failed.
