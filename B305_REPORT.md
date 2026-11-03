# B305 — V5.99.59 (God Hand run 2, M4516 to M4517)

## Note on B304
V5.99.58 B304 was sealed with the same work but never delivered: the older M4497 guard (god_hand_run1_transitions) matched the text `SIDE_MENU_MS = 280`, and the value now comes from the scale. That guard now checks `MOTION_MS.menu` and that menu is 280. B305 is B304 plus that fix.

## Why only two milestones
The roadmap has nothing else open in code. M4515 is a phone re-check (BLOCKED, needs a phone) and M4518 to M4524 are marked Not used. I did not invent extra milestones to reach 25.

## What changed
- M4516: src/motionTiming.ts holds one named scale (instant, blink, enter, item enter, menu, pulse, breathe). motion.tsx (screen and item enter, side menu, loading pulse), NexaGlossyOrb (breathing) and NexaDamiRobot (blink) use it. Every value is the same as before, so nothing looks different.
- M4516 limit: 110 raw numbers remain, nearly all in world-ambient files (Earth, Dark, Cosmos, Dami, depth layer). Each is tuned artwork. A guard test now fails if that count grows.
- M4517: scanned every colour not already inside tc(), excluding the theme palette and world artwork: 37 lines in 15 files. One real fault: Wallet.tsx history list showed debit amounts in raw white, invisible on Earth Light. Now uses theme.colors.text.
- M4517 left as designed: white on photos, scrims, sale badge red, coloured dock orbs, call screens, theme-picker preview swatches, black text on the gold button.

## TESTED / PASSED
- god_hand_run2_timing.contract.test.js (4 of 4), registered in the release gate.
- god_hand_run1_transitions.contract.test.js M4497 guard updated and passing (10 of 10 across both files).

## NOT tested
- Any real phone, Light or Dark.
- Typecheck (no node_modules), Playwright.
- The 31 existing server failures (same as untouched V5.99.55).

## Next
M4515 stays BLOCKED until a phone build exists. Nothing else is open in code.
