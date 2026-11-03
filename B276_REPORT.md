# B276 — V5.99.30 (checkpoint 5)

## Changed
- Removed four unused items, as approved by the owner (each checked first: set but never read, or never called):
  - M4233: `status` state in src/GroupCallScreen.tsx (and its 4 setStatus calls). The screen's own `error` state and the call data are untouched.
  - M4234: `feePreview` state in src/YaayzScreen.tsx (and its 3 setFeePreview calls). The fee preview alert and the `feePreviewId` sent on purchase are untouched.
  - M4236: the `tile` helper in src/YaayzScreen.tsx (defined, never called).
  - M4235: `previewSourceIndex` and `previewSourceHash` in src/VendorPhotos.tsx (and their setters). The client keeps only the server preview token; the server still checks the token and both hashes.
- All three edited files parse with TypeScript (0 errors).
- 3 old tests pinned the dead code and now follow the code: v5_21_0_yaayz_block (13 styled blocks, not 14; no setMode(target)), v5_98_28_current_state (M2285), v5_98_88_b235_vendor_ai_lifecycle (M3769, M3770, M3771, M3773).
- New: server/v5_99_30_b276_block_guards.contract.test.js (4 checks), registered in scripts/release-gate.mjs.

## Version note
`release:bump` went from V5.99.29 B275 to V5.99.30 B276. V5.99.29 B275 had been bumped earlier without a build, a report or a zip, so nothing was delivered under it. This release supersedes it (same as V5.99.9 / B255 before). No version was edited by hand.

## Result (per-file, 20 s limit, 8 at a time)
Start of B276: 426 pass of 434 files. Now: 427 pass of 435 (the new guard passes). The 8 that still fail here are the same as B274: b144 (5 files) and v5_98_48 need dotenv or better-sqlite3; v5_71_0 needs node_modules (passes with CI=true); b91_repair1 passes alone (about 5 s) but hits the 20 s limit when 8 files run together. Guard: 4 of 4 pass.

## Not tested
Phone (the three screens were not opened), typecheck, EAS, Playwright, anything needing node_modules, the dotenv and better-sqlite3 files.
