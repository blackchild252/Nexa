# B490 Release Report — NEXA Main App

## Implemented
- M7120: added a cross-surface regression contract for identity-verification readiness, privacy, country-policy caution, storage/provider configuration, retention state, and fail-closed upload/webhook behavior.
- Preserved Main as the sole identity-verification authority. Admin readiness remains read-only and does not receive evidence bytes.

## Validation
- Focused identity-verification contract suite: 11/11 passed.
- Baseline Main release identity was V6.1.43 B489; release bump tooling prepared this candidate before source edits.
- `npm run verify:contract`: 930/930 passed. `npm run test:server` exceeded the 120-second execution limit and is NOT TESTED (final result unknown). Devil’s Walk and the product release gate are run before sealing.

## Not tested / blocked
- Secure private object storage, malware scanning, provider-side deletion, live verification provider, signed webhooks/replay protection, legal-policy review, browser/device acceptance, dependency-backed typecheck and production shared-server integration.
- Uploads and provider webhooks remain disabled; readiness remains blocked.
