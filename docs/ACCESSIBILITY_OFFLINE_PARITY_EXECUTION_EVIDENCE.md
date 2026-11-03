# Mobile accessibility, offline UX and platform parity — execution evidence

**Product:** NEXA Main App only
**Roadmap block:** M7641–M7665 (run in B579)
**Status:** see the table in `MASTER_ROADMAP.md`. The real client code was run: `src/nexaNetworkPolicy.js` as it is, and the real `fetchWithTimeout`, `resilientFetch`, `readResponseData`, `throwClientError` and the API-address checks cut out of `src/api.ts`, types stripped, run against a fake `fetch`. No device, browser, screen reader, express or live server was used.

## What was found and fixed

1. **A dropped connection on Safari and iOS web was not recognised as offline.** The check only looked for the words "network" or "fetch". Safari says "Load failed" and "The Internet connection appears to be offline." Those were not retried and not classified, so a short drop failed at once and the person saw the raw browser text. Now one shared check, `isNetworkFailureMessage` in `src/nexaNetworkPolicy.js`, covers React Native, Chrome, Firefox and Safari wordings. It only counts a `TypeError`, so ordinary code errors are not called "offline".
2. **A dropped connection now ends in one plain error on every platform.** When the last try fails, `resilientFetch` throws `NETWORK_ERROR`, status 0, with "You appear to be offline. Check your connection and try again." Before, the raw message went through. `src/auth.tsx` still shows its offline screen and keeps the saved session, as before.

## How it was proven

- New `server/accessibilityOfflineParity.contract.test.js` — 24 tests, in `npm run verify:contract`.
- With both fixes put back to the old code, 6 of the 24 fail. With the fixes, all 24 pass.
- 83 existing related tests still pass (client resilience, accessibility, image accessibility, motion, local-only network).
- `CI=true npm run verify:contract`: 1322 tests, 1321 pass, 0 fail, 1 skip.

## What the tests cover

- Six wordings of a dropped connection (React Native, Chrome, Firefox, Safari x3): classified offline and retried. Non-network errors, aborts and non-`TypeError` values: not.
- GET tried 3 times then one offline error. POST without a key tried once. A connection that drops once then returns succeeds on the retry.
- 400, 401 and 404 returned at once, never retried. 503 on GET retried, then succeeds.
- A mutation is retried only when the caller brings its own idempotency key and the retry header (as checkout does). The same key is used on every try. With no key of its own, it is tried once and no key is made up.
- Request over 1 MiB and wrong content type refused before any call. Response over 1 MiB refused by header and by body. Bad JSON is returned as text.
- 401 becomes `AUTH_EXPIRED`; a suspended account keeps its code.
- API address: missing (development uses loopback, production refuses to start), not a URL, outside loopback, with credentials, `http` in production: all refused.
- The caller's abort listener is removed after success and after failure.
- Source guards: every pressable control has a label, a role or a shared helper; every text field and image has a label, a helper, or is hidden; no text turns off system text scaling; the offline screen keeps a labelled retry button and keeps the saved session; web and native token storage are separate.

## Read, not tested

- Accessibility labels were scanned across all of `src`: 35 controls had no direct label. All use a shared helper (`fieldA11y`, `formSubmitA11y`, `modalCloseA11y`, `buttonA11y`) or a role with visible text. No gap needed fixing, so the scan is now a guard test.
- No text turns off font scaling. Reduced motion is handled in `src/motion.tsx`.
- Native-only storage (`expo-secure-store`) is guarded for web in `auth.tsx`, `ageGate.ts` and `ThemeProvider.tsx`. Read only.

## Found and left alone

- In `resilientFetch`, the line that makes an idempotency key when the retry header is set without one can never run (`canRetryMutation` is false without a key). Making it run would be unsafe: that key is built from the method and URL only, so two different payloads to the same URL would share one key. Left unchanged.
- The offline screen prints `API: <address>`. The address is not secret in a built app, but it is diagnostic text shown to everyone. Left unchanged; an owner decision.
- `isProductionBuild` needs `https`, while local-only mode allows loopback hosts only. A production build with a loopback address must use `https://localhost`. Read only; not changed.

## Not tested

- A phone, TalkBack, VoiceOver, keyboard focus on real devices, real touch-target sizes, text scaling on screen, real airplane-mode behaviour, browsers (Safari, Chrome, Firefox) themselves.
- A running server, express, real HTTP.
- Typecheck (no `node_modules`). `npm run test:server` was not run this time.

## Provider and device boundary

Screen-reader behaviour, device touch targets and real offline use need real devices. They stay NOT TESTED until a launch run is requested. No external service was used.
