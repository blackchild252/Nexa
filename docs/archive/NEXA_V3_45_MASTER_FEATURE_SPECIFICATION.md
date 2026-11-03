# NEXA V3.45 — Messaging Reliability and Controls

**Status:** PLANNED / SPECIFICATION ONLY.

## Scope
- Delivery lifecycle states: queued, sent, delivered, read, failed, and retrying where supported.
- User controls: edit/delete policy, mute conversation, archive, block, and report.
- Resilient message submission with client-generated idempotency keys and bounded retries.
- Offline queue behavior and clear sync/error indicators.
- Pagination and stable ordering for conversation history.
- Privacy: verify conversation membership on every read/write; prevent cross-user access; avoid exposing message content in logs.
- Accessibility and localization for status labels and controls.

## Acceptance criteria (to be verified)
1. A non-participant cannot fetch, send, modify, or delete messages in a conversation.
2. Retrying a submission with the same idempotency key does not create duplicate messages.
3. Failed sends expose a recoverable error and do not silently disappear.
4. Delivery/read indicators are shown only when the backend provides authoritative state.
5. Mute, archive, block, and report actions persist and are scoped to the acting user.
6. Automated tests cover authorization, retry/idempotency, state transitions, pagination, and controls.
7. Device-level offline/online behavior is exercised before release.

## Dependencies and risks
- Depends on the messaging foundation and authenticated user identity.
- Read receipts and delivery confirmations require backend support and privacy settings.
- Push notifications must not leak message content by default.

## Implementation status
No feature implementation or test execution is asserted by this specification.
