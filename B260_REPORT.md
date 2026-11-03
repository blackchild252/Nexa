# B260 — V5.99.14 (repair run; no roadmap milestones advanced)

## Found (from the owner's screenshot)
Ticker text was clipped ("e all NEXA is quiet · yo") and the NEXA Updates line wrapped to a second line that was cut off ("cought up"). Root cause: the crawling `Animated.View` sat inside a box only as wide as the visible bar, so text wrapped at that width and the measured content width was wrong.

## Built
1. `HomeCommandCenter.tsx`: `TICKER_TRACK_WIDTH = 6000` on the crawling track; `numberOfLines={1}` on the three NEXA Updates lines. Speed and animation unchanged.
2. Contract test `v5_99_14_b260_ticker_no_clip` (3 checks) registered in the release gate; mutation-checked (removing the width fails it).

## Not tested
How it looks and moves on a phone, the card layout at large text sizes, EAS build, tsc, Playwright, Docker, the ~56 server test files that hang in the sandbox.
