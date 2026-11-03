# B310 — V5.99.64 (signup name = username)

## What I did
- Cause: signup stored only a display name. The username was a separate field that nothing on the Zeeza profile screen let you set, so it showed "Not set" and Share said "Add a username first".
- Server: new `server/signupUsername.js`. The signup name becomes the username (lowercase, letters/numbers/underscore, 3 to 20 characters). Used by email signup, Google signup, and a one-time fill at server start for accounts that have none. Never overwrites an existing username. If the name is taken the server adds a number (dapo2), so two people can still sign up with the same name.
- App: the signup field is "Username", with the rule under it.
- `friends.js` now shares the same rule file instead of keeping its own copy.
- Updated 3 older guards that pinned the old "Name" field; added `signup_username.contract.test.js` (5 tests) to the release gate.

## TESTED / PASSED
- New guard: 5 of 5. Derivation on sample names ("dapo", "Dapo", "Ade Ola", accents, "12", empty, "admin") gives valid, unique usernames.
- 489 related tests: 467 pass. 22 fail only with "Cannot find module 'dotenv'" (not installed here).

## NOT tested
- A real signup and the start-up fill on the real database (better-sqlite3 and dotenv missing here).
- Phone or browser view, typecheck, Playwright.
- Existing accounts: a name like "Ade Ola" becomes "adeola". Someone whose name sanitises to something taken gets a number.
- The name shown as a display name is still exactly what was typed; only the @username is cleaned.

## Next
Deploy server and web, sign up a test account, check Zeeza profile and Share.
