# B273 — V5.99.27 (checkpoint 3 of M4250–M4274)

## Changed
- No app or server code changed. Tests only.
- Tests follow the code (each checked against the real source first): v5_17_0, v5_21_1, v5_49_0 (navigation_final, navigation_slice2), v5_98_11, v5_98_12 (1884), v5_98_83 (M3663), v5_98_88 (M3763, M3768), v5_98_92 (M3863, M3870), b91_marketplace_shops.
- Retired on purpose (skipped, labelled, not counted as passed): v5_98_24 M2199, v5_98_77 "environment-independent", v5_98_80 M3587, v5_98_83 M3655.
- New: server/v5_99_27_b273_block_guards.contract.test.js (4 checks), registered in scripts/release-gate.mjs.

## Checked and found still correct in the code
Admin Disputes button is shown only to admins. Navigation provider is re-keyed on theme, text size and font. Vendor AI approval saves only a stored preview that matches its token and both hashes.

## Result (per-file, 20 s limit, no node_modules, 8 at a time)
Start of B273: 408 pass of 432 files. Now: 422 pass of 433. The one other non-environment failure, v5_99_8, passes once these notes exist. Guard: 4 of 4 pass.

## Still failing here (environment or slow)
b144 (5 files), v5_98_48: need dotenv or better-sqlite3. v5_98_45, v5_99_0: need tsc. v5_71_0: needs node_modules (passes with CI=true). b91_repair1: passes alone in about 6 s, can hit 20 s under load.

## Not tested
Phone, typecheck, EAS, Playwright, anything needing node_modules.
