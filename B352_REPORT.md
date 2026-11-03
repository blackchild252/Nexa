# B352 — V6.0.6 — Dami Learning Privacy Lifecycle Integration

## Roadmap
M5016–M5040 / B352 — 25/25 completed.

## 25 milestones
1. Advance release identity through locked release tooling.
2. Preserve V6.0.6 / B352 / build 6171 consistency.
3. Audit Dami learning against canonical account portability.
4. Identify learning tables as user-owned adaptive data.
5. Include consumer Dami learning in eligible account exports.
6. Preserve owner scoping while exporting learning records.
7. Preserve Consumer Dami profile identity in exported learning metadata.
8. Keep adaptive learning outside the generic account-import table allowlist.
9. Prevent imported bundles from injecting learning profile/event lineage.
10. Preserve canonical account-import authorization boundaries.
11. Audit Dami learning against account-closure lifecycle.
12. Delete learning events during account closure.
13. Delete learning feedback during account closure.
14. Delete derived learning patterns during account closure.
15. Delete learning follow-ups during account closure.
16. Delete adaptive memories during account closure.
17. Keep financial/transactional retention rules unchanged.
18. Preserve session revocation at account closure.
19. Preserve closed-account export blocking.
20. Preserve owner/profile isolation for adaptive state.
21. Correct overdue follow-up regression coverage to distinguish runtime status from stored lifecycle state.
22. Add privacy lifecycle contract coverage for export and closure.
23. Run combined Consumer/Admin learning + privacy regression coverage.
24. Run Devil's Walk and release identity verification.
25. Reconcile roadmap/handoff/architecture records and package the named release archive.

## Validation
- Focused Consumer/Admin learning + API + Admin-web + privacy suite: **86/86 PASS**.
- Devil's Walk: **CLEAN** — JS 734/734, TS syntax 205, relative imports 649/649, route targets 43/43, 0 blockers.
- Release identity: **PASS** — V6.0.6 B352, build 6171.
- Dependency-backed TypeScript typecheck: **NOT RUN** — dependency environment unavailable.
- Browser/device/Playwright, live AI providers, EAS, stores and deployment: **NOT TESTED / excluded**.

## Product boundary
Dami adaptive learning remains governed, owner-scoped application memory. Account portability exports the user's eligible learning copy, while generic account import cannot inject learning lineage or profile authority. Account closure removes the learning records; canonical financial/account records retain their existing integrity rules.

## Release
- Version: V6.0.6
- Batch: B352
- Build: 6171
