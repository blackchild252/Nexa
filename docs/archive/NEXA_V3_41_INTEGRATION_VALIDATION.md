# NEXA V3.41 — Integration and Validation

## Scope
This milestone is focused on verifying the existing AI Hub integration, identifying remaining integration gaps, and defining repeatable acceptance checks before production use.

## Existing functionality carried forward from V3.40.3
- Tasks: create and complete user tasks through existing AI Hub endpoints.
- Calendar: create, list, and delete NEXA-local calendar events.
- Knowledge: save, list, keyword-search, and delete user-entered text.
- Workflows: create a limited workflow and require confirmation before execution.

These features are present in the carried-forward source, but full end-to-end behavior has not been independently verified in this environment.

## Acceptance checklist

### Automated backend checks
- [ ] Install dependencies using the lockfile/package manager selected by the project.
- [ ] Run `npm run test:server` from the project root.
- [ ] Run `npm run typecheck`.
- [ ] Confirm all test results are recorded with environment and date.

### Authenticated API integration
- [ ] Unauthenticated requests to protected AI endpoints are rejected.
- [ ] User A cannot read, update, or delete User B's tasks, events, documents, or workflows.
- [ ] Create/list/complete task lifecycle works.
- [ ] Create/list/delete calendar-event lifecycle works.
- [ ] Save/search/delete knowledge-document lifecycle works.
- [ ] Workflow execution requires explicit confirmation and produces a traceable result.
- [ ] Invalid input and unsupported workflow steps are rejected safely.
- [ ] Server errors are surfaced as actionable UI messages without exposing secrets.

### App/device validation
- [ ] Launch the Expo app on Android and iOS.
- [ ] Sign in and open AI Hub.
- [ ] Exercise each Tasks, Calendar, Knowledge, and Workflows flow against a running server.
- [ ] Verify loading, empty, success, and error states.
- [ ] Verify behavior on network loss and expired authentication.

### Explicitly out of scope / not verified
- External Google, Apple, or Microsoft calendar sync and OAuth.
- File uploads/import pipeline and semantic/vector knowledge search.
- Broad arbitrary workflow actions or third-party side effects.
- Production load, security audit, and real-device acceptance unless checklist evidence is recorded.

## Release gate
Do not mark V3.41 production-ready until the automated, authenticated API, and device checks above have recorded results. A checklist is not evidence of a test passing.
