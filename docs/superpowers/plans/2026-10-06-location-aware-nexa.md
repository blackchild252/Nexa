# Location-Aware NEXA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish one privacy-safe location context for NEXA and use it to improve proximity-sensitive discovery without making location permission a hard requirement.

**Architecture:** Add a single device-location context/provider and a server normalization layer. Features consume coarse location relevance rather than each requesting GPS independently; when permission is denied or unavailable, NEXA falls back to explicit profile geography/manual selection and continues operating with reduced local relevance.

**Tech Stack:** Expo 54/React Native, existing navigation/settings/privacy patterns, Node/Express, better-sqlite3, existing Chase/friends and vendor/service modules.

**Spec:** `docs/superpowers/specs/2026-10-06-location-aware-nexa-design.md`

## Global Constraints

- `V5.99.93 B339` remains the active release.
- Do not silently request or repeatedly prompt for device location.
- Exact coordinates are not public profile data.
- Prefer coarse location representations over raw coordinates at rest.
- International availability remains; location affects relevance/ranking rather than country-locking NEXA.
- Permission denied must not break core NEXA usage.

## Review Focus

- Precise location granted → relevant nearby ranking without exposing coordinates.
- Approximate location granted → coarse matching only.
- Permission denied → no prompt loop and useful country/city fallback.
- Stale location → bounded fallback without presenting it as current.
- Cross-country users → international results remain available where appropriate.

### Task 1: Map existing geography and privacy surfaces

**Files:**
- Inspect: `src/*profile*`, settings/privacy screens, `server/friends.js`, vendor/marketplace/service modules, `server/db.js`, app config.
- Test: existing privacy and Chase contracts.

- [ ] Step 1: Trace current country/city fields and any existing device-permission abstractions.
- [ ] Step 2: Verify whether Expo location is already configured before adding dependencies.
- [ ] Step 3: Record the canonical storage and privacy boundary in `docs/architecture/ARCHITECTURE_DECISIONS.md`.

### Task 2: Add one location context/provider and permission state machine

**Files:**
- Create: focused location context/hook module if no existing location service exists.
- Modify: app root/provider configuration and verified settings entry point.
- Test: location state contract tests.

**Interfaces:**
- Produces a context equivalent to `locationState`, `requestLocationPermission()`, `refreshLocation()`, and privacy-safe coarse location metadata.

- [ ] Step 1: Write failing tests for precise, approximate, denied, unavailable and stale states.
- [ ] Step 2: Implement the provider using the installed Expo stack only if configuration supports it.
- [ ] Step 3: Add a clear user-facing rationale and settings control.
- [ ] Step 4: Run focused location tests.

### Task 3: Add server-side privacy-safe location normalization

**Files:**
- Modify: verified server location/profile module and `server/db.js` only where schema is required.
- Test: server location privacy contracts.

**Interfaces:**
- Produces a normalized location representation with consent state, accuracy class, coarse region and freshness timestamp; raw coordinates are not returned to other users.

- [ ] Step 1: Write failing tests for coordinate stripping, freshness and consent.
- [ ] Step 2: Implement normalization and storage using the project's transaction/schema conventions.
- [ ] Step 3: Reject stale/invalid location for features that require current proximity.
- [ ] Step 4: Run focused server tests.

### Task 4: Make proximity-sensitive experiences consume the shared context

**Files:**
- Modify: verified Chase, vendor/seller discovery, advertiser targeting and local-service modules.
- Test: feature-specific relevance contracts.

- [ ] Step 1: Write failing tests proving local results rank ahead of distant results when location is available.
- [ ] Step 2: Write fallback tests proving country/city/manual relevance when location is unavailable.
- [ ] Step 3: Integrate the shared location context without duplicating permission prompts.
- [ ] Step 4: Verify advertisers receive targeting eligibility, not raw device coordinates.

### Task 5: UX reconciliation, privacy controls and regression verification

**Files:**
- Modify: relevant settings/privacy copy and feature empty states.
- Test: location regression suite, privacy suite, `npm run walk` and applicable release checks.

- [ ] Step 1: Add explicit reduced-relevance messaging when location is unavailable.
- [ ] Step 2: Verify users can change/disable location-based personalization.
- [ ] Step 3: Run location/privacy/Chase regressions.
- [ ] Step 4: Run Devil's Walk and fix any drift.

## Self-review

1. Spec coverage: all five location states, privacy policy, shared provider, server normalization, ranking/fallback and settings controls map to Tasks 1–5.
2. Step scan: each step has one checkable result.
3. Type consistency: Task 2's location context is the sole client dependency used by Task 4.
4. Review focus: all five high-risk location conditions have tests.
5. Proportion: the plan avoids feature-specific GPS implementations and preserves existing architecture.
