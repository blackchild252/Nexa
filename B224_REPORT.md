# NEXA V5.98.76 B224 — Checkpoint 1: Hosted legal pages

## Why
Launch preflight lists `EXPO_PUBLIC_PRIVACY_POLICY_URL` and `EXPO_PUBLIC_TERMS_URL` as blockers, and nothing served the legal documents. The Docker image also never copied `docs/legal`.

## Changes
- New `server/v5_98_76_legal_pages.js`; routes `GET /privacy` and `GET /terms` in `server/index.js`.
- Production fail-closed: both pages return 503 until the contact is set (`NEXA_PRIVACY_CONTACT`, `NEXA_LEGAL_CONTACT`) and `NEXA_LEGAL_REVIEWED=1` is set after real legal review.
- Dockerfile now copies `docs/legal`.
- Version/build bumped to V5.98.76, Android versionCode 6042, iOS buildNumber 6043. B223 contract frozen as historical evidence; B224 contract registered in the release gate.

## Not changed
Legal text is still a draft. Hosting, the three EAS URLs, `npm ci`, typecheck, server suite and Playwright remain environment steps.
