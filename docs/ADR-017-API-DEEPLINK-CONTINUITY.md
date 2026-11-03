# ADR-017 — API and deep-link continuity hardening

## Decision
NEXA client modules use `authedFetch()` as the parsed response boundary. Module wrappers must not parse those results a second time. Deep links and notification actions preserve feature-specific identifiers so a destination can be opened safely after the app is already mounted.

## Compatibility
Legacy notification payload shapes and legacy product/API identifiers remain readable where required. New active navigation uses the canonical destination contracts.

## Safety
No new action authority is introduced by deep linking. Destination modules continue to enforce their own authenticated permissions.
