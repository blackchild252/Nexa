# NEXA Main — B580 Internal Checkpoint Report

- **Identity:** V6.2.34 B580, build 6399.
- **Scope:** NEXT run, block M7666–M7690, Release Integrity, Archive Reproducibility and Roadmap Governance.
- **Result:** 21 TESTED/PASSED, 4 PARTIAL (M7668, M7670, M7677, M7686), 0 NOT DONE. Evidence: `docs/RELEASE_ARCHIVE_INTEGRITY_EXECUTION_EVIDENCE.md`.
- **Roadmap:** active block M7516–M7540 still open; M7527 still BLOCKED. Next block M7691–M7715.

## Changes

- `scripts/release-seal.mjs`: new `list` command (the one list of files in a release); stray `*.zip` never sealed; short fail-closed messages instead of stack traces; seal file shape checked; messages bounded.
- `scripts/release-ship.mjs`: the zip is built from the seal's list, so the zip and the seal cannot disagree; temp folder and old hash cleaned up.
- New `server/releaseArchiveReproducibility.contract.test.js` (10 tests), added to `npm run verify:contract`.

## Verification

- `session:start` PASS before changes. `release:bump` run first (V6.2.33 B579 → V6.2.34 B580).
- New tests 10 PASS. With the old two scripts put back, 9 of 10 fail. 89 existing related tests: 86 PASS, 0 FAIL, 3 SKIP.
- `CI=true npm run verify:contract` — 1332 tests, 1331 PASS, 0 FAIL, 1 SKIP.
- `release:identity`, `roadmap:check`, `godhand -- verify`, `walk` PASS (930/930 JS syntax, 235 TS files parse, 800/800 imports, 59/59 route targets). Typecheck NOT RUN, no `node_modules`.

## NOT TESTED / excluded

- `npm run test:server`, `release:gate`, typecheck, M7527, web export, native builds.
- Zip on Windows or macOS; any phone or device.
- DEFERRED: raw stack trace from `release-identity.mjs` / `session-start.mjs` on a missing `package.json`; `release:audit` failing on the README and LAUNCH_HANDOFF headings (needs an owner decision, see the evidence file).
- No devices, screenshots, EAS, stores or external integrations were used. Not an official sealed release.
