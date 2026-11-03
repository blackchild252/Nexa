# Release integrity, archive reproducibility and roadmap governance — execution evidence

**Product:** NEXA Main App only
**Roadmap block:** M7666–M7690 (run in B580)
**Status:** see the table in `MASTER_ROADMAP.md`. The real `scripts/release-seal.mjs` and `scripts/release-ship.mjs` were run, with the real `zip` and `unzip`, on throwaway copies of the project. No registry, device, store, signing key or live server was used.

## Inventory (M7666)

Release tooling in `scripts/`: `release-identity.mjs` (check, bump, rollover), `release-seal.mjs` (create, verify, list), `release-ship.mjs` and `checkpoint-ship.mjs` (zip and prove), `release-gate.mjs`, `release-audit.mjs`, `roadmap-check.mjs`, `session-start.mjs`, `god-hand.mjs`, `devils-walk.mjs`, `angels-duty.mjs`. Trust boundary: these run on the developer's machine from the project folder; they read project files and write the seal, the archive and its `.sha256`. They take no network input.

## What was found and fixed

1. **The zip and the seal disagreed about which files belong to a release.** The seal skipped `node_modules`, `build`, `dist`, `.turbo` and similar at any depth; the zip only skipped some of them at the top level. So a nested `src/node_modules`, `android/app/build` or `.turbo` folder went into the zip but not the seal, and a `.env.example` outside `server/` was sealed but never zipped. Either way the extracted archive would fail its own seal check. Proven on a throwaway tree before the fix: 3 files in the zip only, 2 in the seal only.
   Fix: the seal is now the one authority. `release-seal.mjs list` prints the sealed file list; `release-ship.mjs` zips exactly that list (plus the seal file) with `zip -@`. The second exclusion list in the ship script is gone.
2. **Stray archives.** The old zip skipped every `*.zip`; the seal only skipped the release's own archive. The seal now skips `*.zip` and `*.zip.sha256` too, so a nested archive can never be sealed or shipped. No such file exists in the project today.
3. **Raw stack traces.** With a missing or broken `package.json` or `PROJECT_MEMORY.json`, or a missing or malformed seal file, `release-seal.mjs` printed a Node stack trace with internal paths. It now stops with one short line, `RELEASE SEAL BLOCKED — ...`, exit 2 (project files) or exit 1 (seal file). Values copied from a seal file into a message are cut to 40 characters. A seal file must have a `files` list of `{path, sha256}` entries or it is refused as malformed.
4. **File names with a line break** cannot be listed safely for the zip; `list` refuses them (exit 1) instead of packing a wrong name.
5. **Cleanup in `release-ship.mjs`.** The temporary extract folder is removed if extraction fails, and an old `.sha256` is removed together with the old archive, so a hash never sits beside a missing zip.

## How it was proven

- New `server/releaseArchiveReproducibility.contract.test.js` — 10 tests, in `npm run verify:contract`.
- With the old `release-seal.mjs` and `release-ship.mjs` put back, 9 of the 10 fail. With the fix, all 10 pass.
- `release-ship` was run end to end (real `zip`, `unzip`, seal, extracted-archive check) on a copy that holds nested build folders, nested `node_modules`, `.env` files, key and certificate files, a `.netrc`, a service-account file and stray zips. The archive held exactly the sealed files plus the seal file. Run twice, it gave the same file names and the same content checksums, and a `.sha256` that matches the archive.
- A sealed release that changed afterwards is still refused and no archive is written.
- `seal create` is still one-way; a good seal still verifies; a changed file is still named in the failure.
- 89 related existing release, checkpoint, roadmap and identity tests: 86 pass, 0 fail, 3 skip.
- `CI=true npm run verify:contract`: 1332 tests, 1331 pass, 0 fail, 1 skip (M7527, needs server dependencies).
- Devil's Walk: 930/930 JS syntax, 235 TS files parse, 800/800 relative imports, 59/59 route targets. `roadmap:check`, `godhand -- verify`, `release:identity` pass.

## Follow-up in B581 (owner permission: correct what has to do with `release:bump`)

- **`release:bump` now owns the README and LAUNCH_HANDOFF headings.** New `sync-docs` step in `scripts/release-identity.mjs`, run by every bump (and runnable alone). It writes the README first line, the "Start here" report name and the "Current checkpoint" state, and puts a short current-release block at the top of `LAUNCH_HANDOFF.md` that points to the bump's own section at the end. Older notes are kept. Running it twice changes nothing; a missing README is skipped, not created. `npm run release:audit` now passes; it had failed since B577.
- **`release-identity.mjs` and `session-start.mjs` stop with one short line** (`RELEASE IDENTITY BLOCKED — ...`, exit 2) on a missing or non-JSON `package.json`, with no stack trace or internal path.
- Proven: 4 new tests (14 in the file); with the old identity script put back, those 4 fail.
- Not changed: the locked section of AGENTS.md; the bump rule itself (patch, Batch, build code, +1 each).

## Found and left alone

- The seal list is not size-limited. It is built from the local file system only; no outside input reaches it.
- The README's long narrative sentence after "Current checkpoint" still describes the Dami avatar work from B577. The bump only moves the state, report name and build code; the narrative is the owner's text.

## NOT TESTED

- A real Windows or macOS zip; `zip` on a file system that cannot hold odd names; very large projects.
- `release:gate` end to end (it needs the server runtime), `npm run test:server`, typecheck (`node_modules` absent), M7527, web export, native builds, any phone, store or signing step.
