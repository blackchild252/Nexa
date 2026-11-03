# NEXA V3.66.1 Implementation Report

## Scope
Issues 25–27 were implemented cumulatively on the V3.65.1 tree.

### Issue 25 — Search indexing/relevance scalability safeguards
- Bounded normalized search input to eight query tokens.
- Added a global candidate ceiling before cursor pagination.
- Extended cursor identity to score, title, type, and id so equal-title results cannot collide or reorder across pages.
- Added indexes for user-scoped search ordering/membership paths and frequently ordered AI/Money/Mall sources.
- Preserved existing authorization and category scoping.

### Issue 26 — Notification delivery/retry and deduplication lifecycle
- Added durable `notification_deliveries` state keyed uniquely by notification event and device token.
- Added bounded exponential retry with five-attempt terminal failure.
- Dead Expo devices are pruned on `DeviceNotRegistered`.
- Delivery is best-effort and never replaces the in-app notification history as source of truth.
- Added startup retry and bounded retention of terminal delivery records.
- Account closure cleans delivery state associated with deleted notification events.

### Issue 27 — Final release audit/regression expansion
- Added dedicated V3.66.1 release-audit tests.
- Verified release metadata synchronization, search bounds/cursor determinism, notification lifecycle schema/behavior, and cleanup integration.
- Preserved external validation carry-forward items rather than claiming device/provider validation.

## Validation
- JavaScript syntax: PASS for changed server files.
- Full server regression: **208/208 passed**.
- ZIP integrity and SHA-256: verified at checkpoint generation.
- Expo/device/provider/live-payment validation remains external and unverified in this environment.
