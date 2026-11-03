# B323 report (V5.99.77)

## Built (Roadmap Set 2, checkpoint 1: M4553 to M4556; see MASTER_ROADMAP.md)
- M4553 Every Lifestyle alert (new photo, like, comment) carries the post id. The stored alert also offers it as the id the app reads. Older alerts without one still work.
- M4554 New route GET /api/lifestyle/posts/:id. Only the owner and the owner's friends can read it; blocks apply; a post you reported counts as gone for you. A push tap or the in-app alert list opens /lifestyle with that post. The id is checked to be a plain id before use.
- M4555 The Lifestyle screen shows the alert's post first and only once. If it is gone, blocked or reported it shows "That post is no longer available." with an OK button.
- M4556 Closing check for this checkpoint.
- Set 2 registered in MASTER_ROADMAP.md as M4553 to M4577 in three checkpoints (B323, B324, B325). The old draft items that are not buildable now stay parked there. The docs/ADMIN_ROUTES_GUIDE.md line "Opening the exact Lifestyle post" was removed from "Not available yet".

## Tested (PASSED)
- server/b323_lifestyle_exact_post.contract.test.js: 6 of 6. The new route and the alerts run against the in-memory stand-in used by earlier Lifestyle tests; the app side is checked against the real source files.
- Related tests (Lifestyle, admin, verification, navigation, notifications, B315 to B323): 97 pass, 0 fail (1 skipped).

## NOT tested
- The route against the real database, real alerts, and the screen on a real phone or browser.
- Typecheck and Playwright (no node_modules here). The edited .ts and .tsx files passed Devil's Walk syntax checks only.
- Scrolling: the post is shown at the top rather than scrolled to inside the feed.

## DEFERRED
- Admin web app (checkpoints 2 and 3). Lifestyle video, Kitchen payment provider, sixth dock tab (parked).

## Next
- Checkpoint 2 (B324): admin-web core (M4557 to M4565).
