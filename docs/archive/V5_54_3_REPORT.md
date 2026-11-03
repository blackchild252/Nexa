# NEXA V5.54.3 — Devil's Walk fixes

Patch on V5.54.2 (Batch B91, no new milestones). Contains every V5.54.2 change.

## Fixed
1. **CI/Docker Node version.** `.github/workflows/nexa-quality.yml` uses Node `22.x`; both `Dockerfile` stages use `node:22-bookworm-slim`. Reason: five test files use `node:sqlite` (Node 22.5+). Production still uses `better-sqlite3`; the runtime move to Node 22 is untested here (no Docker build possible). `package.json` engines (`>=20.19.0`) and `eas.json` (phone build, Node 20.19.0) are unchanged on purpose because existing release tests pin them.
2. **Paystack webhook retry.** A repeated event ID was always answered 200. Now, if the earlier attempt ended as `received` (handler threw) or `vendor_activation_failed`, the retry is processed again. All other outcomes stay final. Kitchen, ticket, order and vendor fulfilment are already idempotent, so re-processing cannot double-fulfil. Other 500 paths that leave a final-looking outcome are not changed.
3. **AI spend.** New per-user daily cap of 300 calls (applies to every route that used `aiLimiter`), and `/api/realtime/client-secret` now has its own limit of 5/min plus the daily cap. Numbers are fixed in code (the M713 audit requires literal values); adjust `max` in `server/index.js` if 300 is wrong for you. Signup is still limited only per IP.
4. **Client timeouts.** `src/api.ts`: `fetchWithTimeout` (30 s, 90 s for audio upload) on `authedFetch`, `publicFetch` and transcription. Timeout error has `code: 'REQUEST_TIMEOUT'`. A caller's own abort signal is still honoured.
5. **Web alerts.** `src/webAlertShim.ts` replaces the no-op `Alert.alert` on web with browser dialogs (imported first in `src/app/_layout.tsx`). One button: alert then `onPress`. Two or more: OK runs the first non-cancel button, Cancel runs the cancel button. Buttons beyond the first action, and `Alert.prompt`, are not supported on web.

## Tests
New `server/v5_54_3.contract.test.js` (7 tests). The alert shim and limiter are executed. The webhook, route wiring and Node pins are source-level checks only, because the server cannot start without `express` and `better-sqlite3`.

## Not done / not verified
- WebRTC (`react-native-webrtc`) still has no web fallback; web login token is still memory-only; `trust proxy`, per-email login lockout, `/health` disclosure, upload file filter and the other Medium items from the walk are untouched.
- Not run: typecheck, Playwright, Docker build, phone/web build, live providers, `npm audit`.


## Results [RAN in offline sandbox, Node 22.22.2]
- `npm --prefix server test` equivalent (`node --test *.test.js`): **1440/1440 pass** (1433 existing + 7 new). Baseline 5.54.2 in the same sandbox: 1433/1433.
- `node scripts/release-audit.mjs`: **PASS — 5.54.3**. Dependency preflight: BLOCKED (`node_modules` not installed here).
- The 1433 existing tests are mostly source-level pattern checks, so this proves the code is present and consistent, not that routes behave correctly at runtime. Run `npm ci && npm run test:server` and the Playwright smoke on your machine/CI.
