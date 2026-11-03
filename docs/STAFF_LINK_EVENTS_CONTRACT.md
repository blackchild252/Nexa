# Staff link events and bridge permissions — contract (V6.2.42 B588)

Code: `server/staffLinkEvents.js`, `server/staffBridgePermissions.js`, `src/staffLinkStates.ts`.
Tests: `server/staffLinkEvents.contract.test.js` (14), `server/staffLinkStates.contract.test.js` (4). Real SQLite engine `node:sqlite`; the production `better-sqlite3` runtime is NOT TESTED here. Nothing is routed and nothing sends yet.

## Event (Main to Admin or Central)
Fields: `v` (1), `eventId`, `type`, `target` (`admin` or `central`), `issuedAt`, `subject`, plus `keyId` and `signature`.
`subject` holds only: `linkId`, `nexaUserId`, `bossTier`, `bossId`, `unit`, `status`.
Types: `link_approved`, `link_rejected`, `link_suspended`, `link_resumed`, `link_removed`, `boss_held`, `boss_restored`, `boss_removed`.
Never inside an event: permissions, passwords, codes, tokens, 2FA material.

## Signing
HMAC-SHA256 over the canonical JSON of the event without `keyId` and `signature`; compared in constant time. Keys are at least 32 characters and are passed in; the module never reads the environment and never logs.

## A receiver must refuse
Unsigned; unknown key; wrong signature; any field outside the lists above; a credential-looking field; unknown type; a different target; older than 5 minutes; more than 60 seconds in the future; an `eventId` already seen. Replay memory is kept for 10 minutes; anything older is already refused as stale.
A refused event is not remembered as seen. Answer the outside world with one generic refusal; the reason code is for logs and tests.

## Bridge permissions (staff-management calls)
`staff.read`, `staff.request`, `staff.suspend`, `staff.remove` may be held by Director and Manager. `staff.approve` is Director only and can never be handed to a Manager. A Manager acts inside their own unit only. Grants must come from the server's own record of the caller, never from the request. Anything not listed is refused.

## Not built / not tested
Sending from Main (outbox, delivery, retries), Admin and Central receivers, the server record of caller grants, HTTP routes, the Staff login screen, `better-sqlite3`, multi-process replay races, devices.
