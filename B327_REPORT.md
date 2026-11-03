# B327 report (V5.99.81)

## What was done (M4581)
- Added the Combined roadmap to MASTER_ROADMAP.md: one list for the phone app and the admin web app. Each milestone is tagged APP, ADMIN or BOTH. Rule: a feature is finished only when both sides are.
- First combined set C1 (M4581 to M4605). It was built from the real files:
  - 9 admin screens the server already has routes for but admin-web does not (Mall disputes, review reports, reviews, status and launch offer; payments needing attention; operations; launch readiness and recovery; fitness gyms; leisure operations), plus the guide and permission work they need.
  - Gaps found by reading the code: removing a Lifestyle post or comment sends the author no notice; src/ has no handling of the ACCOUNT_SUSPENDED code; report lists stop at 100; the action log shows ids, not names.
  - The four app items B297 left as PARTIAL (M4499, M4511, M4513, M4516).
  - Two drift tests and the closing check.
- CLAUDE.md got one line (rule 7) so every future session starts from this list. The locked naming section in AGENTS.md was not touched.
- Parked and blocked items are listed in the same section with the reason, so nothing is lost.

## Tested (PASSED)
- Release identity and the ship checks (below, from release:ship).

## NOT tested
- Nothing in src/, server/ or admin-web/ changed, so no app or server behaviour was re-run. The items in C1 are PLANNED, not done.
- C1 route lists come from reading server/index.js; the exact who-may-call rules for each route get checked when its milestone is built.

## Next
- Say NEXT to start C1 (M4581 is done, so the run takes M4582 onward).
