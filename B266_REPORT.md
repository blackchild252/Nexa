# B266 — V5.99.20 (hidden test failures, second repair)

## What was done
Repaired the 19 test files that failed only because they pinned old release identity or old document layout. Each was re-run on its own after the edit.

Repaired (re-run from `server/`):
b138_responsive_navigation, b139_production_interaction, b155_launch_config, docsTruth, v3_66_1_releaseAudit, v5_53_0_b90_recovery, v5_54_0_b91_http_hardening, v5_54_7_governance, v5_92_0_production_api_config, v5_94_0_navigation_continuity, v5_98_13_runtime_readiness, v5_98_14_major_roadmap, v5_98_15_launch_environment, v5_98_15_major_roadmap, v5_98_16_major_roadmap, v5_98_19_age_transfer_privacy, v5_98_96_b243_subscription_fee_presentation, v5_99_1_b247_release_identity, plus the lockfile control in v5_71_0_verification.

## How
- Version, Batch and build code now come from package.json, app.json and PROJECT_MEMORY.json instead of fixed numbers.
- Checks on old documents now check the new layout (`# NEXA V<version> B<batch>`, `B<batch>_REPORT.md`) or that the historical milestone record still exists in MASTER_ROADMAP.md.
- A test that required VERSION.md to restate the batch rule was changed. The locked AGENTS.md section forbids restating it.
- `b155_launch_config` said `expo.versionCode` must not exist. The locked rule says it must equal the build code. Test corrected, app.json untouched.
- `scripts/v5_71_0_verification.js` lockfileSync no longer requires a `packageManager` field in the lockfile (npm does not write one).

## Findings (not fixed, for the owner)
- README.md still says V5.98.20 B168 and `PROJECT_MEMORY.lastCompletedMilestones` still says B252. Release bump does not update them.
- MASTER_ROADMAP no longer lists many old milestone IDs; PRIORITY and TEMPORARY roadmaps lack older blocks.
- `v5_71_0_verification` M1130 (installState) needs node_modules. BLOCKED.

## Still failing, NOT repaired here
About 78 files with changed UI text, count drift, missing packages or old release checks (see the B265_REPORT.md list; the 6 and 19 files repaired in B265 and B266 are no longer failing). Two files (v5_98_83 and one other seen earlier) were killed by the 30 s limit in the sweep and still need a look.

## Not tested
Phone, EAS, Playwright, Docker, typecheck, anything needing node_modules.
