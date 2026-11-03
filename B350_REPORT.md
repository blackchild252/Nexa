# B350 — V6.0.4 — Dami learning controls and follow-up integrity

## Roadmap
M4966–M4990 / B350 — 25/25 completed.

## Scope
Consumer Dami adaptive-learning usability, follow-up integrity, owner-scoped learning controls, and release certification. Environment, device, EAS, stores, live providers and deployment remain excluded.

## 25 milestones
1. Re-verify B349 sealed baseline before modification.
2. Advance release identity through locked tooling to V6.0.4 B350.
3. Preserve base-100 version rollover enforcement.
4. Reconcile consumer learning API surface with current server authority.
5. Align follow-up client payload naming with server `reason` contract.
6. Preserve optional follow-up memory association.
7. Add consumer learned-memory confirmation control.
8. Add consumer learned-memory correction control.
9. Add consumer learned-memory forgetting control.
10. Refresh learning state after every feedback action.
11. Display learning source type to the user.
12. Display effective confidence rather than raw confidence.
13. Limit the visible memory list to a compact user-manageable set.
14. Add explicit Dami learning export control.
15. Keep learning export owner-scoped through the server.
16. Add explicit adaptive-learning reset control separate from preference reset.
17. Preserve pending-follow-up cleanup on adaptive reset.
18. Surface overdue follow-up count without silently completing work.
19. Preserve explicit follow-up completion ownership checks.
20. Add regression coverage for overdue follow-up context.
21. Add regression coverage for owner-scoped learning export.
22. Add contract coverage for consumer feedback/export/reset/follow-up routes.
23. Run combined Consumer/Admin focused contracts: 72/72 PASS.
24. Run Devil’s Walk: CLEAN, 0 blockers.
25. Reconcile release records and produce the named B350 archive.

## Validation
- Focused Consumer Dami + adaptive learning + Admin web contracts: **72/72 PASS**
- Devil’s Walk: **CLEAN**
- JavaScript syntax: **733/733**
- TypeScript syntax: **205 files**
- Relative imports: **649/649**
- Route targets: **43/43**
- Blockers: **0**
- Typecheck: NOT RUN — no node_modules.
- Browser/device/Playwright/live AI provider/EAS/store/deployment: NOT TESTED.

## Product boundary
Dami remains governed adaptive learning, not consciousness or autonomous model-weight training. Learned memory remains owner-scoped, non-authoritative and removable. Server authorization and canonical business truth remain outside the learning memory.

## Release
- Version: V6.0.4
- Batch: B350
- Build: 6169
- Archive: `NEXA-V6.0.4.zip`
