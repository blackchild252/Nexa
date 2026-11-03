# NEXA V3.44 — Direct Messaging Foundations

**Status:** PLANNED / SPECIFICATION ONLY

## Goal
Define secure one-to-one messaging primitives that can later be connected to NEXA social profiles and connections.

## Scope
- Conversation records with explicit participants and stable identifiers.
- Message records with sender, conversation, timestamp, and delivery state.
- Authorization checks ensuring only conversation participants can read or send messages.
- Pagination and deterministic ordering for message history.
- User controls to block or report a participant and prevent prohibited new conversations.
- Basic message lifecycle: send, retrieve, and soft-delete where supported by policy.
- UI states for loading, empty conversations, errors, and offline/retry conditions.

## Privacy and security requirements
- Enforce participant authorization on every read/write endpoint; never trust client-supplied user IDs as proof of identity.
- Validate and limit message size and request rates.
- Avoid logging message bodies or sensitive tokens.
- Keep user data isolated and apply blocking consistently.
- Do not claim end-to-end encryption unless a reviewed cryptographic design is implemented.

## Acceptance criteria (not yet verified)
1. Non-participants cannot list, read, send to, or alter a conversation.
2. A sender can create a message and authorized participants can retrieve it in stable order.
3. Pagination has no duplicate or skipped items under the documented cursor scheme.
4. Blocked users cannot initiate new conversations or send messages where blocking policy applies.
5. Invalid payloads, oversized messages, and rate-limited requests are rejected safely.
6. Automated tests cover authorization, conversation creation, message lifecycle, blocking, pagination, and malformed input.
7. UI surfaces loading, empty, success, and failure states without exposing another user's data.

## Dependencies
- Authentication and user identity middleware.
- V3.43 profile/connection model and block controls.
- Persistent database migrations and API test harness.

## Out of scope
Group chat, attachments, read receipts, typing indicators, push delivery, message search, and end-to-end encryption; these require separate design and validation.

## Validation record
No implementation, test run, typecheck, or device validation is claimed in this planning build.
