# B254 — V5.99.8 (stabilization run; no roadmap milestones advanced)

## Why
The owner does not write code; AI sessions do, each starting without memory. The B253 tools only protect a release if a session runs them.

## Built
1. `npm run session:start` (`scripts/session-start.mjs`): first action of every session; runs the identity check, reports SEALED/UNSEALED, prints the session rules, exits non-zero on drift.
2. `npm run release:ship` (`scripts/release-ship.mjs`): identity check -> placeholder notes refused -> `B254_REPORT.md` required -> seal create/verify -> zip as `NEXA-V<version>.zip` -> extract and re-verify.
3. `CLAUDE.md` (read-first pointer) and an AGENTS.md "Session protocol" section outside the locked section.
4. CI runs `release:identity` before anything else; `pretest:server` runs it before the server suite.
5. Contract test `v5_99_8_b254_release_enforcement` (5 checks, version-agnostic) added to the release gate; ADR recorded.

## Not changed
The locked naming/versioning section of AGENTS.md (its example arrows still read V5.99.5 -> V5.99.6).

## Not tested
CI on GitHub, `/health` over real HTTP, cloud deployment, on-phone rendering, EAS build, install-over-old.
