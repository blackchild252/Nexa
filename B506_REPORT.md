# B506 — M7316–M7340 Identity, Sessions, Zeeza Two-Factor Authentication and Recovery

**Release identity:** V6.1.60 B506; Android `versionCode` / iOS `buildNumber` 6325. Automated `npm run release:bump` advanced identity from V6.1.59 B505 / 6324 after implementation tests passed. This is an **unsealed development checkpoint**, not an official release.

## Source changes

- Login, password verification, session creation, session middleware and session rotation now require an explicitly active account state. Disabled, suspended, closed, unknown and missing account states fail closed.
- Email verification and password-reset tokens are issued only for active accounts. Email verification will not claim success if the account becomes unavailable after a token was issued.
- Local Zeeza 2FA recovery proofs are single-use; the in-memory contract engine retains a digest rather than the raw proof. Factor removal clears locally verified session state and requests revocation through the injected adapter.
- Added `server/identitySessionRecovery.contract.test.js`; extended auth lifecycle tests for inactive-account token issuance and state changes; extended 2FA tests for recovery replay and factor-removal/session-revocation behavior.
- Documented the Main two-factor interface and local-only/external-delivery boundary. Updated the permanent roadmap with evidence for the 25 milestones.

## Verification evidence

- Focused auth/session/2FA tests: **10/10 passed**.
- `npm run verify:contract`: **1029 passed, 0 failed, 0 skipped**.
- `npm run walk`: **CLEAN** — JavaScript syntax 874/874; TypeScript syntax scan 226 files; relative imports 768/768; route targets 56/56; 22 non-blocking border advisories.
- `npm run release:identity`: PASS for V6.1.60 B506 / build 6325.
- `node scripts/release-audit.mjs`: PASS.
- `node scripts/roadmap-check.mjs`: PASS — 10 sequential blocks, 250 slots, M7191–M7440.
- `npm run godhand -- current`: PASS — ordered roadmap traversal complete.
- Archive was extracted and its release identity and focused auth/session/2FA tests were checked again.

## Parked / NOT TESTED

- Durable production 2FA factor/recovery-code persistence: current Zeeza 2FA engine is deliberately local/in-memory only.
- Real email/Zeeza delivery, provider acknowledgement and production session-revocation adapter acceptance.
- Full runtime server suite and dependency-backed typecheck: `node_modules` is absent. Browser/device acceptance, Android/iOS native builds and independent penetration testing remain NOT TESTED.
- No package installation, production credential use, provider API calls or release seal was performed.

**Next active block:** M7341–M7365 — Zeeza Inbox, Notifications, Ownership and Message Safety.
