# B321 report (V5.99.75)

## Built (Roadmap Set 1, second half, server side: M4544, M4546, M4547, M4551; see MASTER_ROADMAP.md)
- M4544 Report a Lifestyle comment. POST /api/lifestyle/comments/:id/report (same reasons as a post report; not your own comment; you must be able to see the post). A comment you reported is hidden from you and no longer counted for you. Admins with the reports permission (owner, reviewer) can list reported comments, remove one, or dismiss the reports; both are written to the admin log. Removing a whole post closes the open comment reports on it. The admin summary now includes reportedLifestyleComments.
- M4546 Feed load more. GET /api/lifestyle/feed takes limit (1 to 50) and before (the nextBefore from the previous page) and returns nextBefore, which is null on the last page. Posts hidden by a block are skipped while scanning, up to six rounds, so a page is not short because of them. Rarely the last nextBefore leads to an empty page; the app should treat an empty page as the end.
- M4547 Verified mark. Post and comment authors now carry verified (true only for an approved account verification, not a shop one).
- M4551 docs/ADMIN_ROUTES_GUIDE.md: sign-in, roles and permissions, every admin route with its inputs and results, rules for the admin app, and what is not available yet. It says plainly that the routes do not depend on a web client, so an Android admin app can use them unchanged. A test fails if a route is added or renamed in the code and the guide is not updated.

## Tested (PASSED)
- server/b321_lifestyle_server.contract.test.js: 8 of 8 (comment reports and hiding, admin review with who may do what and the audit log, post removal closing comment reports, paging with no duplicates and a clean end, bad cursor and oversized limit, blocked authors and a long run of hidden posts, verified mark, guide against the code).
- The existing Lifestyle, admin and verification tests with the new one: 39 of 39.

## NOT tested
- The routes against the real database and a real phone or browser (these tests use the in-memory stand-in the earlier Lifestyle tests use).
- Real alerts. Typecheck and Playwright (no node_modules here).

## DEFERRED
- App side: verified mark, report a comment and load more in the app (M4548), the Get verified screen (M4549), verification alerts opening the right screen (M4550). Set 1 closing check (M4552).
- Identity documents for verification; opening the exact post from an alert; video sharing.

## Next
- Finish Set 1 on the app side (M4548 to M4550), then the closing check (M4552).
