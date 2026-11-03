# NEXA Main — B574 Internal Checkpoint Report

- **Identity:** V6.2.28 B574, build 6393.
- **Scope:** Dami avatar: pose plan rules enforced on the server.
- **Roadmap:** active block M7516–M7540 remains open; no milestone was closed. M7527 remains BLOCKED.

## Verification

- `npm run session:start`, `npm run godhand -- verify`, `npm run roadmap:check`, `npm run release:identity` — PASS.
- `npm run walk` — CLEAN (no blockers); typecheck NOT RUN because `node_modules` is absent.
- `CI=true npm run verify:contract` — 1268 PASS, 0 FAIL, 1 SKIP (1269 total). Avatar tests: 24 PASS.

## NOT TESTED / excluded

- the pose check against a real SQLite server with real subscriptions (server packages are absent here), upgrade and downgrade behaviour on a live account, typecheck, M7527, web export, native builds. The app still treats any saved plan as unlocked while the server counts active subscriptions only, so a cancelled plan can show a locked pose as open until the server resets it on save.
- No devices, screenshots, EAS, stores or external integrations were used. This checkpoint is not an official sealed release.
