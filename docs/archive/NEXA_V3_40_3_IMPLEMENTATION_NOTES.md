# NEXA V3.40.3 — AI Hub UI integration

## Added
- Replaced the informational-only AI Hub page with navigable Assistant, Tasks, Calendar, Knowledge, and Workflows sections.
- Tasks: create and mark complete.
- Calendar: create/list/delete NEXA-local events.
- Knowledge: save, list, keyword-search, and delete user-entered text documents.
- Workflows: create a simple task workflow, list it, and show a confirmation prompt before execution.
- Uses existing authenticated `/api/ai/*` endpoints and surfaces request errors in the screen.

## Explicit limitations
- No Google/Apple/Microsoft calendar sync, external OAuth, document file import, semantic/vector search, or arbitrary workflow actions.
- Workflow UI currently creates a single `create_task` step. Backend supports the existing safe task/note actions.
- Full Expo typecheck, device testing, and live API integration were not run in this build environment.
