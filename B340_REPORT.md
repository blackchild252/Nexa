# B340 — V5.99.94

## Admin Staff Command Center

Implemented the next Admin roadmap slice on top of B339 Staff delegation.

### Fixed / added
- Staff Work queue now supports server-side status, priority and capability filters.
- Queue returns status and priority counts for workload visibility.
- Owner Admin can batch-assign selected work to a capability-compatible Staff member.
- Batch assignment validates every selected work item before changing any assignment.
- Owner Admin can reclaim delegated work.
- Owner Admin can resolve delegated work with a mandatory resolution note.
- Resolved/cancelled work is protected from reclaim and batch reassignment.
- Assignment, reclaim and resolution actions are audited.
- Admin Staff Work UI now has workload counters, filters, multi-select assignment, reclaim and resolution controls.
- Admin route guide updated for all new Staff Work routes.

### Validation
- Admin-web: **61/61 PASS**
- Focused Staff/governance contracts: **21/21 PASS**
- Changed JavaScript syntax: **PASS**
- Route-guide synchronization: **PASS**

### Not tested
- Full dependency-backed server runtime.
- Real TypeScript typecheck (node_modules unavailable).
- Real browser/device/Playwright.
- EAS, stores and external providers.
- Environment/device work was excluded by project scope.
