# Devil's Walk and God Hand

These two names are the project's full-sweep pair. They define no naming, version, Batch, build-code or archive rule. All of that stays in the locked "Naming and versioning" section of `AGENTS.md`, which wins over anything here.

## Devil's Walk = the in-depth full sweep (find only)
A Devil's Walk reads the whole current cumulative source and reports what is wrong. It never repairs anything.

It covers, in this order:
1. Release identity (the authority script `release-identity.mjs check`).
2. JavaScript syntax of every file under `server/` and `scripts/`.
3. TypeScript syntax of every file under `src/` (a full typecheck needs `node_modules`; without it the result says NOT RUN).
4. Every relative import under `src/` resolves to a real file.
5. Every static router target under `src/app` paths resolves to a real route file.
6. Advisory scan for layout and borders (a border colour with no border width in the same small style object). Advisories never fail a gate.
7. With `--tests`: every server test file is loaded into Node's native test runner with bounded concurrency and a 20 s per-test timeout. This avoids the old process-per-file startup queue while retaining the complete test-file sweep. Files parked as external (they need dotenv, better-sqlite3 or a CI environment) are reported but never counted as blockers.

Each finding is a **BLOCKER** or an **ADVISORY**. Evidence is labelled TESTED/PASSED, NOT TESTED, BLOCKED, DEFERRED. Anything that needs a phone, EAS, a store or a browser is NOT TESTED here and stays out of scope unless the owner says the project is launching.

Command: `npm run walk` (quick) or `npm run walk -- --tests` (full).

## God Hand = the in-depth full sweep fix
God Hand is the repair half. It takes the Devil's Walk result and solves it, 25 milestones per run.

1. `npm run release:bump` (never edit a version, Batch, build code or archive name by hand).
2. `npm run godhand` runs the full sweep and queues exactly 25 milestones: blockers first, then open carry-forward items, then the next roadmap milestones.
3. The session works the queue in order. For each item: inspect the real files, make the smallest safe change, test it at once, then move on. A blocker that cannot be fixed is recorded as BLOCKED with the reason and the run keeps going.
4. `npm run godhand -- verify` re-runs the sweep and proves the version, Batch and build code did not move during the run. It fails while blockers remain.
5. Write the release notes, then `npm run release:ship`. The ship step runs the quick Devil's Walk before sealing, so a release with open blockers cannot be sealed or zipped.

God Hand itself never edits files. It plans, checks and refuses. The fixes are made by the session, one tested change at a time.

## Relationship to the archive rules
The archive is still produced only by `npm run release:ship`, with the name the locked section defines. Devil's Walk is a gate inside that step; God Hand is the work that happens between the bump and the ship.


## Angels Duty = the permanent cleanup layer
Angels Duty is the cleanup half that sits beside Devil's Walk and God Hand. It is deliberately conservative: it removes only unambiguous temporary/generated junk and reports exact duplicate files for human evidence review.

### What Angels Duty does
1. Scans the cumulative project while protecting source, runtime data, release seals, reports, roadmaps, project memory, dependencies, build output and historical archives.
2. Identifies safe temporary artifacts such as `.tmp`, `.temp`, editor swap files, backup/reject files and common generated debug logs.
3. Detects exact duplicate files by SHA-256 and reports them without deleting either copy.
4. In apply mode, removes only the safe-junk allowlist and immediately re-audits.
5. Returns a machine-readable result with scanned files, removals, duplicate groups and blockers.

Commands:
- `npm run angels-duty` — audit only.
- `npm run angels-duty -- --apply` — remove only safe-junk candidates, then re-audit.
- `npm run angels-duty -- --json` — machine-readable audit output.

### Permanent release position
`npm run release:ship` runs Angels Duty in apply mode before Devil's Walk. This makes cleanup a permanent release-layer responsibility without allowing heuristic deletion of code, data, history or intentional assets.

The three-layer relationship is:
- **Devil's Walk** — find what is wrong.
- **God Hand** — repair what is wrong, 25 milestones at a time.
- **Angels Duty** — remove proven dead temporary weight and expose exact duplicates without guessing.
