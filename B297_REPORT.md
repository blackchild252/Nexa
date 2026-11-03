# B297 — V5.99.51 (audit roadmap, planning only)

## What this release is
No app code changed. Two find-only audits (layout, interface, borders and navigation; then transitions) and the owner's theme request are combined into one roadmap block in MASTER_ROADMAP.md, PRIORITY_ROADMAP.md and TEMPORARY_ROADMAP.md. The block is exactly 25 milestones, M4490 to M4514, in the order God Hand run 1 will work them.

## Owner decisions recorded
- Transitions are basic for everyone, Free accounts included (M4494). Ambient world animations and richer effects stay tiered by plan.
- The app gets three appearance options: Default (follows the phone, the starting choice), Dark and Light (M4500 to M4504). Saved Dark or Light choices are kept.

## Queue order
Bugs (M4490 to M4493), transitions (M4494 to M4499), theme (M4500 to M4504, depends on M4499), layout and navigation (M4505 to M4514). Backlog: M4515 phone re-check (blocked, needs phone), M4516 shared timing scale, M4517 remaining hard-coded colours.

## Correction to an earlier report
B294 said every menu row lost its chevron. That was only true for the inner-screen menu. The Home menu still has chevrons (M4490).

## Border audit result
All 22 border advisories from the walk were checked. Each has a base style that sets the width. No border bug found.

## Found while planning (full sweep with tests)
- server/v5_99_39_b285_block_guards.contract.test.js, test 3, fails. It expects the old expo.versionCode field that the locked rule removed, so the test is stale, not the tooling. It also fails on the original V5.99.48 zip. First item for God Hand run 1 (fix the test, never the locked identity rule).
- The God Hand planner names its own queue M4525 to M4549 and reads the next milestones generically. The real queue is M4490 to M4514 above.

## NOT tested
Everything is planned only. No phone, build, typecheck or Playwright.

## Next
God Hand run 1: fix the stale b285 test first, then M4490 to M4514 in order.
