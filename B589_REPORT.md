# NEXA Main — B589 Internal Checkpoint Report

- **Identity:** V6.2.43 B589, build 6408 (advanced with `npm run release:bump`; unsealed).
- **Scope:** NEXT run, block M7766–M7790 (Staff Link Registry).
- **Result:** 0 milestones fully closed. M7774 and M7785 moved forward and stay PARTIAL. M7789 and M7790 updated with new evidence. M7780 still BLOCKED on an owner decision. Statuses: `MASTER_ROADMAP.md`.
- **Not all 25 were advanced.** Every milestone in this block is already PARTIAL or BLOCKED. Most of what is left needs an owner decision, HTTP routes, a screen, Admin/Central, or `node_modules`, none of which could be done here. Only what could be built and proven offline was done.

## Changes
- `server/staffLinkOutbox.js`: queue of what to tell Admin and Central, fresh signing at hand-out, lease, backoff, dead after 6 tries.
- `src/staffLanding.ts`: fixed list from door answer to screen. Nothing sent by anyone is followed.
- Tests: `staffLinkOutbox.contract.test.js` (12), `staffLanding.contract.test.js` (5), both added to `verify:contract`.
- `docs/STAFF_LINK_OUTBOX_AND_LANDING_EVIDENCE.md`. No route, Admin, Central or screen code changed.

## Verification
- `session:start` PASS before changes; `release:bump` first (V6.2.42 B588 to V6.2.43 B589).
- Mutation checks: 11 deliberate breakages, all caught.
- `CI=true npm run verify:contract`: 1501 tests, 1500 pass, 0 fail, 1 skip (M7527).
- `npm run walk` CLEAN. `roadmap:check` and `release:identity` PASS.

## NOT TESTED / excluded
`npm run test:server`, `npm run typecheck`, `release:gate` (dependencies absent, network off). Any HTTP, `better-sqlite3`, real database, Admin/Central, screens, devices, concurrency across processes, M7527.
No devices, screenshots, EAS, stores or external integrations were used.

## Needs the owner
Same questions as B587 in `docs/STAFF_LINK_LIFECYCLE_EXECUTION_EVIDENCE.md`. M7780 first: who approves a Manager appointment, and where the Manager's unit comes from.
