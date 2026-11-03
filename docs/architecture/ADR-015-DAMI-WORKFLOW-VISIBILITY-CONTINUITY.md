# ADR-015 — Dami Workflow Visibility Continuity

## Status
Accepted — V4.95.0 / Batch B30

## Decision
Dami settings may expose authenticated, user-owned workflow summaries and workflow history using the existing server operations endpoints. The surface is read-only. Workflow execution, replay, confirmation, and authorization remain owned by their existing server authorities.

## Rationale
NEXA already had workflow persistence, dependency graphs, confirmation continuity, and replay-safety services. B30 connects those existing authorities to a small user-facing visibility surface instead of creating duplicate workflow state or execution logic.

## Security
- Client requests use the existing authenticated API wrapper.
- Server workflow queries remain scoped to `req.user.id`.
- No workflow payload is copied into the new UI state beyond the existing response contract.
- No replay or execution control is exposed by this feature.

## Consequence
Users can inspect saved workflow progress and dependency/confirmation continuity from Dami settings while authorization remains centralized and auditable.
