# B257 — V5.99.11 (M4138–M4149 internal source-level run)

## Found
White 12px discount-badge text sat on `theme.colors.error`. On Royal Dark that is #E74C3C = 3.82:1 (below 4.5). Light was already fine (5.84:1).

## Built
1. `SALE_BADGE_BG = '#B83629'` used by the 3 discount badges in `MarketplaceScreen.tsx` (1) and `MarketplaceStorefront.tsx` (2). Royal Dark palette untouched.
2. Contract test `v5_99_11_b257_sale_badge_contrast` (3 checks), registered in `scripts/release-gate.mjs`. Mutation-checked: restoring the old colour makes it fail.

## Checked, no defect
Earth/Dark cross-imports, unlabeled pressables, dead handlers, tiny fonts, Dark/Earth scene parity.

## Not tested
On-device light-theme sweep (M4147, deferred), EAS build, tsc, Expo export, Playwright, Docker, device behaviour, the ~56 server test files that hang in the sandbox.
