# B291 — V5.99.45 (checkpoint 4, M4475 to M4477)

## Changed
- src/HomeCommandCenter.tsx: the still rail strip (shown when the phone has reduced motion or animations turned off) now starts at the right edge (left padding equals the rail width), so the text no longer sits in the middle beside the label. Swiping left reveals it.
- M4476 checked: only the three Home rails crawl, and all use the one Rail component. Marketplace product and shop rails are swipe lists, left as they are.
- New guard v5_99_45_b291_rail_start (4 checks), registered in the release gate.

## What this does NOT claim
The moving rail was already coded to enter from the right edge. I could not see on a phone which path (moving or still) your video was showing. The still strip is the most likely cause of text in the middle, which happens when the phone's Remove animations or battery saver is on. If the rails still start in the middle on a build, a screenshot plus that setting will settle it.

## Checked
New guard 4 of 4. 51 older test files that read HomeCommandCenter pass.

## NOT tested
Phone, new build, full typecheck, Playwright.

## Next
Checkpoint 5: show/hide password eye, dark restoring-session screen, autofill hints, stay signed in (M4478 to M4481).
