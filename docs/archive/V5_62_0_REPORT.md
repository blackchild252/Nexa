# NEXA V5.62.0 / B103 — Financial, Inventory & Cross-Domain Integrity

## Scope
M900–M924 harden marketplace inventory release, order actors, payment identity, webhook replay, refunds, wallet accounting, Store Ajo, Money groups, vendor ownership, and Yaayz ticket invariants.

## Concrete repair
`mall_order_items.inventoryReleasedAt` was added as a one-time inventory-release marker. Rejection/cancellation now restores stock only when that marker is empty, and paid items cannot enter the cancellation stock-release path.

## Focused verification
- B103 contract: 25/25 PASS.
- Marketplace transaction regression: 3/3 PASS.

Full cumulative release gates are performed before archive sealing.

## Final release gate
- Focused B103: **25/25 PASS**.
- Combined focused regression: **28/28 PASS**.
- JS/MJS syntax sweep: **PASS — 0 errors**.
- Full server suite: **ATTEMPTED / BLOCKED by authoring-environment timeout**; no full-suite PASS claimed.
- Release audit: **PASS — V5.62.0**.
- Batch advances B102 → B103 exactly once after successful audit/repair/test/release verification.
