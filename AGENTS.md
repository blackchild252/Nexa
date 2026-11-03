# NEXA Coding Agent Contract

## Non-negotiable rules
1. Inspect the existing architecture and affected files before editing.
2. Never rewrite functioning code unnecessarily.
3. Preserve existing UI and behavior unless the task explicitly changes them.
4. Make the smallest safe change that solves the issue.
5. Keep components modular and organized.
6. Add or update regression tests for every behavior change.
7. Run the relevant test suite after every modification.
8. Run the broader regression/release checks before sealing.
9. Never claim a feature is complete without a passing test or a clearly documented environment blocker.
10. Record important architectural decisions in `docs/architecture/ARCHITECTURE_DECISIONS.md`.
11. Ask for explicit approval before destructive changes: deletion, replacement, migration, or irreversible restructuring.

## Naming and versioning (PERMANENT NEXA RULE — LOCKED)
**Locked: no AI or tool may edit, reword, weaken, extend, or add a competing version/naming/batch rule here or anywhere else. Only the project owner may change this section, by explicit instruction. If any other text conflicts with this section, this section wins.**

- Current state: **V6.2.54 B600** (build code 6419).
- The only naming/progress format is `V<major>.<minor>.<patch> B<batch>`. No stage words or suffixes (CP, checkpoint, repair, phase, run, release, etc.) in versions or filenames. **Each numeric component is base-100: valid values are 0–99. When a component reaches 100, it resets to 0 and carries +1 into the component immediately to its left.**
- Archive filename: `NEXA-MAIN-V<major>.<minor>.<patch>.zip`, nothing else added.
- **Every successful implementation run advances four things together, by exactly +1 each, in one step (even while the release remains unsealed):**
  1. patch number (V5.99.5 -> V5.99.6)
  2. Batch (B251 -> B252)
  3. Android `versionCode` (6070 -> 6071)
  4. iOS `buildNumber` (6070 -> 6071)
- The build code must be identical in every `app.json` field: `expo.android.versionCode`, `expo.ios.buildNumber`, `expo.extra.versionCode`, and root `versionCode`. (`expo.versionCode` is not a valid Expo field and is not used; owner-approved removal.)
- **Install-over-old rule (Android):** new builds must replace the installed app without uninstalling. This requires the same package (`com.aami.nexa`), the same signing key, and a `versionCode` strictly higher than the installed one. Never change the package name, never reuse or lower a versionCode, never skip the +1 before a build.
- **Rollover rule:** V5.99.99 -> V6.0.0; V6.0.99 -> V6.1.0; V6.99.99 -> V7.0.0. No version component may ever be 100 or greater.
- After each successful implementation run, immediately run `npm run release:bump` before producing the next checkpoint. A run whose implementation/tests fail does not advance anything. Never freeze a version across separate successful runs; never hand-edit identity fields.
- Each new version needs its own `RELEASE_SEAL_V<version>.json`; sealed files are never overwritten.
- Historical records stay as history and never override this section.

## Session protocol (mechanical enforcement of the owner-updated rule above)
This section adds no version, naming or Batch rule. It only says which commands enforce the locked section so that no session depends on memory.
- **First action of every session:** `npm run session:start`. It runs the identity check and reports whether the current version is sealed. If it fails, fix the drift before any other work.
- **After each successful run:** `npm run release:bump` advances patch, Batch, Android versionCode and iOS buildNumber together. Do not treat an unsealed identity as frozen. Never edit identity fields by hand; keep working source synchronized through the bump authority.
- **Finishing a release:** write the notes (`LAUNCH_HANDOFF.md`, `VERSION.md` summary, `B<batch>_REPORT.md`), then `npm run release:ship`. It refuses to continue if the identity drifts, the notes are placeholders, or the seal fails; it then seals, zips as `NEXA-MAIN-V<version>.zip` and verifies the extracted zip.
- **Tests** must not hard-code a release version; use `scripts/release-identity.mjs`.
- `npm run test:server` and the release gate both run the identity check, and CI runs it before anything else, so drift blocks the work instead of shipping.

