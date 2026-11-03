# NEXA Main — B599 release report

**Release identity:** V6.2.53 B599, build 6418.

## Included internal change

This release packages the successful B598 implementation: referral reward decision and operator-credit audit reasons now accept only actual strings. Numbers, booleans, objects, arrays and missing values are rejected instead of being coerced into audit text. Regression coverage verifies malformed reasons create neither ledger nor audit rows, while valid string reasons remain accepted.

No additional application-code change was made after the B598 implementation. B599 is the required identity advance before sealing and shipping that tested source state.

## Verification evidence from the implementation run

- Focused authorization/referral contracts: **41 passed, 0 failed**.
- Full contract suite: **1,544 passed, 0 failed, 1 skipped**.
- JavaScript syntax checks on changed files: passed.
- Devil's Walk: CLEAN — JavaScript syntax 950/950, TypeScript syntax 239 files, relative imports 802/802, route targets 59/59.
- Roadmap check: passed.
- Release identity check at B598: passed; identity then advanced using `npm run release:bump` to B599.

## Not tested

Dependency-backed typecheck, full runtime server suite, live Express route execution, device/browser/native acceptance and live integrations were not tested. No package installation or registry recovery was attempted.

M7567 remains PARTIAL; the referral-reason validation improvement is targeted coverage, not a complete authenticated-route audit. The separate M7527 real HTTP/SQLite failure-injection acceptance remains unverified.

## Release process

This report records the B598 implementation under the bumped B599 identity. The official archive is created only by `npm run release:ship`, which performs its configured cleanup, Devil's Walk, seal, archive and extracted-archive verification gates.
