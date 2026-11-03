# NEXA V4.74.0 — Batch B21 Implementation Report

## Batch
101. Unified subscription center and explicit user-vs-vendor subscription separation
102. Vendor subscription history, entitlement timeline and renewal visibility
103. Subscription dashboard clarity and cross-module continuity
104. Vendor access authorization continuity after subscription separation
105. Subscription separation regression and ownership hardening

## Implementation
- Added authenticated `/api/account/subscriptions` read-only overview combining the existing NEXA membership subscription with the separate vendor subscription state.
- Preserved separate authorities and ledgers.
- Added vendor subscription history continuity to the vendor dashboard using the existing owner-scoped history endpoint.
- Updated NEXA Membership UI to explicitly distinguish account membership from Dream Marketplace vendor billing/access.
- Updated Vendor Dashboard to explicitly identify vendor subscription as separate from NEXA Membership.
- Added B21 regression contracts for separation, ownership isolation, renewal independence and vendor-access authorization continuity.
- Updated canonical roadmaps and release metadata to V4.74.0.

## Validation
- B21 focused contracts: 5/5 PASS
- Vendor subscription patch regression: 12/12 PASS
- B18-B20 + secure calling regression: 26/26 PASS
- Modified server JavaScript syntax: PASS
- Release metadata synchronization: PASS

## Status
TESTED/PASSED: server-side B21 contracts and regressions listed above.
NOT TESTED: physical-device UI rendering/browser interaction and live provider transaction.
DEFERRED: no additional subscription authority or payment ledger was introduced.
