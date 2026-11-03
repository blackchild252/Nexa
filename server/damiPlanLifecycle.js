"use strict";

const PLAN_STATUSES = new Set(["draft", "awaiting_approval", "approved", "active", "completed", "cancelled", "archived"]);
const TERMINAL_STATUSES = new Set(["completed", "cancelled", "archived"]);
const ALLOWED_TRANSITIONS = Object.freeze({
  draft: new Set(["draft", "awaiting_approval", "active", "cancelled", "archived"]),
  awaiting_approval: new Set(["awaiting_approval", "draft", "approved", "cancelled", "archived"]),
  approved: new Set(["approved", "active", "cancelled", "archived"]),
  active: new Set(["active", "completed", "cancelled", "archived"]),
  completed: new Set(["completed", "archived"]),
  cancelled: new Set(["cancelled"]),
  archived: new Set(["archived"]),
});

function canTransitionPlan(from, to) {
  return PLAN_STATUSES.has(from) && PLAN_STATUSES.has(to) && Boolean(ALLOWED_TRANSITIONS[from]?.has(to));
}
function planTransitionError(from, to) {
  if (!PLAN_STATUSES.has(to)) return "Invalid plan status.";
  if (TERMINAL_STATUSES.has(from) && from !== to && !(from === "completed" && to === "archived")) {
    return "This plan is in a terminal state and cannot be reopened.";
  }
  if (!canTransitionPlan(from, to)) return `Plan status cannot transition from ${from} to ${to}.`;
  return null;
}
function requiresExplicitApproval(status) { return status === "awaiting_approval" || status === "approved"; }

module.exports = { PLAN_STATUSES, TERMINAL_STATUSES, canTransitionPlan, planTransitionError, requiresExplicitApproval };
