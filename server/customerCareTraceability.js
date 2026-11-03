"use strict";

// Item-level source inventory for strategic Block 12. This is evidence status,
// not a declaration that the original strategic execution range is correctly fitted.
const ITEMS = Object.freeze([
  ["01", "Complete Help → Staff handoff", "implemented", "server/customerCare.js; server/index.js; server/customerCare.contract.test.js", "Help and Dami can create a persisted thread and expose its thread ID for Staff handoff."],
  ["02", "Complete live Staff chat", "implemented", "server/customerCare.js; src/app/help.tsx; server/customerCare.contract.test.js", "Authenticated message endpoints, persisted transcripts, unread state and client refresh are present; deployed/live acceptance is not established."],
  ["03", "Complete Staff assignment", "implemented", "server/customerCare.js; server/adminStaffWork.js", "Assignment requires an active Staff account with support_investigation capability; this is local source evidence."],
  ["04", "Add queue management", "implemented", "server/customerCare.js", "Main provides a bounded active queue ordered by state, priority and age."],
  ["05", "Add priority", "implemented", "server/customerCare.js", "Priority is constrained to low, normal, high or urgent and affects queue ordering."],
  ["06", "Add SLA timers", "missing", "No SLA policy, dueAt field or SLA timer contract found in current Customer Care source.", "No SLA target is configured; do not infer a service-level commitment from conversation age."],
  ["07", "Add SLA-risk indicators", "missing", "No SLA-risk state or risk threshold found in current Customer Care source.", "Cannot report at-risk/breached states without an approved SLA policy."],
  ["08", "Add escalation", "partial", "server/customerCare.js", "Customer-requested and owner escalation endpoints exist; escalation policy, tiering and guaranteed durable audit are not established."],
  ["09", "Add transfer", "missing", "No explicit transfer endpoint or transfer event found in current Customer Care source.", "Reassignment is not treated as a verified transfer workflow."],
  ["10", "Add supervisor takeover", "missing", "No explicit supervisor-takeover control or distinct audit event found.", "Do not infer takeover from owner escalation."],
  ["11", "Add internal notes", "missing", "Customer Care message model has sender types but no private internal-note channel or visibility policy.", "No internal notes are exposed or implied by the public transcript."],
  ["12", "Add customer history", "partial", "server/customerCare.js", "Staff thread response includes limited user identity fields; a scoped customer-history panel/query is not established."],
  ["13", "Add related-order context", "missing", "No related-order join or context contract found in Customer Care routes.", "Order context is unavailable rather than inferred."],
  ["14", "Add payment context", "missing", "No Customer Care payment-context endpoint or redacted payment summary contract found.", "Sensitive financial context remains unavailable in the support view."],
  ["15", "Add account context", "partial", "server/customerCare.js", "Staff can receive user ID/name/email with authorization checks; broader account context and minimization contract are not established."],
  ["16", "Add canned responses", "missing", "No approved response catalog or canned-response action found.", "Agents send typed replies only in the current contract."],
  ["17", "Add attachment handling", "missing", "Customer Care messages accept bounded text only; no attachment metadata/storage pipeline found.", "Attachments are not supported by this workflow."],
  ["18", "Add conversation search", "partial", "server/customerCare.js", "Owner queue filters by user name, email and handoff reason; transcript full-text search is not established."],
  ["19", "Add reopen", "implemented", "server/customerCare.js; server/customerCare.contract.test.js", "Customer-owned reopen returns a closed thread to waiting and attempts to restore related work; concurrency/live acceptance is not established."],
  ["20", "Add resolution reasons", "missing", "Close route has no required structured resolution-reason field or catalog.", "Closing is supported but a standardized resolution reason is not."],
  ["21", "Add Staff performance metrics", "partial", "server/ownerAnalytics.js", "A bounded aggregate Customer Care count exists; agent-level quality/performance metrics are not established."],
  ["22", "Add workload metrics", "unverified", "Per-agent workload reporting is an Admin-owned Staff Work concern and is not exposed by Main Customer Care source.", "Queue age/order is not a substitute for measured per-agent workload; audit Admin-owned workload evidence separately."],
  ["23", "Add support audit", "partial", "server/customerCare.js; platform_event_log", "Lifecycle/message events are attempted, but best-effort writes that swallow errors do not prove durable, complete audit lineage."],
  ["24", "Add Admin support command center", "unverified", "This is an Admin-owned capability and is audited independently in the Admin product roadmap.", "Main source evidence cannot certify Admin command-center completeness; the separate Admin crosswalk remains authoritative for Admin implementation."],
  ["25", "Verify the complete Customer Care operation", "partial", "server/customerCare.contract.test.js; Admin test/customer-care.test.js; test/staff-work.test.js", "Local contract tests cover key paths, but full end-to-end, deployed and live customer/Staff acceptance is not established."],
]);

function buildCustomerCareTraceability() {
  const items = ITEMS.map(([item, requirement, status, evidence, note]) => ({ item, requirement, status, evidence, note }));
  const counts = { implemented: 0, partial: 0, missing: 0, unverified: 0 };
  for (const item of items) counts[item.status] = (counts[item.status] || 0) + 1;
  return {
    status: "ITEM_LEVEL_AUDIT_COMPLETE_FEATURE_GAPS_OPEN",
    strategicBlock: 12,
    strategicItems: 25,
    auditedItems: items.length,
    featureComplete: false,
    counts,
    note: "This is a source-evidence inventory, not strategic completion. Historical Marketplace ranges remain misfit for strategic Block 12. Main owns support data and routing; Admin receives read-only readiness evidence.",
    items,
  };
}

module.exports = { buildCustomerCareTraceability, ITEMS };
