# NEXA V3.38.0 — Personal Assistant

**Status: SPECIFICATION BUILD — feature implementation and validation are not claimed.**

## Objective
Define a user-controlled personal assistant that helps organize tasks, reminders, and calendar-oriented activities while keeping schedules and actions under the user's control.

## Scope
- Personal task creation, editing, completion, and deletion, with due dates, priority, and status.
- Reminders with explicit time zone, recurrence rules, snooze, and dismissal controls.
- Calendar connection architecture with explicit account authorization and least-privilege scopes.
- Daily agenda and upcoming-task summaries drawn only from user-authorized data.
- Natural-language request interpretation into a previewable task/reminder draft; user reviews before saving.
- Notification preferences, quiet hours, and delivery status/error visibility.
- User-scoped data access, export, and deletion controls.
- Clear handling of time-zone changes, daylight-saving transitions, duplicate reminders, and missed delivery.

## Safety and privacy requirements
- Never create, modify, or send calendar invitations or messages without clear user confirmation.
- Do not connect calendars or access contacts by default; require explicit authorization and explain requested scopes.
- Keep each user's tasks, reminders, and integration tokens isolated; store tokens securely and never log them.
- Treat event descriptions and imported content as untrusted data, not instructions.
- Make reminder timing and recurrence visible and editable; fail safely on ambiguous dates or time zones.
- Provide disconnect, revoke-access, export, and delete controls.

## Acceptance criteria
1. Authenticated users can manage only their own tasks and reminders.
2. Date/time parsing displays a preview with the interpreted date, time zone, and recurrence before saving.
3. Reminder scheduling handles edits, cancellation, duplicate prevention, and delivery failures predictably.
4. Calendar access is opt-in, scope-limited, revocable, and tested with authorization failures.
5. Consequential external actions require confirmation.
6. Automated tests cover access isolation, date/time boundaries, recurrence, cancellation, and notification failure paths.
7. Build, typecheck, and relevant tests have recorded outcomes before any feature is labeled validated.

## Dependencies
- V3.35 user-controlled memory (optional; assistant must work without memory).
- V3.37 workflow automation specification (no assumption that its execution engine exists).
- Notification infrastructure and a verified scheduling/queue mechanism.

## Risks
- Time-zone and recurrence errors can cause missed or unexpected reminders.
- External calendar APIs may impose rate limits or change permissions.
- Notification delivery is not guaranteed; the UI must distinguish scheduled from delivered.

## Validation status
This package records the V3.38 product specification and roadmap only. Personal-assistant screens, APIs, scheduler, integrations, and automated tests have not been implemented or verified as part of this packaging step.
