# B269 — V5.99.23 (hidden test failures, fifth repair, PARTIAL checkpoint)

## What was done
Test files only. No app source, AGENTS.md or app.json was edited.
- Subscription Centre tests now follow the current code: subscriptionCentreSection('id'), SUBSCRIPTION_CENTRE_CANONICAL_TARGET, fee rows keyed by code, section text read from subscriptionCentre.ts (b226, b237, b240, b241, b242).
- Add Money route check now expects the deposit view (b83).
- Dami navigation checks follow the current marketplace/vendor lines and viewMap (b86 slice3).
- Sign-in and sign-up checks now expect the added adult-confirmation argument (e2e_smoke_source, v5_55_0_auth_slice1).

## Result
See the numbers in the delivery message; they come from a per-file re-run of the 82 files that failed at the B267 sweep (20 s limit each).

## Still failing (NOT repaired)
Home visual and design-release checks, v5_21_0 block files and inline-style count drift (181 vs 187, 105 vs 112), release-gate registration and old archive-name checks, v5_98_12, v5_98_77, and the remaining Subscription-era identity checks that could not be auto-removed.

## Blocked
b144_* (5 files) and v5_98_48 need dotenv and better-sqlite3. v5_21_0_design_layer needs the fonts build. v5_99_0_marketplace_storefront needs tsc.

## Not tested
Full 430-file sweep after these edits, typecheck, release gate, phone, EAS, Playwright, anything needing node_modules.
