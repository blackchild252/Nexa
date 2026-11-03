# B258 — V5.99.12 (repair run; no roadmap milestones advanced)

## Found (from the owner's phone screenshot)
Home header (NEXA, + and menu) was drawn under the Android status bar. `HomeCommandCenter` used `paddingTop: 8` and the menu panel `paddingTop: 18`; neither used the real safe-area inset (the app is edge-to-edge on this Expo SDK).

## Built
1. `HomeCommandCenter.tsx`: root `paddingTop = insets.top + 8`, `paddingBottom = max(safeBottom, insets.bottom)`; menu panel `paddingTop = insets.top + 18`, `paddingBottom = insets.bottom`.
2. Contract test `v5_99_12_b258_home_safe_area` (3 checks) registered in the release gate.

## Process note
The edit was first made on sealed V5.99.11 source; `release:bump` was then run before testing or shipping, so V5.99.11's seal file is untouched and this release is V5.99.12.

## Not tested
How it looks on a phone, other screens' top spacing, EAS build, tsc, Playwright, Docker, the ~56 server test files that hang in the sandbox. Three older tests (b138, v5_21_0 design layer, v5_98_11) fail the same way on the sealed V5.99.11 baseline.
