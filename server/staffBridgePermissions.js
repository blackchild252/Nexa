// Admin bridge permissions for staff management (M7786). These are separate from the staff-link
// permissions (products, orders, ...): they say which STAFF-MANAGEMENT calls a Director or a
// Manager may make through the Admin bridge. Approval is the Director's alone. Fail closed:
// anything not listed here is refused. Scope: this module only decides; it wires no route.
"use strict";

const BRIDGE_PERMISSIONS = Object.freeze(["staff.read", "staff.request", "staff.suspend", "staff.remove", "staff.approve"]);

// Which caller tiers may ever hold each permission.
const TIER_CAN_HOLD = Object.freeze({
  "staff.read": ["director", "manager"],
  "staff.request": ["director", "manager"],
  "staff.suspend": ["director", "manager"],
  "staff.remove": ["director", "manager"],
  "staff.approve": ["director"]   // approval is Director only
});

class BridgeDenied extends Error {
  constructor(code) { super("Not allowed."); this.code = code; this.status = 403; }
}

// caller: { id, tier, unit?, grants: [permission, ...] }  — grants come from the server's own
// record of the caller, never from the request body.
// target: { unit, bossTier?, bossId? } — what the call is about.
function authorizeBridgeCall(caller, permission, target) {
  if (!BRIDGE_PERMISSIONS.includes(permission)) throw new BridgeDenied("unknown_permission");
  if (!caller || typeof caller !== "object" || typeof caller.id !== "string" || !caller.id) throw new BridgeDenied("no_caller");
  if (!Array.isArray(caller.grants)) throw new BridgeDenied("no_grants");
  if (!TIER_CAN_HOLD[permission].includes(caller.tier)) throw new BridgeDenied("tier_cannot_hold");
  if (!caller.grants.includes(permission)) throw new BridgeDenied("not_granted");
  // A Manager works inside one unit only; a Director is company-wide.
  if (caller.tier === "manager") {
    if (typeof caller.unit !== "string" || !caller.unit) throw new BridgeDenied("no_unit");
    if (!target || target.unit !== caller.unit) throw new BridgeDenied("other_unit");
  }
  if (!target || typeof target.unit !== "string" || !target.unit) throw new BridgeDenied("no_target");
  return true;
}

// A Director can hand a Manager only management permissions a Manager may hold, and only ones the
// Director holds. staff.approve can never be handed down.
function grantsForManager(directorGrants, wanted) {
  if (!Array.isArray(directorGrants) || !Array.isArray(wanted)) throw new BridgeDenied("no_grants");
  for (const p of wanted) {
    if (!BRIDGE_PERMISSIONS.includes(p)) throw new BridgeDenied("unknown_permission");
    if (!TIER_CAN_HOLD[p].includes("manager")) throw new BridgeDenied("tier_cannot_hold");
    if (!directorGrants.includes(p)) throw new BridgeDenied("over_cap");
  }
  return [...new Set(wanted)];
}

module.exports = { BRIDGE_PERMISSIONS, TIER_CAN_HOLD, BridgeDenied, authorizeBridgeCall, grantsForManager };
