# B264 — V5.99.18 (M4225–M4249)

## What was done
- **Unused names (M4212).** TypeScript found 12, not 10. Removed 5 dead ones: two imports in `app/index.tsx` (GroupsTab, errorA11y) and three local names (width in Home, amount in Kitchen order, cols in Marketplace). TypeScript error counts before and after are identical.
- **Two kept on purpose.** `UPLOAD_TIMEOUT_MS` (api.ts) and `ambient` (NexaDamiRobot) look unused, but older guard tests (v5_54_3 and v5_22_0) require those exact lines. My first attempt removed them and the full test sweep caught it. Both were put back.
- **Deferred.** Five set-but-never-read items may be unfinished screens: `status` (group call), `feePreview` (Yaayz), `previewSourceIndex` and `previewSourceHash` (vendor photos), and the unused `tile` helper (Yaayz).

## Test sweep
All 429 server test files, 25 seconds each, no node_modules. Untouched V5.99.17: 319 pass, 107 fail, 3 time out. V5.99.18: 320 pass, 107 fail, 3 time out. The only difference is the new guard. Nothing regressed.
The 107 failures by cause: 19 need missing packages; 47 hard-code an old version or Batch; 41 not looked at one by one. These are older historical tests, not in the release gate.

## Guard
`v5_99_18_b264_block_m4225_guards.contract.test.js`: 4/4 PASS. Two repairs were mutation-checked; the others were not.

## Note on the working folder
The sandbox held changes that were not in your uploaded zip. I did not make them in this run and could not tell where they came from. I set them aside and rebuilt from your V5.99.17 zip.

## Not tested
Phone, EAS, Playwright, Docker, and any test needing node_modules. No app behaviour changed.
