# NEXA B355 — V6.0.9

## M5091–M5115 — Learning Provenance and Topic Hygiene

25/25 milestones completed.

### Scope
- Normalized user-defined learning topic keys at write time.
- Added migration-safe `topicKey` provenance to `ai_learning_events`.
- Added topic indexing for owner/profile-scoped event retrieval.
- Exposed event topic provenance in learning state.
- Preserved topic-forgetting case-insensitivity.
- Added Admin Operations explicit-learning topic support.
- Preserved owner/profile isolation, governed adaptive-learning boundaries and canonical audit lineage.
- Preserved existing follow-up lifecycle and privacy/account portability behavior.
- Added focused provenance and normalization regression coverage.
- No new learning subsystem introduced.

### Verification
- Focused Consumer/Admin learning + API + Admin-web suite: 82/82 PASS.
- Devil's Walk: CLEAN.
- JS syntax: 734/734.
- TS syntax: 205 files.
- Relative imports: 649/649.
- Route targets: 43/43.
- Blockers: 0.
- Release identity: PASS.

### Not tested / excluded
- Dependency-backed TypeScript typecheck: not run because node_modules/dependencies are absent.
- Browser/device/Playwright execution: not run.
- Live AI provider execution: not run.
- EAS, store submission and deployment: excluded.
