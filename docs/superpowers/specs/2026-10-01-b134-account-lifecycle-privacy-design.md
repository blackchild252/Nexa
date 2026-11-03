# B134 / M1675-M1699 — Account Lifecycle, Privacy & Data Portability Maturity

## Baseline
- Release baseline: V5.92.0 / B133 sealed
- Scope: server-side account lifecycle, privacy, portability, retention, cross-module ownership, auditability, and regression protection
- Exclusions: environment/dependency concerns, destructive database resets, replacement of existing architecture, and changes to the sealed V5.92.0 artifact

## Goal
Strengthen the existing NEXA account lifecycle so account state, sessions, personal data, exports/imports, retention, closure, and cross-module ownership remain consistent under normal, repeated, concurrent, and failure conditions.

## Existing architecture to preserve
- `server/accountLifecycle.js` remains the account-closure orchestration boundary.
- `server/auth.js` remains the authentication/session boundary.
- `server/sessionMaintenance.js` remains session cleanup support.
- `server/accountPortability.js` remains export/import ownership boundary.
- `server/dataRetention.js` remains retention/purge boundary.
- Existing closure-integrity modules and retained commerce rules remain authoritative.

## 25 milestones
1. M1675 account lifecycle state integrity
2. M1676 closure/deactivation consistency
3. M1677 session invalidation boundary
4. M1678 authenticated ownership boundaries
5. M1679 user data inventory integrity
6. M1680 export eligibility rules
7. M1681 export generation integrity
8. M1682 export completeness coverage
9. M1683 export authorization
10. M1684 export integrity/checksum behavior
11. M1685 privacy-sensitive data handling
12. M1686 deletion-request boundary
13. M1687 retention-policy enforcement
14. M1688 historical-record preservation
15. M1689 cross-module account cleanup
16. M1690 Yaayz lifecycle alignment
17. M1691 Zeeza lifecycle alignment
18. M1692 AI/account-data isolation
19. M1693 audit logging
20. M1694 recovery safeguards
21. M1695 failure/retry handling
22. M1696 regression contracts
23. M1697 security/authorization regression
24. M1698 cumulative cross-module verification
25. M1699 B134 release certification

## Data-flow rules
1. Closed accounts cannot authenticate, create sessions, export, or import.
2. Closure revokes sessions and removes only data explicitly classified as deletable.
3. Financial, legal, settlement, and historical records remain retained where required by existing NEXA integrity rules, with personal identifiers redacted where the current architecture requires it.
4. Portable exports include only an explicit allowlist and never credentials, sessions, provider secrets, or administrative data.
5. Imports may modify only the authenticated account's owned data and must reject cross-account identifier collisions.
6. Retention jobs use bounded policies and never delete retained financial/history records.
7. Cross-module cleanup must be idempotent and transactional at its existing boundaries.
8. Audit events must not leak secrets or unnecessary personal data.
9. Existing APIs and UI behavior remain compatible unless a security/privacy defect requires a narrowly scoped correction.

## Verification strategy
- Every behavior change gets a regression test first.
- Focused B134 contracts cover each milestone group.
- Existing server regression contracts remain green.
- Security/adversarial contracts are included in the package gate.
- No environment/dependency state is used as a B134 product acceptance criterion.

## Release condition
B134 advances only after M1675-M1699 are implemented/validated as one coherent package and the complete release certification succeeds. The batch advances exactly once: B133 -> B134.
