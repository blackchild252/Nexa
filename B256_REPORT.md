# B256 — V5.99.10 (supersedes undelivered V5.99.9 / B255) (stabilization run; no roadmap milestones advanced)

## Why
A Devil's Walk found `eas.json` production `autoIncrement: true` (local version source): EAS would rewrite the build code in `app.json` on its own, outside `release:bump`.

## Built
1. `autoIncrement` removed from `eas.json`.
2. `scripts/release-identity.mjs check` fails if any EAS profile enables `autoIncrement` or `appVersionSource` is not `local`.
3. Old test `v5_21_1_admin_disputes_route` corrected (it required autoIncrement).
4. Contract test `v5_99_9_b255_eas_version_authority` (3 checks) added to the release gate; ADR recorded; Devil's Walk section appended to `DEVILS_WALK_REPORT.md`.

## Not tested
EAS build itself, `tsc`, Expo export, Playwright, Docker, device behaviour, 56 server test files that hang in the sandbox, cloud deployment.
