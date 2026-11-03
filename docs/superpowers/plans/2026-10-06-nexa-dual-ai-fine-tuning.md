# NEXA Dual-App AI Fine-Tuning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a controlled Consumer Dami and Admin Operations AI profile system that can reference fine-tuned model configurations, evaluate candidates, preserve live-data/tool boundaries, and roll back safely without replacing the existing AI architecture.

**Architecture:** Extend the existing AI provider gateway with profile/model configuration and a server-owned profile registry. Add dataset/evaluation utilities that operate on curated, sanitized examples, then expose evaluation-only and promotion/rollback state without granting AI authority. Consumer and Admin orchestration paths select different profiles and retain existing tool, confirmation, receipt, Staff capability, and server authorization boundaries.

**Tech Stack:** Node.js/CommonJS, existing AI provider gateway, existing Dami orchestration/workflow modules, SQLite/server DB patterns, Node built-in test runner, existing admin-web JavaScript UI.

**Spec:** `docs/superpowers/specs/2026-10-06-nexa-dual-ai-fine-tuning-design.md`

## Global Constraints

- Do not train on the complete NEXA database or automatically fine-tune every user conversation.
- Live/private business truth remains in controlled retrieval/tools, not model weights.
- Server-side authorization remains authoritative for every protected action.
- AI-generated IDs, amounts, states, ownership and capability claims are untrusted input.
- Consumer and Admin AI profiles remain behaviorally and permissionally separate.
- Staff AI receives only context permitted to that Staff identity/capability.
- Preserve existing Dami action confirmation, replay safety, receipts, workflows and provider-policy boundaries.
- Training examples must be curated, provenance-tagged and sanitized of unnecessary PII/secrets.
- Device, EAS, stores and external-provider deployment work is excluded.
- Release/version/build identity must be changed only through the repository's locked release workflow.

## Review Focus

1. A candidate Admin model must never become an authorization authority — covered by profile/tool-boundary contracts.
2. A Staff request must not gain capability through AI-generated instructions — covered by Staff-scoped profile tests.
3. Current balances/orders/payments must not be treated as training truth — covered by dataset sanitizer and retrieval-routing tests.
4. A malformed model/tool output must not bypass existing validation — covered by structured-output and workflow regression tests.
5. A promoted model must have an evaluation record and rollback target — covered by registry lifecycle tests.

---

### Task 1: AI Profile Registry

**Files:**
- Create: `server/aiProfileRegistry.js`
- Test: `server/aiProfileRegistry.test.js`
- Modify: `server/aiProviderGateway.js`

**Interfaces:**
- Produces `getAiProfile(profileId, env)` and `resolveAiModel(profileId, env)`.
- Profile IDs: `consumer_dami`, `admin_operations`.
- Each profile returns provider, model reference, profile version, candidate/promoted state, and rollback target without exposing secrets.

- [ ] **Step 1: Write failing registry tests** for profile isolation, default fallback, candidate selection, and rollback target validation.
- [ ] **Step 2: Run the focused test and verify failure.**
- [ ] **Step 3: Implement the registry and gateway integration** using existing provider configuration and environment variables; do not hard-code credentials.
- [ ] **Step 4: Run the focused tests and verify PASS.**
- [ ] **Step 5: Run existing `aiProviderGateway` tests and verify no regression.**

### Task 2: Training Dataset Boundary and Sanitization

**Files:**
- Create: `server/aiTrainingData.js`
- Test: `server/aiTrainingData.test.js`

**Interfaces:**
- `sanitizeTrainingExample(example)` returns a normalized example with sensitive fields removed/redacted and provenance metadata retained.
- `validateTrainingDataset(dataset)` rejects malformed, unauthorized, secret-bearing or provenance-free examples.
- Dataset records distinguish `consumer_dami` and `admin_operations`.

- [ ] **Step 1: Write failing sanitizer tests** covering credentials, tokens, payment identifiers, exact balances, unnecessary PII, provenance and profile separation.
- [ ] **Step 2: Run focused tests and verify failure.**
- [ ] **Step 3: Implement deterministic sanitization/validation without network calls.**
- [ ] **Step 4: Run focused tests and verify PASS.**

### Task 3: Evaluation Harness

**Files:**
- Create: `server/aiEvaluation.js`
- Test: `server/aiEvaluation.test.js`

**Interfaces:**
- `evaluateAiProfile(profileId, candidate, cases)` returns deterministic aggregate metrics plus per-case failures.
- Evaluation categories: terminology, policy, hallucination resistance, structured output, refusal boundary, tool selection, authorization boundary and regression.
- Results include dataset version, candidate model reference, profile version and timestamp.

- [ ] **Step 1: Write failing evaluation tests** for pass/fail thresholds and category failures.
- [ ] **Step 2: Run focused tests and verify failure.**
- [ ] **Step 3: Implement evaluation adapters** so model invocation can be injected/mocked; do not call external providers in unit tests.
- [ ] **Step 4: Run focused tests and verify PASS.**

### Task 4: Profile Promotion and Rollback State

**Files:**
- Create: `server/aiProfileLifecycle.js`
- Test: `server/aiProfileLifecycle.test.js`
- Modify: `server/db.js`

**Interfaces:**
- Lifecycle states: candidate, evaluated, promoted, rolled_back.
- `promoteAiProfile(profileId, candidate, evaluation)` requires a passing evaluation and creates a rollback target.
- `rollbackAiProfile(profileId)` restores the previous promoted configuration.

