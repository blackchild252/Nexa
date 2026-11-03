# B531 — Admin AAMI login and scoped NEXA route bridge

## Implemented

- Admin AAMI login can fall back to the authenticated Main `/api/admin-aami/access` response when legacy `/api/admin/me` returns 403. Only active, activation-confirmed grants qualify.
- Admin AAMI API requests for the NEXA workspace use `/api/admin-aami/nexa/*`. Main checks the grant before rewriting only explicitly allowlisted routes to NEXA handlers.
- Added an explicit role-permission matrix at the handler guard. Owner-only admin management, platform diagnostics, destructive account removal, and non-migrated routes are not bridged. LORDGISTICS is not rewritten into NEXA.
- The company selector only shows active granted company scopes. Admin AAMI sign-in copy clarifies that the existing verified Main identity is used. Permanent vendor removal controls are hidden for Admin AAMI grants.

## Tests

- Main focused Admin AAMI, identity resolver, privileged-access, activation delivery and Vendor Staff contracts: 39/39 PASS.
- Admin full suite: 960/960 PASS.
- AAMI Central full suite: 169/169 PASS.
- LORDGISTICS full suite: 111/111 PASS.
- Main JavaScript syntax checks and Admin JavaScript syntax checks: PASS.
- Main full server suite: BLOCKED/FAILED. Local environment lacks `better-sqlite3`; database-backed suites cannot load. Additional unrelated pre-existing contract/source drift is also reported.

## Not tested / not complete

- Real browser acceptance for recruitment approval → invitation → activation → Main login → NEXA business routes → revocation.
- Complete 36-tile API migration; only allowlisted NEXA routes are bridged. Unsupported pages remain unavailable rather than bypassing authorization.
- Vendor→Staff browser acceptance with fresh Zeeza verification.
- Deployed Central/Main/Admin URLs, live signing secrets, Zeeza delivery, production database behavior, typecheck dependent on unavailable packages, devices, deployment or launch.

This is an unsealed local checkpoint. No production or launch activity was performed.
