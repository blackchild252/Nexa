# Referral reward auditability and notification recovery — execution evidence (M7716–M7740)

Run: NEXT, internal checkpoint B583. Scope: local source and real in-memory SQLite only (built from the schema text in `server/db.js`, run with `node:sqlite`). No server dependencies, phone, screen reader, payment system, store or deployment was used. Test file: `server/referralRewardAuditability.contract.test.js` (in `npm run verify:contract`). State machine: `docs/ZEEZA_REFERRAL_REWARD_AND_NOTIFICATION_STATE_MACHINE.md`.

Proof the tests bite: six deliberate breakages were each caught by the new tests (audit triggers removed, eligibility check removed, vendor lookup removed, future timestamps accepted, no-store moved after the owner check, activation-before-attribution allowed). Files were restored afterwards.

| ID | Status | Evidence |
|---|---|---|
| M7716 | TESTED/PASSED | Reward ledger table, one row per campaign and reward type; repeat approval returns the same row. |
| M7717 | TESTED/PASSED | Qualification never writes; approve/reject need a qualified campaign; actor is the signed-in admin. Route wiring checked in source only. |
| M7718 | TESTED/PASSED | Second decision and credit are no-ops; flipping is refused. DEFERRED to owner: may a restarted campaign earn another month? Today it cannot. |
| M7719 | TESTED/PASSED | Audit rows in the same transaction; UPDATE/DELETE refused by triggers; failed audit write rolls the ledger back. |
| M7720 | TESTED/PASSED | `parseFollowupQuery` validation, ordered disjoint pages, limit clamp. |
| M7721 | TESTED/PASSED | Defect fixed: campaigns were always saved as `unknown`. Type now resolved from the `vendors` table. Existing `unknown` campaigns upgrade on next resolve. |
| M7722 | TESTED/PASSED | Unknown type never eligible, approval refused, nothing written. |
| M7723 | TESTED/PASSED | Inclusive at exactly 30 days, closed 1 ms later. |
| M7724 | TESTED/PASSED | Activation before attribution rejected; same instant counts. |
| M7725 | TESTED/PASSED | Late activation counts lifetime only; approval refused. |
| M7726 | TESTED/PASSED | Duplicate and repeated activations count once. |
| M7727 | TESTED/PASSED | Retired token rejects new attribution. No route or function retires tokens yet; tested by setting `disabledAt`. |
| M7728 | TESTED/PASSED | Earlier attribution kept and still qualifies. |
| M7729 | TESTED/PASSED | Age and remaining time in API and admin screen (screen not rendered). |
| M7730 | TESTED/PASSED | Labels for all nine states. |
| M7731 | TESTED/PASSED | Hash fields stripped from all three referral responses; stored hash value never appears. |
| M7732 | PARTIAL | no-store now set before the owner check (403/500 were uncached-unsafe before). Order proven in source text; HTTP NOT TESTED. |
| M7733 | PARTIAL | One spoken label per row in reading order; source check only; no screen reader. |
| M7734 | TESTED/PASSED | `takeNextFresh` order and stale drop, executed. Component wiring checked in source. |
| M7735 | TESTED/PASSED | Three-minute boundary; non-qualifying rows remembered. |
| M7736 | TESTED/PASSED | Malformed and future timestamps rejected. DEFERRED to owner: a phone clock slightly behind the server skips the notification for good (existing M7484 rule kept). |
| M7737 | PARTIAL | Reduced-motion paths confirmed in source. No popup mute setting exists in the source, so none was preserved or tested. |
| M7738 | TESTED/PASSED | State machine document, checked against the real labels. |
| M7739 | TESTED/PASSED | Regression results in the B583 report. |
| M7740 | TESTED/PASSED | This file, roadmap statuses, B583 report. |

## Changes to existing contracts (same guarantee, new wording)
- `server/notificationPopupQueue.test.js`: two patterns follow the code that moved into `src/notificationPopupLogic.ts` (queue limit constant; fresh-item check when advancing the queue).
- `server/v6_1_65_zeeza_referral_popup.contract.test.js`: M7479 (500-row cap) and M7484 (future timestamps rejected, three-minute life) now read the renamed constant and the new logic file. Both guarantees are unchanged.

## NOT TESTED
Real HTTP routes, the production SQLite adapter, the phone screens, screen readers, `npm run test:server`, `release:gate`, typecheck (no `node_modules`), M7527, and any payment, subscription or AAMI coin system. Nothing here applies a credit to anyone.

## Next
Block M7741–M7765 (Admin AI Feed Operations and Referral Workflow Governance). The active block M7516–M7540 stays open: M7527 is still BLOCKED.
