# B317 report (V5.99.71)

## Built
- Server (server/lifestyle.js): like and unlike a post, list and add comments, delete a comment (the writer or the post owner), and alerts. New tables: lifestyle_likes, lifestyle_comments.
- Only the post owner and the owner's friends can like or comment. Strangers and blocked people get "not found".
- Comments: 300 characters, 20 a minute per person, empty comments refused.
- Alerts: friends (up to 50) when you share a photo; you when a friend likes or comments. They open L.A., where the Lifestyle card is.
- Deleting a post also deletes its likes and comments.
- Screen: heart with count, comment count that opens an inline comment list with a box and send button, delete comment, and an optional caption box above the feed for your next photo. Labels added for screen readers.

## Tested (PASSED)
- server/b316_lifestyle_posts.contract.test.js: 12 of 12 (adds friends-only like and comment, blocked and stranger refusal, alerts to friends only, comment limits and delete rules, cascade delete, screen wiring).
- Full server suite before the last fixes: 5019 tests, 27 failed. 25 are the known sandbox-only failures, M1130 and B196 included in the baseline; one was my own wiring test (fixed and re-run, 12 of 12); one was B254-E2, which fails until these notes exist.

## NOT tested
- Typecheck (no node_modules), Playwright, and everything on a phone: the keyboard over the comment box, the layout in both themes, alert tap behaviour.
- The routes against the real database and real login. Alerts were tested with a stand-in sender, not a real push.
- The full suite was not re-run after the last test fix.

## DEFERRED
- Video sharing (file storage). Opening a post directly from an alert (alerts open L.A.). Reporting a post. Lifestyle as a sixth dock tab (your decision).

## Next
- Your roadmap item 3. A phone check of Lifestyle.