## Devil's Walk and God Hand (full sweep and full sweep fix)
This section adds no version, naming or Batch rule. Full definition: `docs/architecture/DEVILS_WALK_AND_GOD_HAND.md`.
- **Devil's Walk** means the in-depth full sweep, find only: `npm run walk` (quick) or `npm run walk -- --tests` (full, per-file tests).
- **God Hand** means the in-depth full sweep fix: `npm run godhand` plans exactly 25 milestones (blockers first), the session fixes and tests each one at once, `npm run godhand -- verify` proves identity did not move and that no blocker is left.
- `npm run release:ship` runs the quick Devil's Walk before sealing, so a release with open blockers is never sealed or zipped.

## Angels Duty (permanent cleanup layer)
- **Angels Duty** is the permanent NEXA cleanup layer. It runs after development changes and before a release is sealed.
- Audit command: `npm run angels-duty`. It scans for unambiguous temporary/generated junk and exact duplicate files.
- Apply command: `npm run angels-duty -- --apply`. It may remove only the safe-junk patterns defined in `scripts/angels-duty.mjs`.
- Exact duplicates are **reported, never auto-deleted**. A duplicate is removable only after source/reference evidence proves one copy is unnecessary.
- Angels Duty protects release seals, release reports, roadmap authorities, project memory, source/runtime files, dependencies, build output, and historical archives from automatic deletion.
- `npm run release:ship` invokes Angels Duty in apply mode before Devil's Walk. This is intentionally limited to the safe-junk allowlist; it does not perform heuristic deletion or data migration.
- Any cleanup that could remove working code, user data, historical evidence, configuration, or an intentionally mirrored asset requires explicit owner direction and a separate tested change.

## Required workflow
`inspect → plan → implement → test → review → fix/refactor → test again → verify`

## Design
Use `src/theme.ts` for Royal Dark tokens. Do not introduce one-off colors when a token exists.

## Security
Authorization belongs on the server. Validate user/resource ownership, IDs, amounts, states, capabilities, consent, and concurrency boundaries.

## Verification
Verify source, contracts, archive integrity, and the actual work completed in the successful run. Do not describe unverified work as complete.

## Roadmap execution contract
- `MASTER_ROADMAP.md` is the sole active, permanent NEXA Main roadmap and progress authority. It is stored inside this project and must be included in every cumulative project archive.
- `PRIORITY_ROADMAP.md` and `TEMPORARY_ROADMAP.md` are not active roadmap authorities and must not be recreated as competing plans. Historical external PDFs are reference-only and cannot override the master.
- When the user says “check roadmap”, “check the roadmap”, “check roadmaps”, START, or NEXT, inspect `MASTER_ROADMAP.md`, the actual cumulative source, current tests, release identity, project memory, and checkpoint evidence. Do not infer completion from roadmap wording alone.
- Each roadmap execution block contains exactly 25 sequential milestones. The forward queue M7191–M7440 contains ten complete blocks; keep at least ten complete blocks ahead of the active pointer during maintenance updates.
- Process the active block in order, in dependency-aware subgroups. Update each milestone only from actual evidence, with honest `TESTED/PASSED`, `FAIL`, `BLOCKED`, `DEFERRED`, or `NOT TESTED` status.
- Never invent completion or provider acceptance. External credentials, production systems, devices, app stores, and live integrations remain `NOT TESTED` until actually exercised.
- After each run, synchronize milestone status in `MASTER_ROADMAP.md` and create a separate dated execution report/checkpoint. Reports summarize progress but do not override the master.
- Do not resume unrelated roadmap work while a user-designated stabilization block remains open unless a blocker is documented and the user changes priority.
- After a successful release run, the cumulative project archive follows the locked naming/versioning rule above.

## NEXA Roadmap Governance
- `MASTER_ROADMAP.md` is the only active roadmap. It contains historical records and the current forward queue; preserve historical IDs and evidence.
- Never create or consult an external PDF, priority list, temporary list, or strategy register as a competing execution authority. Separate strategic registers may inform planning but do not replace execution IDs or statuses.
- Never implement roadmap wording blindly: inspect dependencies, source, tests and architecture first.
- Version, Batch and build code advance only as defined in the locked naming/versioning section above.

