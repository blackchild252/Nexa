# NEXA V5.1.0 — B37

## Scope
Cross-module notification targeting, deep-link continuity, stale-response protection, and versioning correction.

## Changes
1. Corrected release versioning from the invalid V4.100.0 line to V5.1.0.
2. Marketplace vendor notifications now retain order identity and target the vendor Orders surface.
3. Marketplace buyer notifications retain order identity and target Orders.
4. Yaayz ticket notifications retain ticket-order identity.
5. Money-group notification links now open the requested group after the Money tab mounts.
6. Money Groups list requests ignore stale responses.
7. Zeeza people search can receive a canonical search-result target.
8. Marketplace route context now retains order/tab targets.
9. Chase/Friends result navigation remains inside the canonical Zeeza route.
10. Release metadata and batch documentation are synchronized to V5.1.0 / B37.

## Compatibility
Legacy notification payload shapes remain readable. No database records were destructively renamed.
