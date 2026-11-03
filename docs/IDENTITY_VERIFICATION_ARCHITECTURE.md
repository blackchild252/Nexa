# Identity Verification Architecture — Main-owned (Block 09)

## Authority and scope

NEXA Main owns identity-verification cases, policy version, case state, reviews, rejection reasons, appeals, expiry/renewal, audit lineage and deletion requests. The existing `/verification` verified-profile/shop-mark flow is a separate feature. Admin receives a sanitized read-only mirror and cannot decide cases or receive evidence bytes.

## Supported document identifiers

`passport`, `national_identity_card`, `drivers_license`, `residence_permit`, `voter_card`. The country-rule reference covers the country/territory directory, but each rule is explicitly marked `manual_policy_review_required`, has no automatic approval and asserts no legal or commercial eligibility. Document support is a technical identifier list, not legal advice.

## Main routes

- `GET /api/identity-verification/policy` — authenticated document and country policy reference.
- `GET /api/identity-verification/readiness` — authenticated readiness diagnostics.
- `POST /api/identity-verification/cases` — authenticated case metadata creation; body `{ countryCode, documentType }`.
- `GET /api/identity-verification/cases/mine` — current member's sanitized cases; applies expiry transitions.
- `POST /api/identity-verification/cases/:id/evidence` — intentionally returns `503 SECURE_STORAGE_NOT_CONFIGURED`; never accepts evidence bytes.
- `POST /api/identity-verification/cases/:id/resubmit` — moves rejected cases back to `awaiting_evidence`; does not bypass evidence intake.
- `POST /api/identity-verification/cases/:id/appeal` — reason-required appeal for rejected cases.
- `POST /api/identity-verification/cases/:id/renew` — expiry-aware renewal request.
- `DELETE /api/identity-verification/cases/:id` — member-owned metadata tombstone; any evidence deletion requires storage-adapter confirmation.
- `GET /api/admin/identity-verification` — permission-gated Admin case list; `status=deleted` can inspect sanitized deletion tombstones.
- `GET /api/admin/identity-verification/policy` and `GET /api/admin/identity-verification/readiness` — permission-gated Admin policy/readiness display routes.
- `POST /api/admin/identity-verification/:id/decision` — Main-only review authority; rejects self-review, invalid transitions and cases without a secure evidence reference.
- `GET /api/admin/identity-verification/:id/audit` — permission-gated case event lineage, including deletion history for tombstoned cases.
- `POST /api/identity-verification/provider-webhook` — intentionally fail-closed with `503 PROVIDER_NOT_CONFIGURED` until server-side signature verification is enabled.

## Privacy and storage invariants

- No document image, document number, base64 payload or evidence bytes are accepted by these endpoints or stored in SQLite.
- Cases store only metadata and an optional opaque evidence reference. Admin responses never contain evidence bytes.
- Provider outcomes normalize to non-authoritative states and never auto-approve identity.
- Readiness declares a 365-day terminal metadata retention policy. Evidence retention/deletion must be executed and confirmed by the private storage adapter; no false deletion success is reported.
- Country-directory membership does not establish legal eligibility.

## Verification evidence

Focused contract tests exercise country policy, document-type identifiers, provider-result normalization, metadata-only cases, fail-closed evidence/provider endpoints and route registration. Live storage/provider acceptance and device/browser acceptance were not run.
