# NEXA Main — B588 Internal Checkpoint Report

- **Identity:** V6.2.42 B588, build 6407 (advanced with `npm run release:bump`; unsealed).
- **Scope:** NEXT run, block M7766–M7790 (Staff Link Registry), the five milestones B587 left unstarted.
- **Result:** 0 milestones fully closed. M7785, M7786, M7787, M7789, M7790 moved from NOT STARTED to PARTIAL. M7780 still BLOCKED on an owner decision. Statuses: `MASTER_ROADMAP.md`.
- **Roadmap:** active block M7516–M7540 still open; M7527 still BLOCKED.

## Changes
- `server/staffLinkEvents.js`: signed, minimized staff-link events; verifier refuses unsigned, wrong key, bad signature, extra or credential-like fields, wrong target, stale, future and replayed events.
- `server/staffBridgePermissions.js`: five staff-management permissions; approval Director only; Manager limited to own unit; fails closed.
- `src/staffLinkStates.ts`: link state wording, spoken labels, one identical door refusal; unknown state cannot work.
- Tests: `staffLinkEvents.contract.test.js` (14), `staffLinkStates.contract.test.js` (4), both added to `verify:contract`.
- `docs/STAFF_LINK_EVENTS_CONTRACT.md`. No route, Admin, Central or screen code changed.

## Verification
- `session:start` PASS before changes; `release:bump` first (V6.2.41 B587 to V6.2.42 B588).
- Mutation checks: 12 deliberate breakages (stale, future, replay, signature, target, manager approval, unit scope, grant cap, pending-can-work, refusal leak, unknown-state-opens, widened field list). All caught. One slipped through at first (field allowlist widened); a test was added and it is now caught.
- `npm run verify:contract`: 1484 tests, 1482 pass, 1 fail, 1 skip (M7527). The failure is M1130 (`node_modules` absent here); it passes with `CI=true`.
- `roadmap:check` and `release:identity` PASS.

## NOT TESTED / excluded
`npm run test:server`, `npm run typecheck`, `release:gate` (dependencies absent, network off). Any HTTP, `better-sqlite3`, real database, Admin/Central, screens, devices, concurrency across processes, M7527.
No devices, screenshots, EAS, stores or external integrations were used.

## Needs the owner
Same four questions as B587 in `docs/STAFF_LINK_LIFECYCLE_EXECUTION_EVIDENCE.md` (M7780 first).
