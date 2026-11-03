# NEXA V6.0.28 B374 — M5566–M5590

## Scope
Current-state contract reconciliation and checkpoint/archive delivery hardening.

## Completed
- Repaired four stale historical contracts exposed by the God Hand sweep.
- Reconciled active release headings and current PROJECT_MEMORY state.
- Removed the duplicate competing naming-rule object from PROJECT_MEMORY; AGENTS.md remains the sole naming authority.
- Corrected release-audit assumptions about the retired root `app/` route tree.
- Added SHA-256 sidecar generation to release shipping.
- Added optional same-name checkpoint-copy delivery with overwrite protection and hash verification.
- Added 25-check B374 regression coverage and registered it in the cumulative release gate.

## Validation
- Focused B374 + repaired historical contracts: **89/89 PASS**.
- Admin web: **61/61 PASS**.
- Devil’s Walk: **CLEAN** — JS 749/749, TS syntax 206/206, relative imports 657/657, route targets 43/43, 0 blockers.
- Release audit: **PASS**.
- Typecheck: **NOT TESTED** — root `node_modules` is unavailable.
- Browser/device/Playwright/live providers/EAS/stores/deployment: **NOT TESTED / excluded**.

## Delivery
The release archive is `NEXA-V6.0.28.zip`. `release:ship --copy-to=<directory>` can deliver the exact same archive filename to a checkpoint directory and writes a matching `.sha256` sidecar.
