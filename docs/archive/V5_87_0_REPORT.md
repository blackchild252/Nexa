# NEXA V5.87.0 / B128 — Account Lifecycle / Privacy / Data Portability Maturity

B128 closes an account-lifecycle gap around vendor-staff relationships and makes newer ownership relationships explicit in the closure contract. The repair preserves financial history while preventing active staff access from surviving a closed account or closed vendor.

## Milestones
M1525–M1549: **25/25 IMPLEMENTED / VALIDATED**.

## Repair
- Added a canonical closure relationship manifest for newer ownership/reference columns.
- Added account-closure cleanup for `vendor_staff`: closed staff users lose active/invited relationships, and closing a vendor owner removes remaining staff access from that inactive vendor.
- Invite codes are cleared while removed staff history remains available for audit continuity.
- Classified `kitchen_referrals` as account-owned and delete-on-closure.
- Kept kitchen orders and cashback records in the financial/history retention boundary.
- Added relationship-table coverage to closure readiness so missing lifecycle dependencies are surfaced before closure.
- Preserved existing vendor deactivation, notification ownership, session revocation, push-token retirement, export denial and closed-target import denial.

## Verification
- Focused B128 contract: **26/26 PASS** (25 milestone assertions + behavioral cleanup probe).
- JS syntax checks for changed modules: **PASS**.
- Cumulative B112–B128 contract tests: **373/373 PASS**.
- JS/MJS/CJS syntax: **456/456 PASS**.
- Release consistency: **3/3 PASS**.
- Static release suite: **40/40 PASS**.
- Release audit: **PASS — V5.87.0**.
- Full server suite: **ATTEMPTED / BLOCKED after 36 observed tests by authoring-session execution ceiling**; no full-suite PASS claimed.
- Dependency-backed gate: **BLOCKED — node_modules absent**.

## Release
B128 is sealed as `NEXA-V5.87.0-B128.zip`.
