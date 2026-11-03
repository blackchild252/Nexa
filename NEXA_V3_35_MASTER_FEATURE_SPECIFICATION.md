# NEXA V3.35.0 — User-Controlled AI Memory

## Goal
Provide an explicitly opt-in, user-owned memory store with controls to inspect, edit, delete, and clear saved items.

## API foundation implemented
- `GET /api/ai/memory/settings` — return the user's setting (off by default).
- `PUT /api/ai/memory/settings` — set `enabled` and retention days (1–3650); disabling clears saved entries.
- `GET /api/ai/memory` — list up to 100 user-owned items, after expiry cleanup.
- `POST /api/ai/memory` — add a 1–1000 character item in a supported category.
- `PATCH /api/ai/memory/:id` — edit content/category for an owned item.
- `DELETE /api/ai/memory/:id` and `DELETE /api/ai/memory` — delete one or clear all owned items.

## Privacy and safety constraints
- Every endpoint requires an authenticated session and scopes data by authenticated user ID.
- Memory is off unless the user explicitly enables it.
- Turning memory off deletes stored entries.
- Retention is bounded; expired items are removed when the list endpoint is accessed.
- No automatic extraction or prompt injection is enabled in this milestone.

## Acceptance criteria
- Unauthenticated requests are rejected.
- A user cannot view, modify, or delete another user's memory.
- Disabled memory cannot accept new entries.
- Input limits, category validation, retention, and clear-all behavior are verified by automated tests.
- Mobile controls and AI retrieval are implemented and tested before memory is represented as fully integrated.

## Validation status
Implementation is partial (API foundation). Syntax checks only; functional and security tests not run.