- [ ] **Step 1: Write failing lifecycle tests** for rejected evaluations, promotion, rollback, duplicate promotion and profile isolation.
- [ ] **Step 2: Run focused tests and verify failure.**
- [ ] **Step 3: Add minimal DB tables/indexes and lifecycle implementation** following existing SQLite initialization patterns.
- [ ] **Step 4: Run lifecycle tests and verify PASS.**

### Task 5: Consumer Dami Profile Integration

**Files:**
- Modify: `server/damiOrchestrator.js`
- Modify: `server/damiProviderPolicy.js`
- Test: `server/damiFineTuningProfile.contract.test.js`

**Interfaces:**
- Dami requests resolve `consumer_dami` through the registry before provider execution.
- Existing action confirmation, replay, receipt and provider policy functions remain the final gates.

- [ ] **Step 1: Write failing integration contracts** for profile selection, live-data routing, malformed tool output and consequential-action confirmation.
- [ ] **Step 2: Run contracts and verify failure.**
- [ ] **Step 3: Integrate the profile selector at the existing Dami orchestration boundary without changing action authority.**
- [ ] **Step 4: Run focused Dami contracts and existing workflow/receipt/replay tests.**

### Task 6: Admin Operations AI Profile

**Files:**
- Create: `server/adminAi.js`
- Create: `server/adminAi.contract.test.js`
- Modify: `server/adminAccess.js`
- Modify: `server/adminStaffWork.js`
- Modify: `admin-web/src/api.js`
- Create/Modify: `admin-web/src/views/admin-ai.js`
- Modify: `admin-web/src/app.js`

**Interfaces:**
- Admin AI requests resolve `admin_operations` and accept an explicit Admin/Staff operational context.
- Staff context contains only active capability/resource scope.
- Admin AI returns recommendations/evidence summaries; protected mutations continue through existing Admin/Staff server routes.

- [ ] **Step 1: Write failing contracts** for owner Admin, Staff capability scope, unassigned work denial, destructive-action confirmation and audit metadata.
- [ ] **Step 2: Run focused contracts and verify failure.**
- [ ] **Step 3: Implement the Admin AI server boundary** using existing access/capability guards and the profile registry.
- [ ] **Step 4: Add the Admin AI workspace UI** using existing Admin visual tokens, no decorative animation, with clear recommendation-vs-decision states.
- [ ] **Step 5: Run Admin AI contracts and the existing 61-test admin-web suite.**

### Task 7: Observability and Runtime Profile Versioning

**Files:**
- Modify: `server/aiObservability.js`
- Test: `server/aiObservabilityFineTuning.contract.test.js`

**Interfaces:**
- Every AI invocation records profile ID, profile version, model reference, provider, evaluation/promoted state and correlation ID.
- Sensitive prompt/output content is not persisted unless an existing approved diagnostic path explicitly requires it.

- [ ] **Step 1: Write failing observability tests** for profile/version correlation and sensitive-content exclusion.
- [ ] **Step 2: Implement profile metadata recording using existing observability conventions.**
- [ ] **Step 3: Run focused and existing observability tests.**

### Task 8: Evaluation Datasets for Both Apps

**Files:**
- Create: `server/ai-evals/consumer-dami.json`
- Create: `server/ai-evals/admin-operations.json`
- Create: `server/ai-evals/README.md`
- Test: `server/aiEvaluationDatasets.contract.test.js`

**Interfaces:**
- Dataset fixtures are synthetic/approved examples only.
- Consumer cases cover NEXA vocabulary, Aami/SkyMoney, Yaayz, Chase, marketplace, navigation, safe actions and unknown-current-data routing.
- Admin cases cover Approval Center, Staff work, disputes, violations, moderation, payments, verification, audit and authority boundaries.

- [ ] **Step 1: Add curated evaluation fixtures** with explicit expected category and safety behavior.
- [ ] **Step 2: Add dataset integrity tests** for profile separation, provenance and no-secret patterns.
- [ ] **Step 3: Run dataset and evaluation tests.**

### Task 9: Full AI Regression and Release Integration

**Files:**
- Create: `server/dualAiFineTuning.contract.test.js`
- Modify: `docs/architecture/ARCHITECTURE_DECISIONS.md`
- Modify: `VERSION.md`
- Modify: `LAUNCH_HANDOFF.md`
- Modify: roadmap/release records required by the locked release workflow

- [ ] **Step 1: Write the cumulative contract** covering both profiles, lifecycle, rollback, authorization, Staff isolation, data boundary and existing Dami safety.
- [ ] **Step 2: Run focused AI contracts plus existing Dami/Admin suites.**
- [ ] **Step 3: Run `npm run walk`.**
- [ ] **Step 4: Run `npm run godhand` and then `npm run godhand -- verify`; if timeout occurs, record it as not passed rather than claiming success.**
- [ ] **Step 5: Run the repository's locked release bump/ship workflow and create the correctly named `NEXA-V<version>.zip` only after all applicable gates pass.**
- [ ] **Step 6: Record release version, Batch, tests, exclusions, evaluation versions and rollback target.**

## Self-Review

- Spec coverage: all success criteria map to Tasks 1–9; no requirement is intentionally unowned.
- Step scan: each task has independently testable boundaries and explicit interfaces.
- Type/interface consistency: profile IDs and lifecycle functions are reused consistently across registry, Dami, Admin, lifecycle and observability tasks.
- Review focus: all five high-risk cases have explicit owning tasks/tests.
- Proportion: the plan defines interfaces and verification gates without prescribing implementation bodies unnecessarily.
