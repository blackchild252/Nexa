# NEXA Main identity-evidence document policy

**Authority:** NEXA Main only. This document defines accepted document-type identifiers, not legal eligibility or a promise that uploads are enabled.

## Accepted identifiers

- `passport`
- `national_identity_card`
- `drivers_license`
- `residence_permit`
- `voter_card`

The API normalizes identifiers to lowercase and rejects unsupported values. Country rules are reference-only until a policy owner confirms applicable requirements. No country is automatically approved and no document type is mandatory by default.

## Evidence handling boundary

- Case records contain metadata and an optional opaque evidence reference only.
- Document bytes, images, document numbers, base64 payloads, and file blobs must not be stored in SQLite or returned to Admin.
- Evidence upload remains disabled and returns `503 SECURE_STORAGE_NOT_CONFIGURED` until a private object-storage adapter is implemented and verified.
- A future adapter must enforce authenticated upload, size/type inspection, malware scanning, private access, short-lived access grants, retention/deletion confirmation, and audit events before it can be enabled.
- Provider results are non-authoritative; a positive response still requires human review.

## Status

The supported identifier list and fail-closed storage boundary are implemented locally and covered by contract tests. Secure object storage, real uploads, legal review, browser/device acceptance, and live provider integrations are **NOT CONFIGURED / NOT TESTED**.
