# B404 — V6.0.58 B404 Main Launch-Preparation Block M5966–M5990

## Completed
- Ran Devil's Walk (CLEAN), Angels Duty (0 junk; 5 exact-duplicate groups reported, none removed) and God Hand (ordered traversal already COMPLETE, 70 blocks) on the real source.
- Server: `DELETE /api/admin/users/:id` and `DELETE /api/admin/vendors/:id` now require a 3–300 character reason (400 otherwise) and store it in the admin audit log. Found by the Admin Devil's Walk: the standalone Admin collected the reason but never sent it.
- Added `server/b404_admin_removal_reason.contract.test.js` (5 tests, real handlers, both removal routes, owner-only, self/admin removal still refused).
- Synchronized `docs/ADMIN_ROUTES_GUIDE.md`.
- Verified by script: all 91 standalone-Admin API calls match Main routes; all enforce an admin guard (6 Lifestyle moderation routes check inside the handler).

## Reviewed and recorded for the owner
1. **Database storage.** The image sets `DB_PATH=/data/nexa.db`. On a host without a persistent disk (free Render) every restart or redeploy loses all accounts and data. Required for launch.
2. **Admin two-factor sign-in** does not exist anywhere in the server. The owner role is a single password.
3. **Three-strike closure.** Each confirmed Lifestyle removal is a strike and the third closes the account automatically. Reviewer-role admins can issue strikes. Deliberate policy; consider owner confirmation on the third strike.
4. **Docker image** copies only `package.json`, `server/` and `docs/legal/`; root documents such as `DEVELOPMENT_CREDENTIALS.md` are not in the image.
5. **Launch-readiness** (`/api/admin/launch-readiness`) checks 26 settings including `DB_PATH`, `PUBLIC_URL`, `CORS_ORIGINS`, `PAYMENT_MODE`, Paystack keys and kind, wallet mode, market data mode, preview off, admin identities, AI key, Sentry. Values were not checked because no production environment exists here.

## Test results
- First run (before the B404 documents existed): 5305 tests, 5228 pass, 46 skipped, 31 fail.
- Final run: **5318 tests, 5247 pass, 46 skipped, 25 fail.** All 25 are environmental: 24 need the `dotenv` or `better-sqlite3` package (payments, wallet, webhook signature and cross-account access suites, including `b144_wallet_hardening`), and M1130 checks the installed-dependency state. The 6 release-document failures from the first run are resolved. No failure comes from the B404 change; the new removal-reason contract passes 5/5.
- Devil's Walk CLEAN: JS 750/750, TS syntax 209 files, relative imports 679/679, route targets 44/44. Angels Duty: 0 junk, 0 blockers. God Hand verify: traversal COMPLETE.

## NOT TESTED / excluded
- The payment, wallet, webhook and cross-account access suites above (they need `npm install`); run them in the Codespace before launch.
- TypeScript typecheck (no `node_modules`).
- Browser/device runtime, live providers, EAS, stores, deployment, Render and Netlify configuration.
