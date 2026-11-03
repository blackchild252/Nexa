# B316 report (V5.99.70)

## Correction to B315
B315 added Lifestyle as a sixth dock tab. A locked guard says the dock has exactly five destinations, and the full server suite showed four guards failing (B84 directory ids, B86 M576, B86 M579, M735b route inventory). I had only run a short list of tests, so B315 shipped with those four broken. B316 repairs it: Lifestyle is now its own screen (/lifestyle), opened from a Lifestyle card at the top of L.A. The dock is back to five.

## Built
- server/lifestyle.js: POST /api/lifestyle/posts (photo and optional caption), GET /api/lifestyle/feed (your posts and your friends' posts, newest first, blocked people left out), DELETE /api/lifestyle/posts/:id (owner only). Mounted in server/index.js.
- Photos are stored in the database as small images (JPG, PNG or WebP, about 1.5 MB at most). Videos are refused with a plain message.
- src/lifestyle.ts (API calls, time-ago text) and an updated src/LifestyleScreen.tsx: loads the feed, posts photos to friends, shows each author's name and time, delete your own post, pull to refresh, honest empty and error states. Videos you pick or record stay on your phone and say so.
- Route inventory, screen title and menu highlight (L.A. stays highlighted on Lifestyle) updated.

## Tested (PASSED)
- server/b316_lifestyle_posts.contract.test.js: 7 of 7 (post with name, friends-only feed, blocked friend hidden, video/empty/oversize/non-photo refused, owner-only delete, route mounted, screen wiring).
- server/b315_lifestyle_tab.contract.test.js rewritten for the new layout: 4 of 4.
- Full server suite: 5014 tests, 4942 passed, 26 failed at the last run. 25 are the known sandbox-only failures (missing better-sqlite3 and dotenv, plus M1130). The 26th was B254-E2, which fails until these release notes exist.

## NOT tested
- TypeScript typecheck (no node_modules), Playwright, and anything on a phone: camera, photo library, how big a real phone photo is after quality 0.3 against the 1.5 MB cap, the layout in both themes.
- Server routes against the real database and real login (the tests use an in-memory database and a stand-in login).

## DEFERRED
- Sharing videos (needs file storage). Likes and comments. Push alerts for new posts.
- Lifestyle as a sixth dock tab: needs your decision, because it means changing the locked five-destination guards.

## Next
- Your roadmap item 3. Phone check of Lifestyle. Decide on a dock tab versus the L.A. card.
