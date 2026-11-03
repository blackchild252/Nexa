# B281 — V5.99.35 (checkpoint 10)

## Changed
- NEW src/pushTapRouting.ts (payload to Expo Router href for every server push screen, group calls to the group call screen) and NEW src/pushTaps.tsx (foreground display, tap, launch tap, held until authenticated, repeats ignored), mounted in src/app/_layout.tsx.
- NEW scripts/devils-walk.mjs: the in-depth full sweep, find only. NEW scripts/god-hand.mjs: the in-depth full sweep fix (plans 25 milestones per run, verifies identity did not move, never edits files). npm scripts `walk` and `godhand`.
- scripts/release-ship.mjs runs the quick Devil's Walk before sealing.
- Definition: docs/architecture/DEVILS_WALK_AND_GOD_HAND.md, a new AGENTS.md section outside the locked naming section, one CLAUDE.md line, one ADR entry.
- New guard v5_99_35_b281_block_guards (8 checks), registered in the release gate.

## Checked
- Push tap routing: 22 cases (every server screen, missing ids, group call, unknown and empty payloads) run outside the repo. All pass.
- Devil's Walk on the real source: identity pass, JS syntax 641/641, TypeScript syntax 187 files clean, relative imports 599/599, router targets 39/39. A deliberate bad import and bad route were caught and removed.
- Full per-file sweep: 432 pass of 440; the 8 that fail are the parked-external files. God Hand verify: identity unchanged, 0 blockers.
- The release-enforcement test fixture now copies the three files theme.ts imports, because ship runs the walk.
- God Hand plan ran on the real source and queued 25 slots.
- Layout and borders: static scan only, 22 candidates, all overrides of a base style; no defect found.

## NOT tested
Phone (a real tap, foreground banner, both themes visually), full typecheck (no node_modules), EAS, Playwright, the dotenv and better-sqlite3 files.

## Known limits
Yaayz and vendor taps open the right place but not a specific order, because those screens read no order id yet.
