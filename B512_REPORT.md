# B512 — Zeeza Referral Programme and Popup Notification Integrity

**Release identity:** V6.1.66 B512 · Build 6331 · UNSEALED development checkpoint  
**Roadmap block:** M7466–M7490  
**Archive:** `NEXA-MAIN-V6.1.66.zip`  
**Next block:** M7491–M7515 — Referral Reward Auditability and Notification Recovery

## Implemented

- Added the central Zeeza profile **Invite & Earn** action and a shareable `nexa://auth/signup?ref=...` referral link.
- Added append-only Zeeza referral-token storage. Token values are returned only at generation time; SHA-256 digests are stored. Generating another link does not invalidate previously shared links.
- Added a 30-day referral campaign window, started by explicit link generation. Repeated generation does not reset an active window; generating a new link after expiry starts a new window.
- Counted a referral only after attribution and the referred account's activation event. Existing self-attribution and duplicate attribution protections remain.
- Added vendor eligibility at 100 qualified activations in the campaign window.
- Added user AAMI Rewards unlock at 20 qualified referrals, and subscription-month review eligibility for 30 additional qualified referrals in-window after the baseline (or 50 total with at least 30 in-window).
- Added configured-admin-only `GET /api/admin/zeeza/referral-followups` and screen `/admin/zeeza-referrals`, listing all generated user/vendor campaigns with window and reward-review progress.
- Kept Kitchen Hub referral routes and settlement unchanged.
- Improved the global in-app popup: recent eligible notifications can display on first fetch; IDs are deduplicated in memory; visibility increased from 2.5 to 5 seconds; dismissing suppresses popup replay without marking read; opening still requests the server read receipt; future/invalid timestamps are not recent.
- Added 25 milestone contracts plus dynamic referral lifecycle tests. Updated canonical route inventory and permanent roadmap queue after completing M7466–M7490.

## Verification evidence

- `npm run verify:contract`: **1117 passed, 0 failed**.
- Focused `node --test server/growthLifecycle.test.js server/v6_1_65_zeeza_referral_popup.contract.test.js`: **36 passed, 0 failed**.
- `npm run walk`: **CLEAN** — JS syntax 884/884; TS syntax scan 227 files; relative imports 773/773; route targets 56/56; 22 non-blocking advisories.
- `node scripts/roadmap-check.mjs`: **PASS** — ten sequential 25-milestone blocks, M7491–M7740.
- `node scripts/release-audit.mjs`: **PASS**.
- `node scripts/release-identity.mjs check`: **PASS** — V6.1.66 B512 Build 6331.
- Archive extraction and post-package verification will be recorded after packaging.

## Not tested / parked

- `npm run test:server` returns non-zero because the workspace lacks `better-sqlite3`; the server-suite runner reports 2 missing-module load failures and a number of dependent integration tests cannot run reliably. The focused Node built-in SQLite referral tests and contract suite passed, but this does not replace the full dependency-backed suite.
- TypeScript typecheck was not run because `node_modules` is absent. The Devil's Walk TypeScript pass is a syntax scan only.
- Browser/device/screen-reader acceptance, Expo web/native builds, production migration/deployment, live notification delivery and production admin access are not tested.
- **Actual subscription-period credit is not yet applied.** Reaching a target produces `pending_review`; the next block must connect approval and idempotent crediting to the authoritative subscription/financial service after its schema and invariants are verified. No free month is silently credited in this checkpoint.
- No official release seal was created.
