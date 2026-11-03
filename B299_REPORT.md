# B299 — V5.99.53 (God Hand run 1, group 2: transitions)

## What changed
- M4494: every account, Free included, gets basic motion (level 30: screen change, press feedback, menu and sheet open, loading). World ambient and richer effects stay tiered (src/motion.tsx BASIC_MOTION_LEVEL).
- M4495: the default motion state already has basic motion, so nothing flips from none to animated when the plan arrives after sign-in.
- M4496: bottom tabs switch with one short fade, or none under reduced motion (src/app/(tabs)/_layout.tsx).
- M4497: one rule for Modals (modalAnimationType / useModalAnimation): bottom sheets slide, centred dialogs fade, reduced motion means none. Applied to the Add sheet, the Home call sheet, the Vendor Photos preview and the Profile close-account dialog. Both side menus use one shared duration (SIDE_MENU_MS).
- M4498: reduced motion is asked of the phone when motion.tsx loads, before the first screen. Until the phone answers, motion is held off instead of assumed on.
- M4499 (PARTIAL): the rebuild after a theme, text size or font change still happens, because module-level styles need it. It now only calls router.replace when the user is no longer on the screen they were on, which removes the extra flash when the route survives.
- New guard file server/god_hand_run1_transitions.contract.test.js, registered in the release gate.
- Four older guard tests were updated because they asserted the old behaviour the owner decided to change: b79_motion_safety test 2, v5_98_65_b214_motion test 1, v5_43_1_batch_b81 test 7, v4_31_0_batch_b11 test 1.

## TESTED / PASSED
- New guard file (6 of 6), the four updated tests, and the other motion-related guard files.
- Release gate: 336 of 337 before the notes were written; the one failure was the missing B299 notes, which this report fixes.

## NOT tested
- Phone, new build, typecheck (no dependencies installed here), Playwright.
- Whether the tab fade and Modal slides look right on a device.
- M4499: whether the navigator keeps the user's screen when it is rebuilt. This needs a phone; until then the old restore step stays as a fallback.

## BLOCKED
- M4499 full fix (switch theme without rebuilding the screen): needs a phone to confirm behaviour. Theme work M4500 to M4504 builds on the existing rebuild.

## Remaining in run 1
M4500 to M4514 (15 milestones).
