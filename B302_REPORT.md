# B302 — V5.99.56 (layout and interface, M4505 to M4509)

## What changed
- M4505: s.smallButton and Marketplace "+ Add" now have a 44dp minimum height (theme.accessibility.minTouchTarget).
- M4506: new KeyboardSafe wrapper (src/KeyboardSafe.tsx, src/keyboardOverlap.ts) pads a screen by the part the keyboard covers. Added once in NexaWorldBackground, so the screens built on it are covered. Auth screens keep their own handling.
- M4507: login and signup scroll (ScrollView, taps stay live while the keyboard is open). Fields and the 18+ box are unchanged.
- M4508: src/nexaSafeArea.ts. Tab bar height and bottom padding, side-menu top padding, Add sheet bottom padding and stack-screen bottom inset use the phone's insets. With no inset the values equal the old fixed ones.
- M4509: ZeezaChase, MarketplaceScreen cart bar, Profile privacy toggles and Storefront toggle can shrink their text and keep the end control on screen.
- Two old tests that hard-coded the tab bar height 76 now check the helper.

## TESTED / PASSED
- server/god_hand_run1_layout.contract.test.js (7 of 7), registered in the release gate.

## NOT tested
- Any real phone. M4506 (Android edge-to-edge, overlap with Zeeza's own keyboard handling) and M4508 (gesture bar, notch) most need a device.
- Typecheck (no node_modules), Playwright.
- The full server suite has 31 failures that also fail on the untouched V5.99.55 (wallet, webhook, Paystack and reduced-motion tests). Not caused by this release; not diagnosed.

## Remaining in run 1
M4510 to M4514.
