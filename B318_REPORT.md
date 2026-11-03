# B318 report (V5.99.72)

## Built
- Server (server/lifestyle.js): POST /api/lifestyle/posts/:id/report (reasons: spam, nudity, harassment, other), stored in a new lifestyle_reports table. One report per person per post.
- A reported post disappears from the reporter's feed straight away. Other people still see it until an administrator acts.
- Administrators only: GET /api/lifestyle/reports (reported posts with counts, reasons, author) and DELETE /api/lifestyle/reports/:postId/post (removes the post, its likes and comments).
- Screen: a flag button on friends' posts with a reason list and a plain thank-you message.

## Tested (PASSED)
- server/b316_lifestyle_posts.contract.test.js: 15 of 15 (adds report rules, hidden for the reporter only, admin-only list and takedown, screen wiring).
- Full server suite: 5022 tests, 26 failed. 25 are the known sandbox-only failures. The 26th (B254-E2) fails until these notes exist.

## NOT tested
- Typecheck (no node_modules), Playwright, and everything on a phone.
- The admin routes with a real administrator login. There is no admin screen for Lifestyle reports yet, so for now a report can only be reviewed through the route.
- The routes against the real database.

## DEFERRED
- An admin screen for reported posts. Reporting a comment. Opening a post straight from an alert (it would change the locked push-routing guards, so it needs your OK). Video sharing (file storage). A sixth dock tab.

## Next
- Your roadmap item 3. A phone check of Lifestyle.
