# B278 — V5.99.32 (checkpoint 7)

## Changed (three small source fixes; no other code changed)
A second TypeScript walk of src (standalone config, no node_modules) looked at the non-noise errors left after B277.
- REAL BUG, src/ZeezaProfile.tsx: the avatar image label used `name`, which is not declared in that file. On a phone that throws a ReferenceError as soon as a profile picture is set (the web page hides it because the browser has a global `name`). It now uses `profile?.name`, like the lines around it.
- REAL ACCESSIBILITY DEFECT, src/YaayzHomeFeed.tsx: the Yaayz discovery sort group set `accessibilityRole="tablist"` and then spread `accessibilityGroup(...)`, which set the role to `group` and replaced it. The tab buttons inside it were not in a tab list. The spread now comes first, so the tablist role wins.
- CLEANUP, src/NotificationCenter.tsx: the push-alerts switch had two `accessibilityState` props; the later one (checked and disabled) always won. The redundant first one is removed. Behaviour unchanged.
- One old check (v5_98_39 M2559) pinned the redundant prop; it now checks `disabled={savingPrefs}` plus the full state. 27 of 27 pass.
- New: server/v5_99_32_b278_block_guards.contract.test.js (4 checks), registered in scripts/release-gate.mjs.

## Checked and found not to be bugs
- AdminDisputesScreen "Expected 2 arguments": fieldA11y(label, error) has an untyped second argument that is optional in practice.
- MarketplaceScreen cart `variant`, GroupScreen `r.name`, ZeezaInbox `t.name`/`t.username`: type-inference or incomplete-type noise; the code falls back safely at runtime.
- ZeezaProfile "void tested for truthiness" was the `name` bug above.
- NexaNavKeys line 108: `accessibilityLabel` is set twice (the spread from modalA11y wins). Harmless, so left; not changed in a sealed-style small release.

## Result (per-file, 20 s limit, 8 at a time)
Start of B278: 427 pass of 436 files. Now: 428 pass of 437 plus v5_99_8, which passes once these notes exist (checked on its own). The new guard passes. The 8 others that still fail here are unchanged: b144 (5 files) and v5_98_48 need dotenv or better-sqlite3; v5_71_0 needs node_modules (passes with CI=true); b91_repair1 passes alone (about 5 s) but hits the 20 s limit under load.

## Not tested
Phone (the Zeeza profile, Yaayz home feed and notification screens were not opened; fixes are source-level), full typecheck, EAS, Playwright, anything needing node_modules, the dotenv and better-sqlite3 files.
