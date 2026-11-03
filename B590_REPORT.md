# NEXA Main — B590 Internal Checkpoint Report

- **Identity:** V6.2.44 B590, build 6409 (advanced with `npm run release:bump`; unsealed).
- **Scope:** NEXT run, block M7766–M7790 (Staff Link Registry), after the owner decided M7780.
- **Result:** 0 milestones fully closed. M7780 moved from BLOCKED to PARTIAL. M7786, M7789 and M7790 updated. Statuses: `MASTER_ROADMAP.md`.
- **Order note:** the first new file (`server/staffManagers.js`) was written before `release:bump` ran. No file in the sealed V6.2.43 archive was changed before the bump.

## Changes
- `server/staffManagers.js`: Director appoints and approves a Manager and names the unit; suspend, restore, remove; Manager staff requests limited to their unit; bridge caller built from the appointment.
- `server/staffManagers.contract.test.js` (16 tests), added to `verify:contract`.
- `docs/STAFF_MANAGER_APPOINTMENT_EVIDENCE.md`. No route, Admin, Central or screen code changed.

## Verification
- `session:start` PASS earlier this session; `release:bump` (V6.2.43 B589 to V6.2.44 B590) before any sealed file changed.
- Mutation checks: 10 deliberate breakages, 9 caught; the tenth is a second safety layer already covered by the unit rule.
- `CI=true npm run verify:contract`: 1517 tests, 1516 pass, 0 fail, 1 skip (M7527).
- `npm run walk` CLEAN. `roadmap:check` and `release:identity` PASS.

## NOT TESTED / excluded
`npm run test:server`, `npm run typecheck`, `release:gate` (dependencies absent, network off). Any HTTP, `better-sqlite3`, real database, Admin/Central, screens, devices, concurrency across processes, M7527.
No devices, screenshots, EAS, stores or external integrations were used.

## Needs the owner
1. Can a unit have more than one Manager?
2. Kitchen staff sign-in door: which door do they use? (still open from B587)
3. Blaca Essentials: are its staff vendor staff or Manager staff? (still open from B587)
