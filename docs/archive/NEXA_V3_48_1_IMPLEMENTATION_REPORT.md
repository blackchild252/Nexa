# NEXA V3.48.1 — Marketplace Buyer/Seller Interactions

Implemented server-side favorites, product inquiries and message threads, seller inquiry status controls, and private moderation reports. Added client API helpers. Inquiry reads/writes enforce participant checks; interaction creation and messaging check bilateral blocks; inquiry request keys prevent duplicate initial submissions.

## Validation
- `node --check` for interaction module, server entry point, and database module: passed
- Existing server test suite: 15 passed, 0 failed (these are general tests, not dedicated interaction-route tests).
- Database runtime initialization: not verified because `better-sqlite3` is not installed in this workspace.
- UI integration/device tests: not run

## Known limitations
- Inquiry messaging is an API layer; no dedicated inquiry inbox/chat UI was added.
- Report review/moderation dashboard and retention automation are not included.
- Rate limiting for inquiry/report endpoints is not separately wired in this milestone.
