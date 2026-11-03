# Staff link outbox and client landing route — evidence (V6.2.43 B589)

Block M7766–M7790. Both items stay PARTIAL. Nothing here is wired into a route, a screen or a sender.

## M7785 — outbox (`server/staffLinkOutbox.js`)
- Stores only: link id, event type, target (admin or central), status, attempt count, next time, short reason word. No permissions, codes, credentials, payload or raw error text.
- The signed event is built when an item is handed out, not when it is queued. A signed event goes stale after 5 minutes, so a retry always gets a fresh one.
- Same waiting news for the same link and target is queued once (database index). New news after sending is queued again.
- `claimDue` takes a 60 second lease; a sender that crashes makes the item due again. Two senders never get the same item.
- Waits double from 30 seconds up to 30 minutes. After 6 tries an item is dead. A missing link row parks the item as dead (`link_missing`).
- Reason words must match `a-z, 0-9, _` (40 max). Anything else is stored as `unknown`.
- Tests: `server/staffLinkOutbox.contract.test.js`, 12 tests on a real SQLite engine (`node:sqlite`). 6 deliberate breakages (no dedupe index, raw error stored, no wait cap, lease ignored, never dies, send without claim) were each caught.

## M7774 — landing route (`src/staffLanding.ts`)
- Reads the server's door answer. Looks the unit up in a fixed list: Business Hub to `/marketplace/vendor`, Kitchen to `/leisure/kitchen`.
- Any path, url or route sent by anyone is ignored. Blaca Essentials, central, admin and every unknown or hostile value return nothing.
- Tests: `server/staffLanding.contract.test.js`, 5 tests via Node type stripping, including a check that both screens exist and that the real `staffDoorSignIn` answer is read correctly. 5 deliberate breakages were each caught.

## NOT BUILT / NOT TESTED
- No sender: nothing makes an HTTP call to Admin or Central. Nothing calls `enqueueForLink` when a link changes.
- No Admin or Central receiver changes. No live acceptance.
- No sign-in screen calls `staffLandingRoute`. No React Native rendering, typecheck, screen reader or device checks.
- `better-sqlite3` runtime, multi-process concurrency, HTTP routes: NOT TESTED.
- Open owner questions are unchanged. M7780 (who approves a Manager appointment) is still first; Blaca staff screen and Kitchen door choice follow.
