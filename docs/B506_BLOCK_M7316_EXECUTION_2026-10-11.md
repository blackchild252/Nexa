# B506 — M7316–M7340 Identity, Sessions, Zeeza Two-Factor Authentication and Recovery

**Release identity:** V6.1.60 B506, build 6325. Automated `npm run release:bump` advanced identity from V6.1.59 B505 / 6324 after implementation tests passed. Unsealed development checkpoint.

## Changes

- Login now accepts only explicitly active accounts; disabled/unknown account states cannot create sessions.
- Session creation and rotation reject missing/non-active accounts; authenticated middleware refuses existing sessions after account state is no longer active.
- Email verification/password-reset action tokens are issued only to active accounts; email verification mutates only active accounts; recovery for unavailable accounts stays generic and creates no token.
- Zeeza local 2FA recovery proofs are single-use with only proof digests retained in the local contract engine; factor removal clears locally verified session state and requests revocation through the injected adapter.
- Added account-state, session-rotation, token-issuance, recovery replay and factor-removal regression contracts.
- Added `docs/AUTH_TWO_FACTOR_AND_SESSION_CONTRACT.md` and recorded milestone evidence in `MASTER_ROADMAP.md`.

## Evidence

- Focused auth/session/2FA tests: **10/10 PASS**.
- `npm run verify:contract`: **1029/1029 PASS**.
- `npm run walk`: **CLEAN** — JS syntax 874/874, TS syntax scan 226 files, imports 768/768, routes 56/56; 22 non-blocking border advisories. Dependency-backed typecheck not run (no `node_modules`).
- `node scripts/release-audit.mjs`: PASS.
- `node scripts/roadmap-check.mjs`: PASS — 10 sequential blocks, 250 slots, M7191–M7440.
- `npm run godhand -- current`: PASS before release bump; roadmap traversal complete.
- `npm run release:identity`: PASS for V6.1.60 B506 / build 6325 after final documentation update.

## Parked / NOT TESTED

- Durable production 2FA-factor and recovery-code storage (current service is explicitly local/in-memory only).
- Real email/Zeeza delivery, provider acknowledgement and external notification adapters.
- Full runtime server suite and dependency-backed typecheck (dependencies absent); browser/device acceptance, native builds and independent penetration testing.
- No production credentials, provider calls, dependency installation or release seal used.

**Next active block:** M7341–M7365 — Zeeza Inbox, Notifications, Ownership and Message Safety.
