# NEXA V5.80.0 — B121 Release Report

## Roadmap
- Batch: **B121**
- Version: **V5.80.0**
- Milestones: **M1350–M1374 (25/25)**
- Theme: **Zeeza Share-Link Privacy & Lifecycle Integrity**

## Major repair
Zeeza profile share links previously allowed a token to continue resolving without checking current account/profile privacy state, had no explicit rotation/revocation surface, and returned share data without a no-store boundary. B121 centralizes the share-token policy and repairs the lifecycle without changing normal friend/profile behavior.

## Implemented
- 24-byte cryptographically random share tokens with a 32-character URL-safe boundary.
- Central token normalization and bounded malformed/overlong rejection.
- Active-account requirement for public share resolution.
- Private-profile blocking for share generation and resolution.
- Explicit share-token rotation endpoint.
- Explicit share-token revoke endpoint.
- Share-request endpoint uses the same visibility policy as public share viewing.
- Public share and share-management responses use `Cache-Control: no-store`.
- Public share and share-request surfaces remain behind the existing action limiter.
- Existing account-closure lifecycle continues to clear `zeezaShareToken`.
- Unique token index remains intact.

## Verification
- B121 focused contract: **26/26 PASS**.
- Cumulative B112–B121 focused certification: **264/264 PASS**.
- Static release suite: **40/40 PASS**.
- JS/MJS/CJS syntax sweep: **451/451 PASS**.
- Release audit: **PASS — V5.80.0**.
- Dependency preflight: **BLOCKED** because `node_modules` is absent in the authoring workspace.
- Full server suite: **ATTEMPTED / BLOCKED** after 36 observed tests by the authoring-session 30-second execution ceiling; no full-suite PASS claimed.

## Release
- Archive: `NEXA-V5.80.0-B121.zip`
- SHA-256: stored in adjacent `NEXA-V5.80.0-B121.sha256`.
- Batch advancement: **B120 → B121** after successful audit → repair → test → release verification, with dependency/full-suite environment limitations documented rather than concealed.
