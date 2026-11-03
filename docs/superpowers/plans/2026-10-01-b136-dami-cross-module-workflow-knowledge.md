# B136 Dami Cross-Module Workflow & Knowledge Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden Dami's existing workflow, replay, receipt, knowledge, memory, and cross-module boundaries across M1725–M1749 without replacing existing authorities.

**Architecture:** Extend the existing Dami server modules (`damiWorkflow*`, `damiReplaySafety`, `damiExecutionReceipts`, `damiKnowledgeState`, `damiMemoryReliability`) with small canonical normalization/validation helpers. Preserve module execution authorities, existing confirmation policy, and current UI contracts; add regression contracts beside the existing Dami test family.

**Tech Stack:** Node.js/CommonJS server modules, existing contract tests, JSON/source-based release gates.

**Spec:** B136 design approved in chat; active roadmap block M1725–M1749 / B136.

## Global Constraints

- Preserve existing Dami execution authorities and confirmation rules.
- Do not rebuild or replace existing workflow architecture.
- No destructive database behavior.
- No environment-dependent release requirements.
- V5.94.0 remains sealed and untouched; B136 targets the working copy.
- B136 closes only after all 25 milestones, cumulative regression, security/authorization review, release audit, metadata reconciliation, and release seal pass.

## Review Focus

- Malformed dependency graphs must be rejected without crashing or silently executing unsafe steps.
- Replay keys must remain stable across equivalent normalized identifiers and must not permit cross-user reuse.
- Conflicting knowledge/memory sources must preserve provenance and deterministic precedence rather than silently merging contradictory claims.
- Expired/invalid confirmations must never authorize a consequential step.
- Receipt/run ownership mismatches must be rejected rather than exposed across users or workflows.

### Task 1: Workflow State & Dependency Integrity — M1725–M1729

**Files:**
- Modify: `server/damiWorkflow.js`
- Modify: `server/damiWorkflowSafety.js`
- Modify: `server/damiWorkflowRuns.js`
- Test: `server/b136_dami_workflow_integrity.contract.test.js`

**Interfaces:**
- Produces: canonical workflow normalization/readiness/audit results consumed by replay and receipt tasks.

- [ ] Write failing tests for canonical state normalization, invalid dependency rejection, duplicate/self dependency rejection, deterministic readiness, and bounded workflow state transitions.
- [ ] Run the focused contract and verify expected failures.
- [ ] Implement minimal canonical validators using existing dependency and intent authorities.
- [ ] Run focused tests and verify pass.
- [ ] Record M1725–M1729 validation.

### Task 2: Confirmation, Replay & Idempotency Integrity — M1730–M1734

**Files:**
- Modify: `server/damiReplaySafety.js`
- Modify: `server/damiWorkflowSafety.js`
- Modify: `server/damiExecutionReceipts.js`
- Test: `server/b136_dami_replay_confirmation.contract.test.js`

**Interfaces:**
- Consumes: canonical workflow state from Task 1.
- Produces: normalized replay keys, confirmation lineage validation, and idempotency decisions.

- [ ] Write failing tests for stable replay keys, cross-user isolation, replay equivalence, confirmation expiry/invalidity, and idempotent consequential execution records.
- [ ] Run focused tests and verify expected failures.
- [ ] Implement the smallest helpers consistent with existing receipt schema.
- [ ] Run focused tests and verify pass.
- [ ] Record M1730–M1734 validation.

### Task 3: Receipt Ownership, Recovery & Cross-Module Boundaries — M1735–M1739

**Files:**
- Modify: `server/damiExecutionReceipts.js`
- Modify: `server/damiWorkflowRuns.js`
- Modify: `server/damiOrchestrator.js`
- Test: `server/b136_dami_receipt_boundary.contract.test.js`

**Interfaces:**
- Consumes: replay/confirmation results from Task 2.
- Produces: ownership-safe receipts, recovery-safe run state, and normalized specialist results.

- [ ] Write failing tests for receipt ownership, workflow/run binding, failed-step recovery, retry boundaries, and specialist-result normalization.
- [ ] Run focused tests and verify expected failures.
- [ ] Implement ownership checks without changing module execution authorities.
- [ ] Run focused tests and verify pass.
- [ ] Record M1735–M1739 validation.

### Task 4: Knowledge, Memory & Context Reliability — M1740–M1744

**Files:**
- Modify: `server/damiKnowledgeState.js`
- Modify: `server/damiMemoryReliability.js`
- Modify: `server/damiWorkflow.js`
- Test: `server/b136_dami_knowledge_memory.contract.test.js`

**Interfaces:**
- Consumes: bounded workflow context from Task 1.
- Produces: provenance-aware knowledge context, deterministic memory conflict handling, current-instruction precedence, and bounded context.

- [ ] Write failing tests for source trust classification, stale-source handling, provenance retention, memory conflicts, current-message precedence, and context-size limits.
- [ ] Run focused tests and verify expected failures.
- [ ] Implement deterministic normalization and precedence without inventing external knowledge.
- [ ] Run focused tests and verify pass.
- [ ] Record M1740–M1744 validation.

### Task 5: Cumulative Regression, Security & Release Certification — M1745–M1749

**Files:**
- Create: `server/b136_dami_cumulative.contract.test.js`
- Modify: `MASTER_ROADMAP.md`
- Modify: `PRIORITY_ROADMAP.md`
- Modify: `TEMPORARY_ROADMAP.md`
- Modify: `VERSION.md`
- Create: `V5_95_0_B136_IMPLEMENTATION_REPORT.md`
- Create: `RELEASE_SEAL_V5.95.0.json`
- Create: `NEXA-V5.95.0.zip`

**Interfaces:**
- Consumes: all validated contracts from Tasks 1–4.
- Produces: B136 release certification and immutable V5.95.0 release artifact.

- [ ] Write failing cumulative/security contract covering all M1725–M1748 boundaries.
- [ ] Run it and verify failures correspond only to unfinished B136 behavior.
- [ ] Implement any final minimal reconciliation required by the contract.
- [ ] Run focused, cumulative, static release, and release-audit gates.
- [ ] Reconcile roadmap/checkpoint/version metadata.
- [ ] Create the one-way V5.95.0 release seal.
- [ ] Verify seal immutability and release gate.
- [ ] Create and hash the cumulative archive only after every gate passes.

## Milestone Mapping

- M1725–M1729 → Task 1
- M1730–M1734 → Task 2
- M1735–M1739 → Task 3
- M1740–M1744 → Task 4
- M1745–M1749 → Task 5

## Execution Rule

Each task must follow RED → GREEN → cumulative verification. A milestone is not complete because code exists; its contract, regression, security/authorization review, and release reconciliation must pass.
