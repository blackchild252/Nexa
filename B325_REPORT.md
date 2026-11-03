# B325 report (V5.99.79)

## Built (Roadmap Set 2, checkpoint 3: M4566 to M4577; see MASTER_ROADMAP.md)
- M4566 to M4569 Reported Lifestyle posts and reported Lifestyle comments, each with an Open / Dismissed / Removed filter. The reasons, the number of reports, the author and the written text show as plain text. "Remove" needs a second tap ("Yes, remove it"); "Keep it" closes the reports and leaves the post or comment up. A card that is already removed shows no buttons. The server sends at most the 100 most recent; the screen says so.
- M4570 Action log (owner): newest first, with who did what to what, and Load more.
- M4571 Admins page (owner): list, add by email as reviewer or support, remove with a second tap. No remove button on yourself.
- M4572 The server serves admin-web at /admin-app on its own address (new file server/v5_99_79_admin_app.js). Only index.html, config.js, style.css and src/*.js are served (never the README, tests or package.json). Strict header: scripts, styles and calls only to the same address, no inline code, no framing. /admin-app without the slash goes to /admin-app/. ADMIN_APP_ENABLED=false switches it off (404). It is mounted before CORS. CORS now also accepts an Origin whose host is the server's own Host (the browser sends one on same-address POST and DELETE), only while the app is on; the CORS_ORIGINS list for other addresses is unchanged.
- M4572 (found while checking) The Dockerfile did not copy admin-web/, so the deployed image would have had nothing to serve. It now does: COPY admin-web ./admin-web.
- M4573 admin-web/EXTRACT.md (what to copy, config, CORS_ORIGINS, header, tests, what to delete afterwards) and test/selfcontained.test.js (imports, script and stylesheet links stay inside the folder; no file or server features; no hard-coded addresses).
- M4574 Phone-width rules in style.css (under 520px), focus moves to the page on a page change, Escape cancels a "Yes, remove" step, every field has a label, buttons say which post, comment or person they act on.
- M4575 A suspended account (403 ACCOUNT_SUSPENDED) is signed out with the server's reason instead of a dead screen. An expired sign-in already did this. A missing permission now reads "Your admin role does not allow that." (the old test expecting the raw server text was updated to match).
- M4576 test/guide-sync.test.js: every route src/api.js calls must be listed in docs/ADMIN_ROUTES_GUIDE.md with the same method. Checked by breaking the guide on purpose: the test fails and names the route.
- M4577 This closing check, notes and report.
- Two real bugs found by the tests and fixed before shipping: the new screens added a missing item with append(null), which a real browser would show as the word "null"; and two selects relied on a browser default.

## Tested (PASSED)
- admin-web/test: 39 of 39 (was 17). New: moderation.test.js 14 (reports, comments, action log, admins, labels, suspended and missing-permission handling, the routes used), selfcontained.test.js 3, phone.test.js 3, guide-sync.test.js 2.
- server/b325_admin_app.contract.test.js: 9 of 9 (files served with the strict header, path tricks refused, off switch, own-address CORS rule, mount order, Dockerfile copy, env example, extraction guide, the admin-web suite from here).
- Related tests (Lifestyle, admin, verification, notifications, B315 to B325, release enforcement): 75 of 75.
- Full server suite: 5067 tests, 4995 pass, 26 fail before the notes were written. 25 of those fail identically on the untouched V5.99.78 upload (24 are "Cannot find module" for dotenv or better-sqlite3, because packages are not installed here; the 25th I did not trace). The 26th was the ship check asking for the B325 notes; it passes now (checked in the related run above).

## NOT tested
- The admin app in a real browser: layout, the phone width, keyboard use, focus, dark mode. They are written and checked in the files only.
- The real server and database. The packages are not installed here, so server/index.js was only syntax-checked. The /admin-app mount, the redirect, HEAD, the real cors package with the new per-request options, and the header as a browser applies it (module scripts and calls under it) were run only against stand-ins.
- Hosting the app on a different address (CORS_ORIGINS) and the Docker image build.
- Typecheck and Playwright (not applicable to this folder).

## DEFERRED
- Identity documents and photos for verification, Lifestyle video (still need a storage and privacy decision, as in the guide).

## Next
- Set 2 is complete. Owner's roadmap item 3 starts Set 4 when it arrives; Set 3 stays blocked (needs a phone or a real build).