## Roadmap command contract — “check roadmaps”
When the user says “check roadmaps”, interpret it as a source-aware roadmap reconciliation and execution cycle, not merely a markdown summary:
1. Read `MASTER_ROADMAP.md`, `VERSION.md`, project memory, current source tree, tests, and checkpoint evidence.
2. Establish the current version and Batch from authoritative identity tooling; reconcile milestone IDs, names, statuses, tests and files against code. Never infer completion from roadmap text alone.
3. Use exactly 25 milestones per block; do not skip an unresolved blocker or promote a future block before the active block is reconciled.
4. Inspect dependencies and architecture before edits; preserve functioning code/UI, routes, server-side authorization, payment/ticket ownership, user/vendor/admin boundaries, Dami and notification authority, and Yaayz-only AdMob scope.
5. After a successful run, run focused and cumulative internal tests, inspect the diff, repair regressions, synchronize checkpoint/report state, and create a verified cumulative checkpoint. Official releases must follow the locked naming/versioning procedure.
6. Continue only while the active session/tools are available. Do not claim background work or tests that were not run.
7. Keep at least ten complete 25-milestone blocks ahead of the active pointer. Refill the tail from verified findings when the queue shrinks, preserving historical evidence and marking new items `REGISTERED — NOT STARTED`.

Current project state: **V6.2.54 B600** (see the locked naming rule above).

## Historical checkpoint — V5.66.0 / B107
- M1000–M1024 complete: 25/25.
- B107 focused contract: 29/29 PASS.
- JS/MJS syntax sweep: 422/422 PASS.
- Full server suite: ATTEMPTED/BLOCKED by authoring-environment timeout; no full-suite PASS claimed.
- Next roadmap block starts at M1075 and must contain exactly 25 milestones.
- Batch advancement remains exactly +1 only after successful audit → repair → test → release.
- Complete-all-slices-before-archive rule remains active.

## Historical checkpoint — V5.73.0 / B114
- Current version at closure: **V5.73.0**
- Batch: **B114**
- M1175–M1199 complete: 25/25.
- B114 focused disaster-recovery contract: 27/27 PASS.
- Completed: **M1125–M1149 (25/25)**
- Theme: **CI-Test Reproducibility & Release Verification**
- Focused contract: **28/28 PASS**
- Full server suite: ATTEMPTED/BLOCKED by authoring-environment timeout; no full-suite PASS claimed.
- Next roadmap block starts at M1150 and must contain exactly 25 milestones.
- Batch advancement remains exactly +1 only after successful audit → repair → test → release.
- Complete-all-slices-before-archive rule remains active.


## Latest project state
- Current project state is V6.2.54 B600.


## B116 permanent security boundary
- All user-facing external navigation must pass through the shared safe external-navigation policy.
- HTTPS is required; custom schemes, embedded credentials, localhost/private hosts and overlong URLs are rejected.
- Payment URLs are restricted to approved provider origins; Yaayz advertiser target/image URLs are sanitized before being returned to clients.


## B118 sealed checkpoint — V5.77.0
- M1275–M1299 complete: **25/25 IMPLEMENTED / VALIDATED**.
- Major repair: `/api/transcribe` now uses a bounded, managed transient audio-upload lifecycle with startup/periodic orphan cleanup and global Multer-error cleanup.
- Focused B118 contract: **26/26 PASS**.
- Cumulative B112–B118 focused certification: **187/187 PASS**.
- Syntax sweep: **439/439 PASS**.
- Release consistency: **3/3 PASS**.
- Release audit: **PASS**.
- Full server suite: **ATTEMPTED / BLOCKED** after 983 observed tests by authoring-session timeout; no full-suite PASS claimed.
- Next block: **M1300–M1324 / B119**.


## B119 historical checkpoint — V5.78.0
- M1300–M1324: **25/25 IMPLEMENTED / VALIDATED**.
- Focused B119 contract: **26/26 PASS**.
- Account portability regression: **4/4 PASS**.
- Final release gate: **IN PROGRESS**.


## B120 active checkpoint — V5.79.0
- M1325–M1349: **25/25 IMPLEMENTED / VALIDATED**.
- Major repair: public marketplace product/vendor visibility is centralized; inactive products/vendors are excluded from public detail, image, and share surfaces.
- Product image caching is bounded and revalidating rather than immutable.
- Focused B120 contract: **25/25 PASS**.
- Final release gate: **IN PROGRESS**.


