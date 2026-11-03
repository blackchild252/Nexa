# NEXA V3.30 — Release Candidate Feature Specification

## Purpose
Establish a release-candidate checkpoint for the NEXA master project, carrying forward V3.29 production-hardening implementation and prior feature milestones while making outstanding release validation explicit.

## Included scope
- Existing application modules and AI features from V3.24–V3.28.
- V3.29 baseline server hardening: security response headers, request IDs, liveness/readiness endpoints, environment-configurable CORS, graceful shutdown, and centralized error handling.
- Release checklist, validation status, and explicit release gates.

## Acceptance and release gates
All items below are **NOT RUN** unless explicitly marked otherwise in a future test-cycle record.

- [ ] Install/build checks for supported targets.
- [ ] TypeScript and static checks.
- [ ] Regression coverage for authentication, profile, money, marketplace, groups, social/chat, staff, notifications, AI tools/actions, and realtime voice.
- [ ] Confirm consequential AI actions require explicit user confirmation.
- [ ] Verify secrets are server-side and absent from client bundles/logs.
- [ ] Verify CORS allowlist and security headers in production configuration.
- [ ] Verify health/readiness behavior and graceful shutdown under representative conditions.
- [ ] Dependency and vulnerability review.
- [ ] Performance/load checks and resource-use review.
- [ ] Deployment, migration, backup/restore, monitoring, and rollback rehearsal.
- [ ] Product owner sign-off.

## Release status
**Release candidate preparation only. Not production-approved.** No claim is made that the checklist has been executed. Any defects found during the authorized test cycle should be corrected in this same master project.
