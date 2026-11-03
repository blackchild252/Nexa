# NEXA Admin & Staff Operations Ecosystem Design

**Goal:** Make the Admin app the single operational control center for NEXA while moving the existing consumer/vendor Staff surface into a controlled Admin Staff workforce system, sharing NEXA's visual language without consumer subscription gating.

## Scope

1. Admin web adopts NEXA's existing visual system: `src/theme.ts` tokens, typography, spacing, Royal Dark treatment, component patterns and navigation language. Admin uses no consumer subscription entitlement.
2. The existing consumer `/staff` block is removed from normal NEXA navigation and its vendor-staff purpose is preserved only where required for vendor operations; the NEXA Staff destination becomes an Admin-only workforce concept.
3. Admin can create/deactivate staff identities, assign task-scoped work, revoke assignments, reclaim work and review staff activity.
4. Staff authenticate through a secondary operational login and see only their assigned work queue and explicitly granted task capabilities.
5. Staff are never equivalent to Admin: server-side authorization enforces assignment, capability, resource ownership and action boundaries; UI hiding is not the security boundary.
6. Admin remains the final authority for subscriptions, payment exceptions, user/vendor verification, buyer/seller disputes, violations, platform removals and other approval-bearing operations already centralized in Admin.
7. Staff can examine assigned disputes/violations/approvals and submit recommendations where permitted. Sensitive final decisions remain Admin-only unless the Admin explicitly delegates a decision capability that the action policy allows.
8. Vendor product uploads do not require manual Admin approval. Product creation/gallery upload uses AI moderation; failed/unavailable moderation fails closed. Admin retains post-publication moderation/takedown authority.
9. All assignments, submissions, approvals, rejections, removals, revocations and staff access changes are auditable.
10. Admin has direct navigation between Admin and NEXA app surfaces; no duplicate business authority or duplicate data store is introduced.
11. Admin has no decorative animation. Only functional loading/feedback transitions are retained, with reduced-motion support.

## Workforce model

### Owner Admin

Full Admin authority. Can perform any permitted Admin operation, create/deactivate staff, assign/reassign work, approve/reject delegated recommendations, resolve disputes, examine violations, remove users/vendors where authorized, and retain direct access to every queue.

### Admin Staff

A separate operational identity/session associated with a NEXA account. Staff cannot create staff, elevate themselves, change their own capabilities, permanently remove users/vendors, alter provider payment truth, override Admin decisions, or access unassigned operational records unless the assigned capability explicitly permits it.

### Work assignment

Every delegated work item has: `workId`, `kind`, `resourceId`, `assignedTo`, `assignedBy`, `status`, `capability`, `priority`, timestamps, notes/evidence, and an audit trail. Work states are `unassigned`, `assigned`, `in_progress`, `submitted`, `reclaimed`, `resolved`, or `cancelled` as appropriate to the existing domain workflow.

Admin can batch-select eligible queue items and assign them to a staff member. Staff see `My Work`; Admin sees `My Approvals`, `Staff Work`, `Unassigned`, `Awaiting Admin`, and all existing operational queues.

## Capability boundaries

Initial staff capabilities are task-scoped, not role-soup:

- `subscription_review`
- `payment_review`
- `verification_review`
- `buyer_dispute_review`
- `seller_dispute_review`
- `user_violation_review`
- `vendor_violation_review`
- `yaayz_moderation`
- `fitness_review`
- `kitchen_review`
- `report_investigation`
- `support_investigation`

Each capability maps to an allow-list of read/write actions. Final high-impact enforcement actions remain Admin-only unless the server policy explicitly allows delegation.

## Authentication and authorization

The existing NEXA identity system remains the source of identity. Staff operational access is a distinct session/capability context and is not inferred from a consumer subscription. Server middleware/route guards must require an active staff assignment for staff routes and must check the requested `workId`, capability and resource before mutation.

Admin routes continue to require Admin authority. Staff credentials cannot call Admin-only routes by changing client navigation or request payloads.

## Disputes and violations

Buyer/seller disputes use the canonical lifecycle:

`open -> assigned -> examination -> recommendation -> admin_decision -> closed`

Violations use:

`reported -> assigned -> examination -> recommendation -> admin_decision -> enforcement -> audit`

Staff may gather evidence, communicate within the existing dispute model where permitted, and submit recommendations. Admin owns the final decision and enforcement for high-impact actions.

## Platform removal

Admin-only operations may permanently remove users or vendors using existing account/vendor closure integrity. Staff receive no capability for destructive platform removal. Removal actions require explicit Admin authority, confirmation, audit records, and preservation of required financial/transaction evidence.

## Product upload moderation

Vendor product creation and gallery uploads remain self-service. AI moderation is the publication gate. There is no Admin approval queue for ordinary product creation. Admin can later inspect, flag, suspend or take down published products through existing moderation authority.

## UI/navigation

Admin uses the same NEXA design tokens and component vocabulary while presenting a denser operations layout. Primary Admin navigation:

- Overview
- Approval Center
- My Approvals
- Staff Work
- Staff
- Disputes
- Violations
- Payments
- Subscriptions
- Verification
- Moderation
- Reports
- Audit
- Settings/Administration

Staff navigation is deliberately smaller:

- My Work
- Assigned area(s)
- Evidence/Notes
- Notifications
- Profile/Access

No consumer subscription lock is applied to Admin or Staff operational access.

## Testing requirements

- Server contract tests for staff identity, capability boundaries, assignment/reassignment/revocation, Admin-only actions and audit records.
- Cross-app contract tests proving Admin and NEXA use the same canonical resources and navigation links.
- Regression tests proving existing vendor staff functionality is not accidentally converted into Admin staff behavior.
- Product upload tests proving AI moderation remains the only ordinary publication gate.
- Admin web tests for workforce queues, batch assignment, staff restrictions, navigation and theme parity.
- Release identity, Devil's Walk, release ship and archive verification.
- Real browser/device/provider testing is only claimed when actually run.
