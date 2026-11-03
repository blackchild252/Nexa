# B453 Report — NEXA Main App

**Release identity:** V6.1.7 B453, build identity 6272.  
**Roadmap:** Main Block 15, M6766–M6790 — Dami Knowledge, Workflows & Actions.

## B453 corrective implementation
- Enforced a separate workflow approval lifecycle: `draft → awaiting_approval → approved → active`.
- Direct `draft → approved` and `draft → active` transitions are rejected. Only draft definitions can be edited; awaiting-approval, approved and active definitions are immutable.
- Workflow execution now fails closed unless the workflow is approved or active. Explicit per-run confirmation plus a `confirmedActions` entry for every step index, bounded idempotency and the local `create_task` / `save_note` action allowlist remain required.
- Cancelled and archived workflows remain terminal. Workflow update uses optimistic status matching and reports concurrent changes instead of claiming success.
- Audit writes no longer silently swallow persistence errors. Workflow deletion removes dependent run receipts/idempotency records while retaining audit lineage.
- Knowledge document MIME/type is persisted through an additive migration for existing `ai_knowledge` tables.

## Block 15 implementation retained
- Bounded Knowledge Hub ingestion, deterministic chunking/fingerprints, owner-scoped retrieval, citations/provenance, source deletion and prompt-injection boundaries.
- Dami chat consumes retrieved knowledge as untrusted context only when user-controlled memory is enabled.
- Durable owner-scoped workflow receipts and audit history.
- Separate owner-only Admin Operations knowledge/workflow APIs are included in the Main server; Admin frontend remains in its own separately versioned archive. Admin data is stored in dedicated tables and never mutates consumer-owned knowledge.

## TESTED/PASSED
- Main focused Dami/knowledge/workflow/governance suite: **84/84 passed**.
- Main `npm run verify:contract`: **603/603 passed**.
- Main `npm run e2e:contract`: **4/4 passed**.
- Admin governance domain suite: **28/28 passed**.
- Admin persistence/API behavior suite: **3/3 passed**.
- Admin UI/API contract tests: **2/2 passed**.
- Full Admin test suite: **472/472 passed**.
- Admin standalone roadmap check: **PASS**; Admin God Hand verification: **PASS**.
- Main Devil’s Walk: **CLEAN** — 811 JavaScript syntax checks, 220 TypeScript syntax files, 740 relative imports, 54 route targets.
- Admin Devil’s Walk: **CLEAN** — 87 JavaScript syntax checks and 141 route targets.
- Main and Admin release identity, seal and archive verification are run by their independent release pipelines.

## NOT TESTED
- Full Main server suite did not complete because the environment lacks installed server dependencies (including `dotenv`) and the broad test sweep exceeded the available run window.
- Main dependency-backed typecheck remains NOT TESTED because dependency installation was incomplete; this is not reported as passed.
- Live Main–Admin HTTP acceptance, deployed database migration against production-like data, browser/device runtime, external connector/provider behavior, EAS, stores and production deployment.

No external credentials were requested or added. External connector/action execution remains disabled. Main and Admin retain separate roadmaps, release identities and checkpoint artifacts.
