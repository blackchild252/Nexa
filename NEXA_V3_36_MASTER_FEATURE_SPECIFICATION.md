# NEXA V3.36.0 — AI Planning

## Goal
Provide an authenticated, user-owned planning workspace for defining goals and organizing them into steps. Plans are editable drafts and do not trigger external or consequential actions.

## API
- `GET /api/ai/plans` — list up to 100 plans for the signed-in user.
- `POST /api/ai/plans` — create a plan with title, optional goal, up to 50 steps, and status.
- `PATCH /api/ai/plans/:id` — update title, goal, steps, or status.
- `DELETE /api/ai/plans/:id` — delete an owned plan.

## Data and validation
- Plans are scoped to authenticated user ID.
- Title: 1–160 characters; goal: up to 2,000 characters.
- At most 50 steps per plan; step title: 1–240 characters.
- Step statuses: `todo`, `in_progress`, `done`. Plan statuses: `draft`, `active`, `completed`, `archived`.
- At most 100 plans per user.

## Safety boundary
This milestone stores and organizes plans. It does not autonomously execute actions, send messages, make purchases, or alter account data. AI-generated plan drafting and mobile UI integration are not included.

## Validation
Syntax checks and existing server tests are run for this package; full app, authorization isolation, and mobile regression testing remain required before production use.
