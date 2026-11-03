# NEXA V5.81.0 / B122 Release Report

## Theme
Zeeza Room Invitation Lifecycle & Abuse Integrity

## Milestones
M1375–M1399 — **25/25 IMPLEMENTED / VALIDATED**.

## Major repair
Zeeza room invite codes now have bounded expiry, strict validation, cryptographic generation, owner-only rotation/revocation, and explicit expired/revoked-code rejection. Existing room records receive an expiry migration; new rooms receive bounded invite lifetimes. Owner controls are exposed in the room UI and active-room state is refreshed after invite changes.

## Verification
- Focused B122 contract: **26/26 PASS**.
- Cumulative B112–B122 focused certification: **290/290 PASS**.
- JS/MJS/CJS syntax sweep: **453/453 PASS**.
- Static release suite: **40/40 PASS**.
- Release audit: **PASS — V5.81.0**.
- Release gate: audit/static checks **PASS**; dependency preflight **BLOCKED** because `node_modules` is absent in the authoring workspace.
- Full server suite: **ATTEMPTED / BLOCKED** after 36 observed tests by the authoring-session execution ceiling; no failing result was reported before timeout, but a full-suite PASS is not claimed.

## Release
- Complete cumulative archive: `NEXA-V5.81.0-B122.zip`
- SHA-256 recorded in adjacent `.sha256` file.
- `node_modules` excluded from archive.
