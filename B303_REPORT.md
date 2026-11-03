# B303 — V5.99.57 (layout and interface, M4510 to M4514)

## What changed
- M4510: menu moves replace the previous menu hop instead of stacking (menuMoveMode in nexaNavKeys.ts). Home and Notifications reset it. Signup has a Back button.
- M4511: nav bar spacing and title padding reduced (about 26dp more for the title), title 15px, menu labels 14. Keys stay 44dp.
- M4512: src/nexaLoopRegistry.ts and src/nexaAppStatePause.ts. Every Animated.loop pauses when the app goes to the background and restarts (as a fresh loop) on return. Applied once from the app root.
- M4513: audited, see below. No code change.
- M4514: unread-dot text 11 to 12.

## M4513 finding
The roadmap said groupStyles.ts, socialStyles.ts and the shared styles bypass the theme. They do not: every colour in them already goes through tc(). Raw colours that remain are the theme palette itself, world artwork (Earth, Dark, Cosmos, Orb, Robot) and photo overlays. Left as designed. Light and Default were not looked at on a phone.

## TESTED / PASSED
- god_hand_run1_layout2.contract.test.js (6 of 6), registered in the release gate. The loop pause logic is simulated in the test.

## NOT tested
- Any real phone.
- M4512: replacing Animated.loop could not be run against React Native here. If the patch fails on a build it silently does nothing (old behaviour). Check that backgrounds pause and resume.
- M4511: the longest title (Dream Marketplace) may still wrap at 360dp or with large text.
- Typecheck (no node_modules), Playwright.
- The full server suite still has the 31 failures that also fail on untouched V5.99.55.

## Remaining in run 1
None of M4490 to M4514 is left open in code. M4515 (phone re-check) stays BLOCKED, M4516 and M4517 are next.
