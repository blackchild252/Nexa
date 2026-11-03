# NEXA Main — V6.2.20 B566 internal build and seal report

## Scope
Internal source and release-contract repair only. No devices, screenshots, EAS, stores, deployment, or live external integrations.

## Identity
- Version: V6.2.20
- Batch: B566
- Build code: 6385
- Archive: `NEXA-MAIN-V6.2.20.zip`
- Package: `com.aami.nexa` (unchanged)
- Android `versionCode`, iOS `buildNumber`, extra and root build fields remain synchronized.

## Internal fixes
- Moved the customizable Dami avatar's existing 90 ms blink-close and 120 ms blink-open durations to the shared motion timing scale without changing timing.
- Updated stale historical motion contracts to check the current avatar wrapper, gesture handling and reduced-motion behavior rather than the retired robot implementation.
- Updated the auth identity contract to include the separately verified `twoFactorVerified` marker.
- Corrected active release documentation and kept `MASTER_ROADMAP.md` as the sole roadmap authority.

## TESTED/PASSED
- Focused regression suite: 44 passed, 0 failed.
- `npm run session:start` on the uploaded source before edits: PASS at V6.2.18 B564 / build 6383.
- `npm run release:bump`: identity advanced through the project authority to V6.2.20 B566 / build 6385.
- `npm run godhand` and `npm run godhand -- verify`: ordered product traversal complete; this does not mean every roadmap milestone is complete.
- `npm run walk`: CLEAN (922 JavaScript syntax checks, 234 TypeScript syntax files, 797 relative imports, 59 route targets).
- `npm run verify:contract`: 1268 passed, 0 failed, 1 skipped.
- Release audit, release identity, permanent seal verification and extracted archive verification are run at ship time.

## BLOCKED / NOT TESTED
- `npm run test:server` timed out after 180 seconds; no passing full server runtime result is claimed.
- `npm run typecheck` is blocked by absent `node_modules` and missing `expo/tsconfig.base`.
- `npm run build:web` is blocked because the local `expo` executable is absent.
- M7527 runtime HTTP/SQLite failure-injection test remains skipped because required server packages are unavailable. Active roadmap block M7516–M7540 remains unchanged; M7527 is not closed.
- Native Android/iOS builds, browser/device acceptance, live integrations and deployment are NOT TESTED.

## Result
This checkpoint is for internal source preservation and handoff only. A sealed source archive does not mean the app was dependency-built, device-tested or certified for production launch.
