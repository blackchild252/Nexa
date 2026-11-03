# B505 — M7291–M7315 Central Reporting Workflow, API Contracts and Privacy

**Release identity:** V6.1.59 B505; Android `versionCode` / iOS `buildNumber` 6324. Identity advanced through `npm run release:bump` after the implementation and contract verification passed (V6.1.58 B504 / 6323 → V6.1.59 B505 / 6324). This is an **unsealed development checkpoint**, not an official release.

## Local implementation

- Added `src/centralReportingContract.ts` with typed request, unavailable-response and acknowledgement shapes; a fail-closed delivery predicate; finite status normalization; and approved-reply text sanitation.
- Wired `src/CentralReportScreen.tsx` to the typed request and delivery predicate. The UI no longer claims delivery unless the response explicitly says accepted and delivered and includes a non-empty request ID.
- Aligned UI account-role fallback behavior with server policy, so an unrecognized `accountType` does not hide a valid `userType`, `role` or `kind`.
- Added an accessible entry to the separate report form from NEXA Help.
- Hardened `server/centralReporting.js`: 16 KiB serialized request limit, NFC normalization, control-character rejection, rejection of unknown payload fields, strict string checks for source identifiers, and sanitized/bounded approved replies.
- Fixed a retry defect in `server/index.js`: while Central is disconnected, the API does not reserve an idempotency key for work that cannot be dispatched. Repeated attempts therefore are not misclassified as duplicates of an undelivered report. The route still returns an explicit retryable 503 and never claims delivery.
- Updated privacy copy so it accurately explains that disconnected requests do not reserve the key or claim delivery.
- Added `docs/CENTRAL_REPORTING_CONTRACT.md` and updated the permanent `MASTER_ROADMAP.md` with milestone evidence and external items parked.

## Verification evidence

- Focused `node --test server/centralReporting.contract.test.js`: **39 passed, 0 failed**.
- `npm run verify:contract`: **1025 passed, 0 failed, 0 skipped**.
- `npm run walk`: **CLEAN** — JavaScript syntax 873/873; TypeScript syntax scan 226 files; relative imports 768/768; route targets 56/56; 22 non-blocking border advisories.
- `node scripts/release-identity.mjs check`: PASS for V6.1.59 B505 / build 6324.
- `node scripts/release-audit.mjs`: PASS.
- `node scripts/roadmap-check.mjs`: PASS — 10 sequential blocks, 250 slots, M7191–M7440.
- `npm run godhand -- current`: PASS — ordered roadmap traversal complete.

## Parked / not tested

- Live AAMI Central delivery and provider acknowledgement, provider-owned report status reads, explicitly granted provider staff scope, and Central status notification events.
- Full runtime server end-to-end tests; this workspace has no `node_modules`, so dependency-backed typecheck and runtime integration tests are not available in this run.
- Browser/device visual acceptance, Android/iOS native builds, production authentication acceptance, and live provider acceptance.
- No package installation, production credential use, external API call or release seal was performed.

## Next active block

M7316–M7340 — Identity, Sessions, Zeeza Two-Factor Authentication and Recovery. Continue locally testable source work; park provider/device/environment prerequisites without treating them as local-development blockers.
