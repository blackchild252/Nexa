# B294 — V5.99.48 (M4482, owner request: no chevrons in the menu)

## Cause found
NexaPressable and NexaFocusPressable (src/motion.tsx) put the row style on the outer Pressable but wrapped the children in an inner Animated.View that was always a column. So any icon + label + trailing item row stacked vertically. This is why each menu row was double height with the chevron under the label.

## Changed
- src/motion.tsx: new pressableInnerLayout(). The inner wrapper now copies only child-layout keys (flexDirection, alignItems, justifyContent, gap, rowGap, columnGap, flexWrap) from the pressable's style and fills the pressable. Box keys (size, colour, padding, border) stay on the pressable. Applies to both pressables, so every row built with them now lays out as written, app-wide.
- src/NexaNavKeys.tsx: the > chevron is removed from every NEXA directory row. Rows are icon + label, the whole row taps. The chevrons in the Add sheet are untouched.
- src/NexaErrorScreen.tsx: stack text 11 to 12 px. The readable-text baseline tests flagged it; it came from B289.
- New guard v5_99_48_b294_menu_rows (3 checks), in the release gate.

## What this does NOT claim
The wrapper change touches every NexaPressable, so other screens will shift from stacked to row layout where they were authored as rows. Only a phone walk will show whether any screen now looks different from what you expect.

## Checked
New guard 3 of 3. 61 older test files that read motion, nav or pressables pass.

## NOT tested
Phone, new build, full typecheck, Playwright.

## Next
Ball House loading (M4483), menu-row guard (M4467).
