# B507 — Parked issue audit and local fixes

Date: 2026-10-11
Release checkpoint: V6.1.61 B507, build 6326 (unsealed)

## Local issues fixed in this pass

1. **Zeeza 2FA durability gap (partially resolved):** added `server/zeezaTwoFactorSqlite.js`, a SQLite-backed Map-compatible state adapter for factor metadata, challenges, throttling state, verified-session markers and consumed recovery proof digests. Challenge consumption uses a conditional SQL update; recovery proof consumption uses `INSERT OR IGNORE`. Destination/recovery proof values are hashed, not stored raw. Added recreation/replay tests using a deterministic SQLite contract double.
2. **Sensitive push-preview leakage (locally resolved):** `server/notificationDelivery.js` now constructs a separate push-safe payload. Chat notifications use generic title/body and allowlisted action/record identifiers; private message text, previews, contact details and arbitrary metadata are not forwarded. Ordinary push payload metadata is filtered and visible title/body lengths are bounded. Incoming-call priority behavior is preserved with generic copy.
3. **Safer provider defaults:** live push sending and receipt polling are disabled unless `NEXA_PUSH_DELIVERY_ENABLED=true`; tests can inject deterministic adapters without enabling live network delivery.
4. **Regression coverage:** added `server/zeezaTwoFactorSqlite.test.js` and `server/notificationPushPrivacy.test.js`, and included them in `npm run verify:contract`.

## Verification evidence

- `npm run verify:contract`: **1036 passed, 0 failed, 0 skipped**.
- Focused 2FA SQLite adapter and push-privacy tests: **7/7 passed**.
- `npm run walk`: **CLEAN** — JavaScript syntax 877/877, TypeScript syntax scan 226 files, relative imports 768/768, route targets 56/56. Dependency-backed typecheck was not run because local `node_modules` is absent.
- `node scripts/release-audit.mjs`: **PASS**.
- `node scripts/roadmap-check.mjs`: **PASS** — 10 sequential blocks, 250 milestone slots, M7191–M7440.
- `node scripts/release-identity.mjs check`: **PASS** — V6.1.61 B507, build 6326.
- No package installation, credentials, production database access, or live provider call was used.

## Remain parked because they require provider/runtime acceptance

- AAMI Central authenticated provider contract, live report delivery, provider-owned status reads, staff scope policy and report-status events.
- Email/Zeeza challenge delivery and provider acknowledgements.
- Wiring the SQLite 2FA service into authenticated production routes; real SQLite integration and migration acceptance.
- Live push-provider delivery/receipt acceptance and real-device notification display.
- Dependency-backed typecheck/runtime server suite until required packages are available locally; browser/device/native builds and independent penetration testing.
- LORDGISTICS shipment creation/tracking and the separate Admin AAMI companion app runtime/navigation.

## Evidence boundary

The SQLite adapter persistence/replay behavior is tested against a deterministic database contract double, not a real SQLite engine. The push privacy helper is unit-tested and wired into push payload construction, but no live push provider was called. The 2FA adapter is not yet wired into authenticated production routes and is not represented as production-ready. Checkpoint remains unsealed.
