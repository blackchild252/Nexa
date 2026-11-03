# NEXA V5.79.0 / B120 Release Report

## Scope
M1325–M1349 — Public Marketplace Visibility & Cache Integrity.

## Major repair
Public marketplace product and vendor surfaces now share a bounded visibility policy. Product details, product images, and public share pages require an active product/vendor state. Product image responses no longer use an immutable cache policy because listing visibility and image contents can change.

## Additional release-gate repairs
- Updated the historical B66 lifecycle contract so it verifies both commerce and financial retention boundaries after B118's wallet-retention hardening.
- Updated the B91 source parser contract to exclude TypeScript declaration (`.d.ts`) files from `transpileModule`; declaration files are type declarations, not transpilation units.

## Verification
- B120 focused contract: **25/25 PASS**.
- Cumulative B112–B120 focused certification: **238/238 PASS**.
- JS/MJS/CJS syntax sweep: **449/449 PASS**.
- Release consistency: **3/3 PASS**.
- Static release gate: **PASS**.
- Release audit: **PASS — V5.79.0**.
- Full server suite: **ATTEMPTED / BLOCKED** by authoring-session timeout after **151 observed tests**; the isolated failures found before the timeout were repaired and passed individually. No full-suite PASS is claimed.
- Dependency-backed release gate: **BLOCKED** because `node_modules` is absent in the authoring workspace.

## Archive
- `NEXA-V5.79.0-B120.zip`
- SHA-256: see adjacent `NEXA-V5.79.0-B120.sha256` checksum file
- ZIP integrity: **PASS**
