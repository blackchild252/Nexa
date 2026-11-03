# NEXA Dual-App AI Fine-Tuning Design

**Date:** 2026-10-06
**Scope:** NEXA consumer app + NEXA Admin web app
**Status:** Approved in conversation; specification ready for owner review

## Goal

Create a controlled NEXA-specific AI training architecture for both the consumer Dami experience and the Admin operational AI, improving NEXA-specific behavior without putting live business truth, authorization, or private user records into model weights.

## Success Criteria

1. Consumer Dami produces NEXA-consistent terminology, intent handling, tone, workflow guidance, and structured outputs.
2. Admin AI understands NEXA operational workflows including approvals, Staff work, disputes, violations, moderation, payments, verification, and audit investigation.
3. Consumer and Admin behavior are trained/evaluated separately while sharing common NEXA foundations.
4. Live data remains retrieved from authoritative server tools/data sources rather than being memorized in model weights.
5. Server-side authorization remains authoritative; model output can never elevate a user's or Staff member's capabilities.
6. Training/evaluation datasets exclude or sanitize unnecessary PII and secrets.
7. Every promoted AI configuration has a version, evaluation record, rollback target, and observable runtime behavior.
8. Existing Dami action confirmation, replay safety, receipt, workflow, and provider-policy boundaries remain intact.

## Architecture

NEXA will use two specialized AI behavior profiles over the existing provider gateway:

- **Consumer Dami profile:** optimized for end-user assistance, NEXA terminology, discovery, navigation, explanations, personalization, and safe action orchestration.
- **Admin Operations profile:** optimized for internal operational reasoning, evidence summarization, queue triage, Staff workload recommendations, policy application, and decision support.

Both profiles use the existing AI provider gateway and orchestration layers. Neither profile becomes an authorization authority. Tool calls continue to pass through server-side ownership, capability, state, consent, amount, and concurrency validation.

### Knowledge vs. training

Fine-tuning is reserved for stable behavioral patterns and output formats. Current or private information belongs in controlled retrieval/tools. NEXA policies and operational documentation should be versioned as retrievable knowledge where practical. User/account/payment/order/Staff records must remain live server data.

### Training data boundary

Training examples will be curated from synthetic, approved, anonymized, or otherwise authorized examples. Raw private conversations, credentials, payment secrets, access tokens, exact financial identifiers, and unnecessary personal data are excluded. Examples must carry provenance and dataset version metadata.

### Evaluation boundary

A fixed evaluation suite will test both profiles before promotion. Evaluation covers correctness, policy adherence, hallucination resistance, structured-output validity, refusal boundaries, tool-selection correctness, authorization boundaries, and regression against existing Dami behavior.

## Consumer Dami Profile

The consumer profile will learn:

- NEXA product vocabulary and module relationships.
- Aami and SkyMoney terminology and reward explanations.
- Yaayz, Chase, marketplace, vendor, social, learning, entertainment, and identity concepts.
- NEXA navigation and help patterns.
- Consistent response tone and readable language.
- Safe handling of consequential actions.
- Structured intent classification and tool-selection patterns already represented by the Dami orchestrator.

It will not learn:

- User passwords or secrets.
- Provider credentials.
- Mutable account balances as facts in model weights.
- Current order/payment state as permanent knowledge.
- Private user data that is not required for a training example.

## Admin Operations Profile

The Admin profile will learn:

- Approval Center workflows.
- Staff capability and assignment rules.
- Dispute examination and recommendation workflows.
- Violation investigation and enforcement boundaries.
- Marketplace and Yaayz moderation workflows.
- Subscription and payment-review workflows while preserving provider settlement truth.
- Verification workflows.
- Audit interpretation and evidence summarization.
- Owner-vs-Staff authority boundaries.

The Admin profile may recommend actions, summarize evidence, classify work, and propose assignments. Destructive or high-impact operations remain behind existing Admin server authorization and explicit confirmation boundaries.

Staff AI access will be capability-scoped. The model receives only the operational context permitted to that Staff identity and cannot use a generated recommendation to obtain broader access.

## Model and Provider Strategy

The implementation will preserve the existing provider gateway instead of hard-coding one model into application screens. The gateway remains responsible for provider selection and policy. A model/profile registry will identify the active Consumer and Admin AI configurations and their versions.

The first implementation should support a fine-tuned model reference where the configured provider supports it and a safe fallback to the existing base-model path. No provider-specific dependency should be introduced unless the existing gateway requires it.

## Data Flow

Consumer:

`NEXA UI -> Dami orchestration -> AI profile -> controlled tools/retrieval -> server authorization -> result -> receipt/confirmation where required`

Admin:

`Admin UI -> Admin AI orchestration -> Admin profile -> scoped operational context/tools -> server capability checks -> recommendation/result -> Admin decision/confirmation -> audit`

## Safety and Security

- Server authorization is mandatory for every protected action.
- AI-generated IDs, amounts, states, ownership claims, and capability claims are untrusted input.
- Tool arguments are validated server-side.
- Admin AI cannot directly mutate protected resources without the existing Admin action boundary.
- Staff AI cannot bypass Staff capability/resource assignment checks.
- Training exports must strip secrets and unnecessary PII.
- Dataset provenance and approval status must be recorded.
- Model/profile promotion requires evaluation evidence.
- Runtime telemetry must avoid storing sensitive prompts or outputs unnecessarily.

## Testing

### Consumer tests

- NEXA terminology and intent classification.
- Existing Dami workflow regression.
- Consequential-action confirmation.
- Replay/idempotency boundaries.
- Tool-selection and malformed-tool-argument rejection.
- Unknown/current-data questions route to retrieval instead of hallucinated memory.

### Admin tests

- Approval classification.
- Staff capability scoping.
- Batch-work recommendations.
- Dispute/violation evidence summarization.
- Admin-only enforcement boundary.
- Staff cannot escalate authority through AI.
- Destructive action confirmation.
- Audit metadata preservation.

### Shared tests

- Provider/profile selection.
- Evaluation dataset versioning.
- Model rollback.
- Prompt/model version observability.
- PII/secrets exclusion checks.
- Deterministic structured-output validation.

## Rollout

1. Build dataset and evaluation infrastructure without changing production model behavior.
2. Add Consumer and Admin profile registry and observability.
3. Add evaluation-only candidate model path.
4. Run both profiles against the fixed evaluation suite.
5. Promote only if evaluation thresholds and safety contracts pass.
6. Keep previous configuration as rollback target.
7. Record the promoted model/profile versions in release documentation.

## Explicit Non-Goals

- Replacing the existing Dami architecture.
- Training on the complete NEXA database.
- Giving AI independent authority.
- Replacing server-side authorization with model instructions.
- Automatically fine-tuning on every user conversation.
- Making device, EAS, store, or external-provider changes as part of this architecture work.
