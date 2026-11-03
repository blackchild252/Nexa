# Chase Showcase & Aami Reward Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Chase into an interactive lifestyle/profile showcase with likes, visible counts, comments, Add Friend and server-authoritative 150-like Aami rewards.

**Architecture:** Reuse the existing Chase discovery/friend-request authority and extend the social layer with profile-showcase reactions/comments. Aami threshold awards are emitted by the server from cumulative unique-like totals using an idempotent reward ledger; demo profiles are isolated fixtures that cannot trigger real rewards.

**Tech Stack:** React Native/Expo, Node/Express, better-sqlite3, existing `friends.js`, `friends.ts`, `ZeezaChase.tsx`, `aamiEconomy.js`, theme/motion/accessibility primitives.

**Spec:** `docs/superpowers/specs/2026-10-06-chase-showcase-aami-design.md`

## Global Constraints

- `V5.99.93 B339` remains the active release.
- Preserve Chase privacy, blocking, friend-request and proximity limits.
- Server is authoritative for likes, counts, comments and Aami amounts.
- Aami remains 18+ and idempotent.
- No decorative animation is required.
- Demo data must not create real social notifications, friend requests or Aami credits.

## Review Focus

- Repeated likes/unlikes → one unique like per viewer/profile and no duplicate reward.
- 149 → 150 → 151 likes → exactly one 5-Aami threshold credit.
- Concurrent likes at a threshold → exactly one reward event.
- Deleted/blocked/closed profiles → no stale interaction or reward leakage.
- Demo profiles → visually realistic but financially/socially inert.

### Task 1: Extend Chase profile data for showcase media and interaction counts

**Files:**
- Modify: `server/friends.js`, `src/friends.ts`, verified profile/media source modules.
- Test: new Chase showcase contract suite.

- [ ] Step 1: Write failing tests for showcase fields, like count, comment count and demo marker.
- [ ] Step 2: Add the smallest canonical data representation compatible with existing profile media.
- [ ] Step 3: Return counts without exposing private data.
- [ ] Step 4: Run focused tests.

### Task 2: Implement profile likes and comments

**Files:**
- Modify: verified social server module and `src/ZeezaChase.tsx`/API client.
- Test: server behavior and UI contracts.

**Interfaces:**
- Produces endpoints equivalent to `POST /api/social/chase/:userId/like`, `GET /api/social/chase/:userId/comments`, `POST /api/social/chase/:userId/comments` using the project's established route conventions.

- [ ] Step 1: Write failing tests for unique toggle likes and visible counts.
- [ ] Step 2: Write failing tests for comment validation, ownership/removal and safety restrictions.
- [ ] Step 3: Implement server-side interaction storage and counts.
- [ ] Step 4: Implement Chase UI like/comment controls with accessibility labels and visible counts.
- [ ] Step 5: Run focused social tests.

### Task 3: Add the 150-like Aami threshold engine

**Files:**
- Modify: `server/aamiEconomy.js` and verified Chase like mutation module.
- Test: Aami threshold contract suite.

**Interfaces:**
- Produces a server-only reward operation equivalent to `awardChaseLikeMilestone(db, profileOwnerId, cumulativeUniqueLikes)`.

- [ ] Step 1: Write failing tests for 150/300/450 thresholds and below-threshold counts.
- [ ] Step 2: Write a concurrency/idempotency test for the same threshold.
- [ ] Step 3: Implement a `chase_profile_like_milestone` source with 5-Aami per threshold and no client-supplied amount.
- [ ] Step 4: Run focused Aami tests.

### Task 4: Build photo-first Chase showcase cards and demo profiles

**Files:**
- Modify: `src/ZeezaChase.tsx` and verified fixture/preview modules.
- Test: Chase UI/preview contracts.

- [ ] Step 1: Add demo profiles with representative lifestyle photo sets and realistic interaction counts.
- [ ] Step 2: Make demo state visibly identifiable and non-interactive financially/socially.
- [ ] Step 3: Implement photo-first layout with like count, comments and Add Friend.
- [ ] Step 4: Run preview/contract tests and adjust based on actual rendered structure.

### Task 5: Safety, notifications and regression reconciliation

**Files:**
- Modify: verified notification/block/closure integrations.
- Test: existing Chase, friend, privacy and closure suites plus new showcase suite.

- [ ] Step 1: Ensure blocked/closed users cannot interact with showcases.
- [ ] Step 2: Ensure comment/like notifications follow existing privacy rules.
- [ ] Step 3: Verify friend-request proximity limits remain unchanged.
- [ ] Step 4: Run relevant regressions and Devil's Walk.

## Self-review

1. Spec coverage: showcase data, likes, comments, Add Friend, demo profiles, threshold rewards, privacy and safety map to Tasks 1–5.
2. Step scan: each step has one checkable result.
3. Type consistency: ChaseUser is extended once in Task 1 and consumed by Tasks 2 and 4.
4. Review focus: all five threshold/privacy/demo failure modes have tests.
5. Proportion: the plan defines interfaces and tests without rewriting existing social architecture.
