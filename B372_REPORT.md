# NEXA V6.0.26 B372

**B372 scope:** Demo/preview workflow completion across Consumer + Admin. The preview layer now contains real interactive workflow records for buyer/seller commerce, disputes, user/vendor violations, vendor subscription state and Admin review, while remaining strictly gated by `NEXA_PREVIEW_MODE=1`.

## M5516–M5540 — 25/25

1. Preview inventory reconciliation
2. Demo buyer/seller workflow identity mapping
3. Demo vendor dashboard fixture
4. Demo vendor product fixture
5. Demo vendor subscription-period fixture
6. Demo marketplace order fixture
7. Demo marketplace order-item fixture
8. Demo buyer dispute fixture
9. Demo seller-side dispute visibility fixture
10. Demo user-violation fixture
11. Demo vendor-violation fixture
12. Demo lifestyle report fixture
13. Admin moderation work linkage
14. Admin staff capability coverage
15. Verification review fixture continuity
16. Subscription preview continuity
17. Sky Money preview continuity
18. Aami preview continuity
19. Yaayz preview continuity
20. Zeeza preview continuity
21. Kitchen/Fitness preview continuity
22. Dami/Extensions preview continuity
23. Ball House/Game House provider-safe preview boundaries
24. Blaca Essentials cleanup tracking
25. Complete preview cleanup reconciliation

## Key fix

B372 found that the existing controlled cleanup removed the new `demo_*` records and Blaca Essentials, but did not explicitly remove the older deterministic preview identities/vendor such as `NEXA Preview Store`. Cleanup now covers the older preview identities and known showcase/demo vendor names as well.

## Production boundary

Preview data remains opt-in only. `NEXA_PREVIEW_MODE=1` is required by the demo fixture layer. Demo money is sandbox/preview-only. Ball House and Game House do not fabricate live provider/game results. Production launch must disable preview mode and execute controlled cleanup before certification.

## Verification

- Focused B365–B372 accessibility/demo suite: **73/73 PASS**
- B372 demo contract + existing demo fixture contracts: **8/8 PASS**
- Devil's Walk: **CLEAN**
- JavaScript syntax: **748/748**
- TypeScript syntax: **206/206**
- Relative imports: **657/657**
- Route targets: **43/43**
- Dependency-backed TypeScript typecheck: **NOT RUN** (no root node_modules)
- Browser/device/Playwright/live provider/EAS/store/deployment: **NOT TESTED / excluded**
- Full server suite: **NOT CERTIFIED**; prior baseline remains 5,109/5,266 PASS, 111 failed, 46 skipped.
- God Hand: **NOT CLAIMED PASSED**; prior attempt timed out.
