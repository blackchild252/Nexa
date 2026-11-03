# NEXA Main secure identity-evidence object-storage boundary

**Milestone:** M7117 — Prepare secure object-storage boundary.  
**Status:** contract prepared; adapter and real uploads remain NOT CONFIGURED / NOT TESTED.

## Authority and data boundary

- NEXA Main owns identity-verification case metadata. It must not store document bytes, photos, base64 payloads, document numbers, or raw file blobs in SQLite.
- The future private object-storage adapter owns evidence bytes. SQLite may store only an opaque provider-generated reference and lifecycle metadata.
- Admin AAMI may receive only authorized, sanitized case metadata. It must never receive evidence bytes or public storage URLs.
- No client-supplied path, bucket, object key, provider URL, or evidence reference may select an arbitrary storage object.

## Adapter enablement gate

Keep upload disabled and return `503 SECURE_STORAGE_NOT_CONFIGURED` until every gate is implemented and tested:

1. Authenticated upload and server-side case ownership/permission checks.
2. Strict byte-size limits and allowlisted content types verified against file signatures, not filename or request headers alone.
3. Malware/content scanning with fail-closed handling when scanning is unavailable.
4. Private bucket/container policy, encryption in transit and at rest, and least-privilege service credentials.
5. Opaque generated object keys; no public ACLs or permanent public URLs.
6. Short-lived, purpose-bound access grants issued only after authorization.
7. Auditable upload, access, retention, deletion and failed-scan events without logging document bytes, secrets or signed URLs.
8. Retention/deletion jobs that verify provider-side completion before reporting evidence as deleted.
9. Integration tests proving tenant isolation, unauthorized access denial, expired-grant denial and cleanup behavior.

## Current implementation status

The current API stores case metadata only, leaves `evidenceRef` empty, and fails closed on evidence upload. This document is an implementation boundary, not evidence that an object-storage provider, upload flow, malware scanner, retention worker or production secret configuration exists.
