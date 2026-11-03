# B253 — V5.99.7 (stabilization run; no roadmap milestones advanced)

## Why
Version, Batch and build code were edited by hand in about 40 places. B252 missed LAUNCH_HANDOFF.md, and each release forced old tests to be re-edited because they pinned old versions.

## Built
1. `scripts/release-identity.mjs` — `check` (version-agnostic, 40+ locations, build−batch invariant, package name, archive name) and `bump` (+1 on patch, Batch, build code everywhere, refuses on drift or an existing seal).
2. `server/releaseIdentity.json|js` — identity available to the Docker runtime; `/health` now returns `batch` and `build`; startup log prints the release.
3. Release gate runs the identity check; `npm run release:identity` / `release:bump`.
4. Version-agnostic contract test; B252 test no longer pins a version.
5. Repaired B252 miss: LAUNCH_HANDOFF.md now has the release section.
6. ADR recorded in docs/architecture/ARCHITECTURE_DECISIONS.md.

## Build identity
V5.99.7 / B253 / build code 6072 in every app.json field. Package com.aami.nexa unchanged.

## Not tested
On-phone rendering, EAS build, install-over-old, full typecheck, /health over real HTTP (needs better-sqlite3), cloud deployment.
