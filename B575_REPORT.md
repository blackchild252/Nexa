# NEXA Main — B575 Internal Checkpoint Report

- **Identity:** V6.2.29 B575, build 6394.
- **Scope:** Dami avatar: the studio uses the plan the server confirmed.
- **Roadmap:** active block M7516–M7540 remains open; no milestone was closed. M7527 remains BLOCKED.

## Change

- `server/damiAvatar.js`: new `reportedTier`. `server/index.js`: `GET` and `PUT /api/ai/avatar` also return `tier`.
- `src/nexaAvatar.ts`: keeps the server plan, new `useAvatarTier`. `src/NexaAvatarStudio.tsx`: uses it for the locked poses.

## Verification

- `npm run session:start`, `npm run release:identity`, `npm run roadmap:check`, `npm run godhand -- verify` — PASS.
- `node --test server/damiAvatar.contract.test.js` — 15 PASS, 0 FAIL.
- `CI=true npm run verify:contract` — 1268 PASS, 0 FAIL, 1 SKIP (avatar tests are not in this script).
- `npm run test:server` — 39 FAIL before and after my change (identical list, checked against the V6.2.28 upload). DEFERRED: wallet/Paystack/webhook/order tests (2 need `better-sqlite3`) and old robot-hero tests for the robot Dami the avatar replaced.

## NOT TESTED / excluded

- The `tier` field against a real SQLite server with real subscriptions, studio look on browser or device, typecheck (`node_modules` absent), M7527, web export, native builds.
- No devices, screenshots, EAS, stores or external integrations were used. Not an official sealed release.
