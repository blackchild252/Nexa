# Zeeza referral reward and notification state machine (local)

Scope: `server/growthLifecycle.js`, `server/db.js` (reward ledger and audit tables), the admin follow-up routes in `server/index.js`, `src/app/admin/zeeza-referrals.tsx`, `src/notificationPopupLogic.ts` and `src/NexaInAppNotificationPopup.tsx`. This describes what the code does today. It is not a live payment or coin system. No credit is applied to any subscription, wallet or AAMI coin balance by this code.

## 1. Account type
Resolved on the server by `resolveReferralAccountType`: a `vendors` row means `vendor`; any other existing account is `user`; anything else is `unknown`. Request fields are never used (the signed-in user object carries only id, email, name and username). A campaign created as `unknown` is upgraded the next time a known type is resolved.

## 2. Qualification (computed, never stored)
A referred person counts once, when they have an attribution and an `activation` event at or after the attribution time. Counts: `qualifiedReferrals` (lifetime) and `referralsInWindow` (activation between campaign start and end, both inclusive). Reading status never writes anything.

Targets: vendor 100 in window. User: 30 in window, plus 20 earlier or 50 lifetime qualified.

## 3. Reward status (what the admin sees)
| Code | Label | Meaning |
|---|---|---|
| `not_started` | Not started | no campaign yet |
| `scheduled` | Scheduled | now is before campaign start |
| `in_progress` | In progress | window open, target not reached |
| `account_type_review` | Account type review | type is `unknown`; never eligible |
| `pending_review` | Pending review | target reached; waiting for an administrator |
| `window_expired` | Expired | window closed, target not reached |
| `approved` | Approved | administrator approved; ledger row written |
| `rejected` | Rejected | administrator rejected; ledger row written |
| `credited` | Credited | operator recorded that the month was applied elsewhere |

Transitions: `pending_review` to `approved` or `rejected` (administrator decision). `approved` to `credited` (operator record). Nothing else moves. A decision cannot be reversed or repeated: a repeat of the same decision returns the existing row; the opposite decision returns `DECISION_ALREADY_RECORDED`.

## 4. Ledger and audit
One ledger row per campaign and reward type (`UNIQUE(campaignId, rewardType)`). Every decision and credit writes one audit row with actor, reason, from-status and to-status in the same transaction. Audit rows are immutable (database triggers refuse UPDATE and DELETE). The actor is always the signed-in administrator.

A restarted campaign keeps its identity, so it cannot earn a second month. Whether it should is an owner decision (DEFERRED).

## 5. Admin API
`GET /api/admin/zeeza/referral-followups` accepts `limit` (1 to 500), `offset`, `accountType` (`user`, `vendor`, `unknown`) and `status` (a code above). Anything else returns 400. `POST /api/admin/zeeza/referral-followups/:userId/decision` takes `decision` (`approve`, `reject`, `credit`) and `reason` (3 to 300 characters). Both are owner-only and send `Cache-Control: no-store` on every response. Hash fields are removed from every response.

## 6. Popup notification queue (phone)
The popup polls every 10 seconds. A notification qualifies when it is unread, flagged `inAppPopup`, and its timestamp is valid, not in the future, and under three minutes old (`recentEnough`). Rows that do not qualify are remembered so they never appear later. Qualifying rows are queued oldest first, up to 100. Before each one is shown, `takeNextFresh` drops any that went stale while waiting. One popup shows at a time for 5 seconds. Dismiss does not mark read; Open does. Reduced motion shows and hides instantly. Nothing shows on `/auth/` screens.

## 7. Not covered
No popup mute setting exists in the source, so none is preserved. A phone clock behind the server clock by even a moment makes a new notification look "future" and it is skipped for good; this is the existing M7484 rule and was left unchanged (owner decision DEFERRED).

NOT TESTED: the real HTTP routes, the production SQLite adapter (tests use `node:sqlite` with the schema text from `db.js`), the phone screens, screen readers, and any payment or subscription system.
