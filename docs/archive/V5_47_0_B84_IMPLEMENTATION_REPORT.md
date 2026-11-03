# NEXA V5.47.0 — B84 Navigation Integrity & Dead-Action Audit

## Scope
Extended the B83 navigation audit beyond the newly restored Add tool. The batch traces canonical navigation destinations to the real route tree, checks Home directory parity, verifies Add destinations, audits primary navigation handlers, and detects named no-op callbacks.

## Real defect found and repaired
`src/app/(tabs)/money.tsx` passed `onOpenMarketplace={()=>{}}` into `MoneyDashboard`. The visible **Open Marketplace payments & history** action therefore did nothing.

Repair: wired the existing action to `router.push('/(tabs)/marketplace')`. No new route, backend authority, payment authority, or advertising surface was introduced.

## B84 milestones
555. Canonical route-existence audit for the NEXA navigation resolver
556. Home directory ↔ navigation registry parity contract
557. Add-action route integrity certification
558. Sky Money → Marketplace payments/history dead-action repair
559. Primary Back/Search/Add/Home/Menu handler certification
560. Named navigation no-op callback detection
561. Full Home directory destination-set certification
562. Cross-module navigation resolver-family certification
563. Navigation-only authority boundary regression
564. B84 cumulative regression, metadata, audit and package certification

## Certification
- B84 focused: 11/11 PASS
- Full cumulative server suite: 1,255/1,255 PASS
- Release audit: PASS — 5.47.0
- Frontend TypeScript: NOT RUN — dependencies absent
- Native/device runtime: NOT TESTED — launch validation remains deferred
