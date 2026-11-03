# B357 — V6.0.11 — M5141–M5165

## Scope
Governed adaptive-learning retention and stale-memory cleanup for Consumer Dami and Admin Operations.

## 25 milestones
1. Define bounded adaptive-learning retention policy.
2. Add memory retention threshold.
3. Add follow-up retention threshold.
4. Add feedback retention threshold.
5. Add event retention threshold.
6. Add weak-pattern retention threshold.
7. Expire only old low-confidence active memories.
8. Preserve fresh memories regardless of low confidence.
9. Preserve active memory source-event lineage.
10. Prune completed follow-ups after retention age.
11. Prune cancelled follow-ups after retention age.
12. Preserve pending/overdue follow-ups.
13. Prune weak stale patterns.
14. Preserve stronger/repeated patterns.
15. Prune stale feedback records within owner scope.
16. Prune unreferenced stale learning events.
17. Keep cleanup profile-scoped.
18. Keep cleanup user-scoped.
19. Audit cleanup with bounded metadata.
20. Add Consumer Dami cleanup endpoint.
21. Add Admin Operations cleanup endpoint.
22. Add Consumer Dami cleanup control.
23. Add Admin AI cleanup control.
24. Add retention regression and route contracts.
25. Re-run full focused validation, Devil's Walk and release certification.

## Verification
- Focused Consumer/Admin learning + API + Admin-web + retention suite: **110/110 PASS**.
- Devil's Walk: **CLEAN**.
- JS syntax: **735/735**.
- TS syntax: **205 files**.
- Relative imports: **649/649**.
- Route targets: **43/43**.
- Blockers: **0**.
- Release identity: **PASS**.

## Boundary
Retention cleanup is explicit and owner-scoped. It does not alter canonical application data, authorization, financial truth, provider settlement, model weights or account-closure policy. Active-memory source events are retained so provenance is not broken.

## Not tested / excluded
Dependency-backed TypeScript typecheck because node_modules/dependencies are absent; browser/device/Playwright; live AI providers; EAS; stores; deployment/environment work.