## B120 sealed checkpoint — V5.79.0
- M1325–M1349 complete: **25/25 IMPLEMENTED / VALIDATED**.
- Focused B120: **25/25 PASS**.
- Cumulative B112–B120 focused certification: **238/238 PASS**.
- Syntax: **449/449 PASS**.
- Release consistency: **3/3 PASS**.
- Static release gate: **PASS**.
- Release audit: **PASS**.
- Full server suite: **ATTEMPTED / BLOCKED** after 151 observed tests by authoring-session timeout; no full-suite PASS claimed.
- Dependency-backed release gate: **BLOCKED** because `node_modules` is absent.
- Next block: **M1350–M1374 / B121**.


## B123 active checkpoint — V5.82.0
- M1350–M1374: **25/25 IMPLEMENTED / VALIDATED**.
- Major repair: Zeeza share links now honor active-account/private-profile state, support explicit rotation and revocation, use no-store responses, normalize tokens through one policy, and rate-limit public share surfaces.
- Focused B121 contract: **26/26 PASS**.
- Final release gate: **IN PROGRESS**.


## B123 sealed checkpoint — V5.82.0
- M1350–M1374 complete: **25/25 IMPLEMENTED / VALIDATED**.
- Focused B121: **26/26 PASS**.
- Cumulative B112–B121 focused certification: **264/264 PASS**.
- Static release suite: **40/40 PASS**.
- Syntax: **451/451 PASS**.
- Release audit: **PASS**.
- Full server suite: **ATTEMPTED / BLOCKED** after 36 observed tests by authoring-session timeout; no full-suite PASS claimed.
- Dependency-backed release gate: **BLOCKED** because `node_modules` is absent.
- Next block: **M1400–M1424 / B123**.


## B123 Checkpoint — V5.82.0
- M1400–M1424: 25/25 IMPLEMENTED / VALIDATED.
- Focused B123 contract: 26/26 PASS.
- Cumulative B112–B123 focused: 316/316 PASS.
- Combined notification/recovery verification: 324/324 PASS.
- Syntax: 454/454 PASS.
- Static release suite: 40/40 PASS.
- Release audit: PASS.
- Full server suite: ATTEMPTED / BLOCKED after 36 observed tests by authoring-session execution ceiling.
- Dependency gate: BLOCKED because node_modules is absent.
- Next: M1425–M1449 / B124.


## B124 sealed checkpoint — V5.83.0
- M1425–M1449: 25/25 IMPLEMENTED / VALIDATED.
- Notification worker integrity contract: 25/25 PASS.
- Notification delivery regression: 10/10 PASS.
- Receipt-check concurrency is atomically claimed with a bounded 5-minute lease.
- Stale receipt-check workers are recoverable at startup and within delivery processing.
- Schema boundary advanced to schema-v114 with receiptCheckAt and receipt lease index.
- Next block: M1450–M1474 / B125.


## B125 sealed checkpoint — V5.84.0
- M1450–M1474: **25/25 IMPLEMENTED / VALIDATED**.
- Major repair: notification dedupe persistence is now atomic through the existing `(userId,dedupeKey)` unique index, eliminating SELECT-then-INSERT race conditions.
- Duplicate sends return the existing notification event without requeueing push delivery.
- Existing notification delivery, push preference, token ownership, and in-app source-of-truth behavior preserved.
- Focused B125: **25/25 PASS**.
- Notification delivery + notification-center regression: **16/16 PASS**.
- Combined B123+B124+B125 notification contracts: **69/69 PASS**.
- Cumulative B112–B125 focused contracts: **343/343 PASS**.
- JS/MJS/CJS syntax: **456/456 PASS**.
- Static release suite: **40/40 PASS**.
- Release audit: **PASS — V5.84.0**.
- Release gate dependency preflight remains blocked because node_modules is absent in the authoring environment.
- Full server suite: **ATTEMPTED / BLOCKED by authoring-session execution ceiling; no full-suite PASS claimed**.
- Next block: **M1475–M1499 / B126**.


## B126 active checkpoint — V5.85.0
- M1475–M1499: **25/25 IMPLEMENTED / VALIDATED**.
- Major repair: push-token registration no longer uses destructive `INSERT OR REPLACE`; ownership is established atomically and a token already owned by another account is rejected without revealing the owner identity.
- Same-account token registration refreshes platform metadata and timestamp.
- Existing send-time token ownership verification and user-scoped unregister behavior are preserved.
- Focused B126 contract: **25/25 PASS**.
- Push-token registry behavior: **1/1 PASS**.
- Notification delivery + ownership regression: **10/10 PASS**.
- Next block: **M1500–M1524 / B127**.


