# B252 — V5.99.6

## Repairs
1. Earth Light accent and status text colours (water blue, forest green, success, error) fell below 4.5:1 on tinted surfaces (active-tab wash, info/error panels). Nine tokens darkened by 4–9%: brightGold/goldBright/goldText/focus #1A70B8→#1767A9, goldHot →#1867AA, royalGold #2F7D4F→#2A7147, success →#1D7343, error/danger →#B83629. Royal Dark unchanged.
2. Hard-coded dark literal map and the keyboard focus ring colour aligned to the repaired tokens.

## Verified, no defect
- All Directory, Add and Home navigation targets resolve to real route files.
- Live router root is src/app; its status bar and background already follow the theme. Legacy app/_layout.tsx is ignored by Expo Router (an edit made there mid-run was reverted).

## Build identity
V5.99.6 / B252 / build code 6071 in every app.json field. Package com.aami.nexa unchanged.

## Roadmap
M4125–M4137 done; M4138–M4147 DEFERRED (on-device Light-theme sweep and per-world flow polish need screenshots); M4148–M4149 release.

## Verification
See the run summary for exact counts. NOT TESTED: on-phone rendering, EAS build, install-over-old, full typecheck, full server suite (no node_modules/network).
Pre-existing, unrelated: v5_21_0_dual_theme B57 and the B250 identity test fail on the original upload as well.
