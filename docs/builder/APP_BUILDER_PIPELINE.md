# NEXA App Builder Pipeline

```text
USER
  ↓
APP BUILDER CHAT
  ↓
┌──────────────┬──────────────┐
↓              ↓              ↓
PLANNER     PROJECT MEMORY   EXISTING ARCHITECTURE
└──────────────┴──────────────┘
  ↓
CODING AGENT
  ↓
GITHUB REPO
  ↓
┌────────────┬────────────┬────────────┐
↓            ↓            ↓
PLAYWRIGHT  SENTRY     CODE REVIEW
└────────────┴────────────┴────────────┘
  ↓
FIX / REFACTOR
  ↓
TEST AGAIN
  ↓
RELEASE GATE
  ↓
SEAL
```

## Planner contract
Before implementation, identify:
- requested behavior;
- affected modules/files;
- architecture constraints;
- existing tests to preserve;
- new regression tests required;
- destructive operations, if any, requiring approval;
- release/rollback implications.

## Coding-agent contract
Use the smallest safe patch. Preserve existing behavior. Add tests with the change. Do not silently delete or replace working code.

## QA contract
- **Server tests:** required for server behavior changes.
- **Playwright:** required for browser/mobile-web flows when configured.
- **Sentry:** inspect recent runtime errors when a Sentry connection is configured.
- **Code review:** required before seal.
- **Release audit/gate:** required before seal.

## Gate states
- `PASS`: evidence exists and the check succeeded.
- `FAIL`: evidence exists and the check failed.
- `BLOCKED`: the required environment/dependency is unavailable.
- `NOT_CONFIGURED`: the integration is intentionally not connected.

A BLOCKED or NOT_CONFIGURED check must never be described as a PASS.
