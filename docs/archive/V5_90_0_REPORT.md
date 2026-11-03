# NEXA V5.90.0 / B131 — Account Closure Ownership Predicate Integrity

B131 repaired a concrete account-closure ownership gap: several tables classified for deletion do not have a `userId` column, so the generic closure loop intentionally skipped them without a dedicated cleanup path.

## Milestones
M1600–M1624: **25/25 IMPLEMENTED / VALIDATED**.

## Repair
- Added explicit ownership classification for marketplace inquiries, inquiry requests/messages, interaction reports, kitchen referrals and vendor exception evidence.
- Added transactional cleanup using the correct owner columns.
- Inquiry child records are deleted before inquiry parents.
- Vendor exception evidence is resolved through vendors owned by the closing account.
- Existing financial-history retention and vendor lifecycle behavior remain unchanged.

## Verification
- Focused B131 contract: **25/25 PASS**.
- Cumulative B112–B131 contract tests: **448/448 PASS**.
- JS/MJS/CJS syntax: **463/463 PASS**.
- Release consistency: **3/3 PASS**.
- Release audit: **PASS — V5.90.0**.
- Static release suite: **40/40 PASS**.
- Dependency preflight: **BLOCKED — `node_modules` absent in the authoring environment**.
- Full server suite: **NOT RUN — dependency environment unavailable**; no full-suite PASS claimed.
- Release archive: `NEXA-V5.90.0.zip`.
- Next block: **M1625–M1649 / B132**.
