# B295 — V5.99.49 (M4483, M4467)

## Cause found
Ball House loads football and Yaayz tickets in one call. The tickets route (GET /api/yaayz/tickets) first runs releaseExpiredYaayzReservations(), which reads a column named reservationExpiresAt on yaayz_ticket_orders. No migration ever created that column, so on a database without it the query throws and the server returns "An unexpected server error occurred." Because the screen used Promise.all, the failed tickets call also threw away the football data that had loaded, so the page kept saying "Loading live football..." under the error.

## Changed
- server/db.js: adds the missing reservationExpiresAt column to yaayz_ticket_orders (checked first, so existing databases upgrade and new ones are not touched twice).
- src/app/leisure/ball-house/index.tsx: football and tickets now load with Promise.allSettled. Football shows even if tickets fail; tickets fall back to empty. If football itself fails, the status line says "Live football is unavailable right now." instead of "Loading live football...".
- M4467: new static guard. Every directory row must have a route entry and a real screen file under src/app with a default export, and the drawer must open rows only through navigationForDirectoryItem.
- New guard v5_99_49_b295_menu_and_ball_house (6 checks), in the release gate.

## Also affects
Yaayz (M4466): the same column is read by the tickets list that the Yaayz screen calls, so the Yaayz screen may also have been failing for the same reason. Not confirmed on a phone.

## What this does NOT claim
The menu guard is static. It proves each row points at a real screen file with a default export. It does not open the screens, so it cannot prove the menu-tap crash (M4465) is gone. That stays open until the new crash screen shows a stack on a phone. The server migration was not run against a real database here (better-sqlite3 is not installed).

## Checked
New guard 6 of 6. All server test files run before and after: 26 fail the same way on the original V5.99.48 zip (no node_modules here), none new from this change.

## NOT tested
Phone, new build, real database migration, full typecheck, Playwright.

## Next
M4465 needs a phone build to show the crash stack. M4485 phone re-check (blocked, needs phone).
