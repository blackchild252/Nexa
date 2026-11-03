# ADR-014 — Dami Consequential-Action Receipt Continuity

## Status
Accepted — V4.94.0 / Batch B29

## Decision
Dami consequential actions continue to require the existing short-lived, server-owned confirmation authority in `ai_action_confirmations`. After a confirmed action succeeds, NEXA records a separate user-scoped receipt in `ai_action_receipts`.

Receipt history is observational only: it cannot authorize, replay, or mutate an action. The history endpoint returns only the minimum audit fields needed by the authenticated user and intentionally excludes the original action payload.

## Rationale
Users need continuity after a consequential action is confirmed, while the authorization record should remain separate from long-lived history. Keeping these concerns in separate stores prevents historical records from becoming an accidental execution authority.

## Consequences
- Successful confirmed actions are auditable in-app.
- Existing confirmation expiry and ownership rules remain unchanged.
- Dami can show recent action history without retaining sensitive action payloads in the history response.
- Failed or unauthorized actions do not receive a completed receipt.
