# B298 — V5.99.52 (God Hand run 1, group 1: bugs)

## What changed
- Test fix: server/v5_99_39_b285_block_guards.contract.test.js test 3 now checks the field the locked rule still writes (expo.extra.versionCode). The locked identity script was not touched.
- M4490: Home menu rows no longer show a chevron (src/HomeCommandCenter.tsx). The rail ticker chevron is a separate control and was left alone.
- M4491: a menu row now does nothing only when you are already on that module's own root screen (src/nexaNavKeys.ts isOnModuleRoot, used in src/NexaNavKeys.tsx). Zeeza Inbox then Zeeza, Wallet then Sky Money, Disputes then Marketplace now navigate.
- M4492: NexaPressable and NexaFocusPressable forward every extra prop (onLongPress, testID, accessibilityHint and others) to the Pressable. The caller's onPressIn and onPressOut run alongside the press animation (src/motion.tsx).
- M4493: Yaayz post card already passed onPressIn; it is now forwarded, so views can be counted. Guard added.
- New guard file server/god_hand_run1_bugs.contract.test.js, registered in the release gate.

## TESTED / PASSED
- B285 guard test file (4 of 4) and the new guard file (4 of 4).

## NOT tested
- Phone, new build, full typecheck (no dependencies installed here), Playwright.
- M4491 compares the screen path only. A sub-view that uses only a query value on the same path (for example a Wallet view) is treated as the root.

## Remaining in run 1
M4494 to M4514 (21 milestones).
