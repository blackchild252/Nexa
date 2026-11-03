# NEXA Main V6.0.51 B397

## What was built
- Main Login and Signup now validate credentials before persisting local 18+ age-confirmation state.
- Added a regression contract covering both Login and Signup ordering.
- Reconciled the standalone Main release handoff, release report and archive identity after the Main/Admin split.

## Verification
- Targeted auth ordering contract: 2/2 PASS.
- Release identity: PASS.
- Cumulative release gate: PASS.
- Permanent release seal: created and verified for this release.
- Archive: `NEXA-MAIN-V6.0.51.zip`.

## Not tested / excluded
- Dependency-backed device/browser runtime.
- Live external providers/API credentials.
- EAS, app stores and deployment.
