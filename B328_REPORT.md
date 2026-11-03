# B328 report (V5.99.82)

## What was done (Combined set C1, M4582 to M4605)
- **Guide and permissions (M4582, M4583):** docs/ADMIN_ROUTES_GUIDE.md now covers the owner-only routes (Mall, payments, operations, launch and recovery, fitness gyms, leisure). `GET /api/admin/me` lists six new owner permissions (`mall`, `payments`, `operations`, `launch`, `fitness_gyms`, `leisure_ops`). Who may call each route did not change.
- **Admin screens (M4584 to M4592):** Mall disputes (resolve), Mall review reports (mark reviewed or dismiss), Mall reviews (publish, hold, remove), Mall status and launch offer, Payments, Operations, Launch and recovery, Fitness gyms (approve, reject), Leisure. Server text is shown as text only.
- **Gaps found by reading the code, now fixed:**
  - M4593: the author is told when an admin removes their Lifestyle post or comment (alert opens Lifestyle). Dismissing sends nothing.
  - M4594: the phone app keeps the server's `ACCOUNT_SUSPENDED` code, signs out mid-session and the sign-in screen shows the server's message once.
  - M4595: the two report lists take `limit` and `offset` and say `hasMore`; the admin screens have Load more.
  - M4596: the action log shows the admin's name (falls back to the id).
  - M4597: home counters open the page they count.
- **Drift tests (M4598, M4603):** page permissions, server permissions and the guide must agree; every admin route the server registers is in the guide or listed with a reason. Checked that the test fails when the guide is broken.
- **App items (M4599 to M4602):** M4599 and M4600 were audited against the real files: what is left is photo overlays, scrims, the sale badge, Dami gold glow and world artwork (colours), and tuned world artwork (durations). No code change. A guard test now stops raw durations outside world files. M4601 stays PARTIAL and M4602 stays BLOCKED (reasons in MASTER_ROADMAP.md).
- **Docs (M4604):** admin-web README (pages and permissions table) and EXTRACT.md updated.
- **Bugs the new tests caught while building:** a `null` passed to `append()` on the gyms screen (would show the word "null"), and the report screens dropping the paging argument (Load more would have re-fetched page one). Both fixed.

## Found, not in C1
- Three Kitchen Hub admin routes have no admin screen and are not in the guide. Listed in the drift test with the reason and in MASTER_ROADMAP.md for the next set.

## Tested (PASSED)
- Admin web app tests: all pass (48).
- New server tests: b328_admin_followups (4), b328_admin_drift (2), b328_app_guards (3). Existing admin and Lifestyle tests (b320, b321, b325) pass.
- Full server run: 5076 tests, 26 failures. 25 are the known sandbox-only failures (payment, wallet and webhook tests that need the real packages). The 26th, the ship test, failed only until these notes existed.

## NOT tested
- Anything on a phone, including the suspended-account sign-out and message (M4594).
- A real browser run of the new admin pages (the tests use a small stand-in for the page).
- Real typecheck and Playwright.
- Who may call each owner-only route was read from the code; behaviour of those routes was not changed.

## Next
- Say NEXT. C1 has no open code milestone except M4601 (PARTIAL) and M4602 (BLOCKED); the next run takes the Kitchen Hub admin screens and Set 4 when it arrives.
