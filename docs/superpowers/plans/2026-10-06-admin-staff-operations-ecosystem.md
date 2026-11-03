# Admin & Staff Operations Ecosystem Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Admin the operational control center and turn Staff into a strictly capability-scoped delegated workforce while preserving canonical NEXA business authority.

**Architecture:** Extend the existing Admin web and server authorization model with a first-class staff-work assignment layer. Reuse canonical NEXA resources and audit trails; staff sessions carry explicit capabilities and work assignments, while high-impact enforcement remains Admin-only.

**Tech Stack:** React/TypeScript Admin web, existing NEXA React Native app, Node/Express server, better-sqlite3, existing theme and authorization/audit utilities.

**Spec:** `docs/superpowers/specs/2026-10-06-admin-staff-operations-ecosystem-design.md`

## Global Constraints

- NEVER ASSUME. VERIFY actual files, routes, schemas, tests and current behavior before changing them.
- `V5.99.93 B339` is the active release; do not bump again before implementation is complete.
- Do not hand-edit version, Batch, build code or archive name.
- Admin and NEXA use the same canonical backend/database authority.
- Staff authorization is server-side; UI hiding is not the security boundary.
- No decorative Admin animation; functional loading/feedback only.
- Vendor product upload remains self-service with AI moderation as the ordinary publication gate.

## Review Focus

- Forged staff requests for another staff member's work → mutation must fail server-side.
- Capability escalation or altered client capability → authorization must ignore client elevation.
- Staff attempting Admin-only destructive enforcement → must fail and create no side effect.
- Reassignment/revocation races → only the current valid assignment may mutate work.
- Existing vendor-staff functionality → must remain distinct from Admin workforce staff.

### Task 1: Map existing Admin, staff and authorization boundaries

**Files:**
- Inspect: `admin-web/*`, `server/index.js`, `server/*staff*`, `server/*admin*`, `server/*auth*`, `server/*audit*`, `src/*staff*`, navigation files, relevant tests.
- Modify: none initially.
- Test: existing Admin/staff governance contracts.

**Interfaces:**
- Produces an exact route/schema/file map used by later tasks.

- [ ] Step 1: Run `npm run session:start` and inspect the current B339 identity.
- [ ] Step 2: Trace existing Staff routes, Admin routes, role predicates, audit records and navigation.
- [ ] Step 3: Run focused existing staff/Admin contract tests and record the current baseline.
- [ ] Step 4: Document any architecture corrections in `docs/architecture/ARCHITECTURE_DECISIONS.md` only after the actual authority is verified.

### Task 2: Add the staff work-assignment domain

**Files:**
- Modify: the verified canonical server schema/authorization module from Task 1.
- Create: focused staff-work service/module only if existing files do not have a safe home.
- Test: new staff assignment contract suite.

**Interfaces:**
- Produces work records containing `workId`, `kind`, `resourceId`, `assignedTo`, `assignedBy`, `status`, `capability`, `priority`, timestamps and audit linkage.

- [ ] Step 1: Write failing tests for create, assign, reassign, reclaim, submit and cancel transitions.
- [ ] Step 2: Write failing tests for stale/revoked assignment mutation rejection.
- [ ] Step 3: Implement the minimal schema/service using existing transaction and ID patterns.
- [ ] Step 4: Run the focused contract suite and require all new cases to pass.

### Task 3: Implement capability-scoped staff authorization

**Files:**
- Modify: verified server auth/authorization modules.
- Test: capability-boundary contracts.

**Interfaces:**
- Produces a server predicate/API equivalent to `authorizeStaffWork({ userId, workId, capability, resourceId, action })` using the actual project conventions.

- [ ] Step 1: Write failing tests for each initial capability and forbidden escalation.
- [ ] Step 2: Implement allow-listed action checks against the current assignment and resource.
- [ ] Step 3: Prove staff cannot create staff, self-elevate, remove users/vendors, alter provider payment truth or access unassigned records.
- [ ] Step 4: Run focused authorization tests.

### Task 4: Implement Admin staff management and batch assignment

**Files:**
- Modify: verified Admin routes/components and server endpoints.
- Test: Admin web workforce contracts.

**Interfaces:**
- Produces Admin operations for staff create/deactivate, batch assign, reassign, reclaim and review.

- [ ] Step 1: Write failing UI/server tests for batch assignment and staff lifecycle.
- [ ] Step 2: Implement the Admin workforce queue using existing list/pagination/loading patterns.
- [ ] Step 3: Add My Approvals, Staff Work, Unassigned and Awaiting Admin views without duplicating business authority.
- [ ] Step 4: Run Admin web contracts.

### Task 5: Implement Staff operational navigation and evidence/recommendation flow

**Files:**
- Modify: verified Staff destination/navigation and staff screens.
- Test: Staff UI contracts and server recommendation contracts.

**Interfaces:**
- Produces Staff `My Work`, assigned areas, evidence/notes, notifications and profile/access views.

- [ ] Step 1: Write failing tests proving only assigned/capable work is visible.
- [ ] Step 2: Implement evidence and recommendation submission.
- [ ] Step 3: Keep final high-impact decisions Admin-only.
- [ ] Step 4: Run Staff UI and server tests.

### Task 6: Move Staff from consumer navigation into Admin without breaking vendor staff

**Files:**
- Modify: verified NEXA navigation and vendor-staff routes.
- Test: regression coverage for vendor staff and Admin workforce staff.

- [ ] Step 1: Write failing regression tests for both distinct staff concepts.
- [ ] Step 2: Remove the Admin workforce Staff destination from ordinary consumer navigation.
- [ ] Step 3: Preserve vendor operational staff where its existing business function requires it.
- [ ] Step 4: Run regression tests.

### Task 7: Admin/NEXA theme and navigation parity

**Files:**
- Modify: `admin-web/style.css`, Admin markup/components and verified shared theme mapping.
- Test: Admin visual/interaction contracts.

- [ ] Step 1: Write failing checks for typography, spacing, Royal Dark tokens, button/input/card vocabulary and no decorative animation.
- [ ] Step 2: Implement parity using existing NEXA tokens/patterns rather than inventing new colors.
- [ ] Step 3: Run Admin web checks and Devil's Walk.

### Task 8: Cross-app governance, audit and final verification

**Files:**
- Modify: architecture/audit documentation and any failing integration code.
- Test: focused governance, full relevant server tests, Admin web suite, `npm run walk`, `npm run godhand`, `npm run godhand -- verify`.

- [ ] Step 1: Prove Admin and NEXA share canonical resources and links.
- [ ] Step 2: Prove every staff assignment, submission, revocation and Admin decision is auditable.
- [ ] Step 3: Run regression tests and fix failures.
- [ ] Step 4: Run `npm run walk`.
- [ ] Step 5: Run God Hand and report timeout/failure honestly if it occurs.
- [ ] Step 6: Run release ship only after all required checks are genuinely satisfied.

## Self-review

1. Spec coverage: all workforce, capability, authentication, dispute, violation, removal, product-upload, UI and testing requirements map to Tasks 2–8.
2. Step scan: each implementation step has one checkable outcome and points to verified project files before editing.
3. Type consistency: the assignment/capability interface is established in Task 2 and consumed by Tasks 3–5.
4. Review focus: each of the five likely failure modes has explicit tests in Tasks 2, 3 and 6.
5. Proportion: the plan remains shorter than the full design spec and avoids prescribing implementation bodies where existing project conventions must decide.
