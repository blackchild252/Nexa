# Dami Knowledge, Workflow Approval and Action Confirmation

## Consumer Knowledge Hub

- `GET /api/ai/knowledge` lists the authenticated user's own active knowledge documents.
- `POST /api/ai/knowledge` accepts `{ title, content, type? }`, with `type` restricted to `text/plain`, `text/markdown`, or `application/json` and content limited to 50,000 characters.
- `GET /api/ai/knowledge/search?q=...` returns bounded ranked results with document/chunk citations and provenance.
- `GET /api/ai/knowledge/:id/chunks` returns deterministic chunk references for an owner-owned document.
- `PATCH /api/ai/knowledge/:id` validates and updates an owner-owned source; `DELETE /api/ai/knowledge/:id` removes it from future retrieval.
- Retrieved content is untrusted user data. It never grants permission, authorizes actions, or overrides policy/current instructions. Dami only injects retrieved knowledge when the user-controlled memory setting is enabled.

## Consumer workflows

- New workflows start as `draft`.
- Valid lifecycle: `draft → awaiting_approval → approved → active`; a draft can be cancelled. Active workflows can be archived or cancelled. `archived` and `cancelled` are terminal. Direct `draft → approved` and `draft → active` transitions are rejected.
- Only `draft` workflows can be edited. Submitted, approved and active definitions are immutable. Updates compare the prior status and return a conflict if another update won the race.
- Execution is available only for `approved` or `active` workflows. It remains limited to the local `create_task` and `save_note` action allowlist; external/privileged action types are rejected.
- `GET /api/ai/workflows/:id/next` exposes `approvalRequired` and a per-step `requiredActionConfirmations` list.
- `POST /api/ai/workflows/:id/run` requires all of the following: an approved/active workflow, `confirmed: true`, `confirmedActions` containing every zero-based step index exactly once, and a valid idempotency key in the header or body. Example body: `{ "confirmed": true, "confirmedActions": [0, 1], "idempotencyKey": "workflow-run-key-001" }` for a two-step workflow.
- Run side effects, idempotency records and durable receipts are transactionally stored. Audit metadata records action-confirmation counts without storing raw action content or raw idempotency keys.
- `GET /api/ai/workflows/:id/runs` and `GET /api/ai/workflows/:id/audit` are authenticated and owner-scoped.
- No external action execution, external connector activation, production deployment or store release is implied by these APIs.
