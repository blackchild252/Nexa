# NEXA V5.54.1 — cross-check and corrections

Patch release on top of V5.54.0 (Batch B91, no new milestones). Version metadata bumped in package.json, package-lock.json, server/package.json, app.json, src/theme.ts, PROJECT_MEMORY.json and VERSION.md; the M724 metadata test now checks synchronization against package.json instead of a hard-coded number.

## Fixes (smallest safe change each)
1. **Server startup crash without `OPENAI_API_KEY`** - `server/index.js` built the OpenAI client at load time. It is now created lazily on first use through a Proxy; the pinned `new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 30_000 })` contract is preserved. Presence checks elsewhere still read `process.env.OPENAI_API_KEY` directly, so behaviour with a real key is unchanged.
2. **Web bundle failure** - added `src/YaayzNativeAd.web.tsx` (renders nothing). Metro uses it for web, so `react-native-google-mobile-ads` is not bundled there. Native builds keep `YaayzNativeAd.tsx` unchanged.
3. **Environment-dependent Gemini test** - `geminiProvider.analyzeImage` now accepts `dependencies.loadClient` (same pattern as tools/stream), the gateway passes `dependencies` through, and `aiProviderGateway.test.js` injects a fake client instead of depending on whether `@google/genai` is installed or a network call is made.
4. **Node pin** - `.nvmrc` 20.19.0 -> 22.22.2 because five test files use `node:sqlite` (Node 22.5+). Production code uses better-sqlite3.
5. **AdMob ad unit by platform** - `src/YaayzNativeAd.tsx` used the Android production native ad unit on both platforms while iOS has no AdMob app yet (iOS app ID in `app.json` is Google's test ID). iOS now uses Google's test native ad unit; Android is unchanged. Replace the iOS constant once an iOS app is registered in AdMob.
6. New `server/v5_54_1.contract.test.js` pins fixes 1-5.

## Decisions left for the owner (not changed, need approval)
- `Dockerfile` (`node:20.19`) and `package.json` engines (`>=20.19.0`, pinned by `v3_72_1_dependency.test.js`) still target Node 20. Decide whether to move runtime to Node 22 too.
- Legacy `app/` folder is inert (router root is `src/app`); deletion needs approval.
- Register the iOS app in AdMob and replace the iOS test IDs (`app.json` iosAppId and `IOS_TEST_NATIVE_AD_UNIT_ID`).
- `README.md` historical sections and `PRIORITY_ROADMAP.md` "Next queue" text are stale; no B92 block is defined yet.

## Validation
See the summary in the delivery message. Not run: typecheck, Playwright, device, live providers (no dependencies installable in the build sandbox).

## Naming and versioning
Archive: `NEXA_V5_54_1.zip` (name + version only). Rules are recorded in `AGENTS.md` ("Archive naming and versioning") and `PROJECT_MEMORY.json` (`archiveNaming`). Android `versionCode` stays 1 until a store build is cut.