## B126 FINAL CHECKPOINT — V5.85.0
- M1475–M1499: **25/25 IMPLEMENTED / VALIDATED**.
- Major repair: push-token registration is now ownership-safe and transactional; destructive `INSERT OR REPLACE` was removed.
- Cross-account token takeover: rejected with HTTP 409 without exposing owner identity.
- Same-account refresh: preserved.
- Focused B126 contract: **25/25 PASS**.
- Registry behavior: **1/1 PASS**.
- Notification delivery + ownership regression: **10/10 PASS**.
- Cumulative B112–B126 focused contracts: **345/345 PASS**.
- JS/MJS/CJS syntax: **458/458 PASS**.
- Release consistency: **3/3 PASS**.
- Static release suite: **40/40 PASS**.
- Release audit: **PASS — V5.85.0**.
- Full server suite: **ATTEMPTED / BLOCKED after 151 observed tests by authoring-session execution ceiling**; no full-suite PASS claimed.
- Dependency gate: **BLOCKED — node_modules absent**.
- Next block: **M1500–M1524 / B127**.


## B127 FINAL CHECKPOINT — V5.86.0
- M1500–M1524: **25/25 IMPLEMENTED / VALIDATED**.
- Focused B127: **25/25 PASS**.
- Immediate DeviceNotRegistered owner-scoping behavior: **1/1 PASS**.
- Next block: **M1525–M1549 / B128**.


## B127 FINAL CHECKPOINT — V5.86.0
- M1500–M1524: **25/25 IMPLEMENTED / VALIDATED**.
- B127 focused contract: **25/25 PASS**.
- Immediate DeviceNotRegistered owner-scoping behavior: **1/1 PASS**.
- Cumulative B112–B127 contract tests: **347/347 PASS**.
- JS/MJS/CJS syntax: **459/459 PASS**.
- Release consistency: **3/3 PASS**.
- Static release suite: **40/40 PASS**.
- Release audit: **PASS — V5.86.0**.
- Full server suite: **ATTEMPTED / BLOCKED after authoring-session execution ceiling**; no full-suite PASS claimed.
- Dependency gate: **BLOCKED — node_modules absent**.
- Next block: **M1525–M1549 / B128**.

## B128 FINAL CHECKPOINT — V5.87.0
- M1525–M1549: **25/25 IMPLEMENTED / VALIDATED**.
- Account lifecycle maturity adds an explicit relationship manifest and vendor-staff closure cleanup.
- Kitchen referrals are delete-on-closure; financial kitchen orders/cashback remain retained.
- Focused B128 contract: **26/26 PASS**.
- Release consistency: **3/3 PASS**.
- Static release suite: **40/40 PASS**.
- Release audit: **PASS — V5.87.0**.
- Full server suite: **ATTEMPTED / BLOCKED after authoring-session execution ceiling**; no full-suite PASS claimed.
- Dependency gate: **BLOCKED — node_modules absent**.
- Next block: **M1575–M1599 / B130**.



## Individual Main roadmap contract
- `MASTER_ROADMAP.md` is the only active Main roadmap and progress authority.
- Every execution block contains exactly 25 sequential milestones; future items remain registered/not started until evidence supports a status change.
- Do not infer Main work from another app’s roadmap or a historical external PDF.

## Industry and company model (current)
- **A. A. M. I.** = Abdul Ahad Mubarrak Industry; AAMI is shorthand for the industry.
- **AAMI coin** = industry coin concept intended across member companies; do not claim a live coin/payment system unless separately implemented and tested.
- **NEXA Central Company** operates **AAMI CENTRAL WEB APP**, the central governance product.
- **Admin AAMI** is the umbrella administrative portal, not a company. Its company selector initially has NEXA and LORDGISTICS only.
- **Administrative Director** is the user-facing title for administrative roles. Internal role IDs/API tokens stay stable until a separately tested migration is authorized.
- NEXA and LORDGISTICS have separate company-scoped accounts, sessions, APIs, records, approvals, disputes and staff permissions. A company tile is navigation, never authorization.
- A new company is added through a deliberate owner-authorized future app update and roadmap block.
