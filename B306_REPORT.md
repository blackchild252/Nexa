# B306 — V5.99.60 (God Hand run 3, M4525)

## Why one milestone
No open code milestone was left. M4515 is a phone re-check (BLOCKED), M4518 to M4524 are Not used, and M4314 was already closed in M4319. I did not invent milestones to reach 25. The one open code-side item was six failing server guards, so I repaired those.

## What changed (test files only, no app code)
Six guards pinned text from before the owner decision that every plan, Free included, gets basic motion (M4494), or from before the shared timing scale (M4516):
- v4_26_0_motion_ballhouse, v5_17_0_royal_fusion_visual, v5_20_0_royal_dark_3d: Free is now BASIC_MOTION_LEVEL (30), not 0.
- v5_18_0_royal_fusion_final_audit: the root layout compares against BASIC_MOTION_LEVEL, not a literal 30.
- v5_49_0_b86_navigation_final, v5_94_0_navigation_continuity: the side menu uses SIDE_MENU_MS, not a literal 280.
Each guard still checks the same intent. I compared each against the live code before changing it.

## TESTED / PASSED
- The six files run together: 63 tests, 0 failed.
- Full server suite: failures went from 31 to 25.

## The 25 that still fail (not fixed)
- Need better-sqlite3 (not installed here): b144_wallet_hardening, b144_topup_reconciler and the wallet, webhook, kitchen, mall, yaayz and Paystack tests.
- Needs dotenv: the marketplace reviews runtime test (B196).
- M1130: cause not found.
- Not tested on a real install with node_modules.

## NOT tested
- Any real phone, Light or Dark.
- Typecheck (no node_modules), Playwright.

## Next
M4515 stays BLOCKED until a phone build exists. Nothing else is open in code.
