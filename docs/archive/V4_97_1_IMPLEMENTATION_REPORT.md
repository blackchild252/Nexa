# NEXA V4.97.1 — B32.1 Implementation Report

## Chase Naming Migration

The Zeeza discovery feature is now canonically named **Chase** across the active application path.

### Changed
- Canonical Chase client API names and `ChaseUser` type.
- Canonical Chase navigation state and entrypoint.
- Canonical `ZeezaChase` component entrypoint.
- Canonical `/api/social/chase` discovery route.
- Canonical `/api/social/friends/request/chase/:userId` request route.
- New requests are stored with source `chase`.
- Safety limits count both old `explore` and new `chase` requests.

### Safety bridge
- Existing `/explore` routes remain available for older clients/deep links.
- Existing Explore imports remain available as compatibility aliases.
- Existing database column names remain unchanged so existing user data is not stranded.
- Existing stored `explore` request-source records remain readable.

## Verification
- Chase migration regression: **14/14 PASS**.
- Server syntax check: **PASS**.
- No destructive database rename performed.
