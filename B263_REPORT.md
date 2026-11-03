# B263 — V5.99.17 (M4200–M4224)

## Owner-approved and built
1. **M4161 — dark error text.** New `errorText` colour #F26B5C: 4.81:1 on the raised surface (was 3.76:1), 5.35:1 on the error tint, 7.03:1 on black. 14 text uses moved to it. The red fills with white text (call end/decline buttons) keep the old red on purpose, because a lighter red would make their white text harder to read. Light theme gets a matching `errorText` with the same look as before.
2. **M4166 — Home top spacing.** Four levels (Standard, A little more, More, Most = +0/8/16/24) added to the automatic phone-safe spacing. Saved on the phone, loaded at start-up, set in Profile & Settings. Applies to the Home screen and its menu panel only.

## Cleanup
- **M4165 unused imports.** TypeScript (standalone config) found 39 unused names. 28 unused imports were removed; before/after error counts are identical for every other error type.
- **Real defect found by that check:** Notification Center built a screen-reader message but never displayed it. It now renders it. The old test only matched the words in the source.
- **M4190 empty catch blocks (151).** Sorted by kind: database upgrade steps, JSON fallbacks, cleanup, best-effort alerts. One money-adjacent case (Yaayz fee settle after payment confirmation) now writes a warning to the log; behaviour is unchanged.
- **M4191 index keys.** Reviewed; only append-only chat messages and fixed decorative shapes. Safe.

## Tests
Guard `v5_99_17_b263_block_m4200_guards.contract.test.js`: 11/11 PASS, mutation-checked (5 repairs put back one at a time, each made the guard fail). Related-test comparison against the untouched V5.99.15: 239 tests mention changed files; 80 fail, 78 of them also fail in the original; the 2 caused by this release are resolved.

## Deferred
M4147 on-device sweep; 10 unused local variables (not imports, may be unfinished work); 78 older historical tests that already failed before this release (cause not investigated, not in the release gate).

## Not tested
Seeing the new colour or the spacing control on a phone, EAS build, Playwright, Docker, server runtime tests. TypeScript ran without the project's packages, so its missing-module and missing-type errors are noise.
