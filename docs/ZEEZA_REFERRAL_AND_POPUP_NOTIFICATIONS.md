# Zeeza Referral Programme and Popup Notifications — B512

## Product rules implemented

- Zeeza is the central NEXA profile referral gateway. Kitchen Hub referral routes and settlement remain independent.
- Opening the Zeeza profile's **Invite & Earn** action generates a random referral token and a `nexa://auth/signup?ref=...` link.
- Token hashes are stored in `nexa_zeeza_referral_tokens`; new link generation appends a token rather than invalidating prior links.
- A referral is counted only when the referred account has a recorded `activation` growth event after its attribution. Self-attribution and duplicate referred-account attribution are rejected by the existing attribution contract.
- A campaign begins when the user/vendor generates their referral link. The end timestamp is 30 days later. Generating another link during an active campaign does not reset its start; generating a link after expiry starts a new campaign window.
- Vendors require 100 qualified referrals within the campaign window to become eligible for admin review.
- Users unlock AAMI Rewards at 20 lifetime qualified referrals. A subscription-month reward becomes eligible for review after 30 additional qualified referrals within a campaign window when the 20-referral baseline already exists; 50 qualified referrals in total with at least 30 in-window also satisfies the implemented check.
- Unknown account types do not qualify for either reward until identity classification is available.
- Reward eligibility is displayed as `pending_review`; this slice does **not** automatically mutate subscription periods or issue a free month. The durable approval/credit integration remains a separate financial/subscription-authority task.

## Admin follow-up

- `GET /api/admin/zeeza/referral-followups` is configured-admin-only and returns no-store data with a bounded maximum of 500 campaigns.
- The `/admin/zeeza-referrals` screen lists each generated campaign, user/vendor classification, campaign dates, qualified lifetime count, in-window progress, AAMI Rewards status and reward-review state.
- The screen does not expose token hashes or raw referral tokens.
- The API and screen preserve Kitchen Hub as a separate programme.

## Popup notification corrections

- The popup remains an enhancement-only layer; it does not block app startup.
- First fetch can show a recent eligible unread in-app popup rather than silently baselining and skipping it.
- Notification IDs are tracked in memory to prevent repeat display during the mounted session.
- Visibility is five seconds. Dismiss marks the ID as seen for popup display but does not mark the server notification read. Open continues to request the server read receipt before navigating.
- Invalid and future-dated timestamps are not considered recent. The existing polling interval and reduced-motion handling remain unchanged.

## Verification and limits

- `npm run verify:contract`: 1,117 passed, 0 failed.
- Focused referral lifecycle and popup contract tests: passed.
- `npm run walk`: clean; JS syntax, TS syntax scan, relative imports and route target scan passed.
- `node scripts/roadmap-check.mjs` and `node scripts/release-audit.mjs`: passed.
- `npm run test:server`: blocked by missing `better-sqlite3` runtime dependency; several integration tests fail to load the missing module. TypeScript dependency-backed typecheck, Expo/native builds, browser/device/screen-reader acceptance, production deployment and real subscription-credit application are not tested.
- No official release seal was created.


## Admin AI handoff adapter — B513

- `scripts/zeeza-admin-ai-feed.mjs` reads the existing owner-gated referral follow-up endpoint and the signed-in admin's notification inbox. It emits a bounded JSON input for an approved admin AI, including campaign starts/deadlines, verified counts, review status and relevant notification alerts.
- It does not create a new admin authentication path and does not mutate data. The feed cannot approve rewards, credit subscriptions, alter attribution or send messages. See `docs/ZEEZA_ADMIN_AI_AGENT_HANDOFF.md` for environment setup and the operating prompt.
- It polls rather than delivering guaranteed push events; live admin API credentials, deployment supervision and external AI data-processing approval remain operator tasks.
