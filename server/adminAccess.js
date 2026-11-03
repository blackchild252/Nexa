"use strict";
// Admin access (B320): who is an admin, what each role may do, and a record of every admin action.
// The owner list still comes from NEXA_ADMIN_EMAILS / NEXA_ADMIN_USER_IDS (mallAdmin.isConfiguredAdmin).
// Extra admins are added by an owner and get a smaller role.
const crypto = require("crypto");

const ROLES = ["owner", "reviewer", "support"];
const PERMISSIONS = {
  // B328: six are for the owner-only routes (Mall, payments, operations, launch, fitness gyms, leisure). B329 adds kitchen_hub (Kitchen Hub shops and audit). They only tell the admin app which pages to show. Those routes are still checked by the owner list.
  owner: new Set(["admins", "audit", "summary", "users_read", "users_suspend", "vendors_read", "vendors_moderate", "verification", "reports", "social_reports", "mall", "mall_details", "payments", "operations", "launch", "fitness_gyms", "fitness_gyms_write", "leisure_ops", "kitchen_hub", "kitchen_hub_decide", "approvals", "approval_center", "violations", "staff_work", "users_remove", "vendors_remove", "creator_content", "security"]),
  reviewer: new Set(["summary", "verification", "reports", "social_reports", "users_read", "vendors_read", "security"]),
  support: new Set(["summary", "users_read", "vendors_read", "security"]),
};
// Admin AAMI Director permissions apply only after the dedicated NEXA grant
// middleware has attached req.adminAamiAccess. They never create legacy admin_users.
const ADMIN_AAMI_PERMISSIONS = Object.freeze({
  // V6.2.8: fitness_gyms (list) + fitness_gyms_write (approve/reject), leisure_ops, kitchen_hub (applications + log) + kitchen_hub_decide (approve/reject/suspend a shop) and creator_content (YouTube config, read only) are Administrative Director only. General Manager and Group Director get none of them.
  // V6.2.6: mall_disputes (buyer data + resolution), mall_reviews_write and social_reports_write are Administrative Director only; General Manager and Group Director keep read-only "mall" and "violations".
  administrative_director: new Set(["summary", "users_read", "users_suspend", "vendors_read", "vendors_moderate", "verification", "mall", "violations", "staff_work", "payments", "audit", "mall_disputes", "mall_reviews_write", "social_reports_write", "fitness_gyms", "fitness_gyms_write", "leisure_ops", "kitchen_hub", "kitchen_hub_decide", "creator_content"]),
  general_manager: new Set(["summary", "users_read", "vendors_read", "verification", "mall", "violations"]),
  group_director: new Set(["summary", "users_read", "vendors_read", "verification", "mall", "violations"]),
});

function create({ db, isConfiguredAdmin, genRowId }) {
  let stepUpPolicy = null;
  function setStepUpPolicy(policy) { stepUpPolicy = policy || null; }
  db.exec(`
CREATE TABLE IF NOT EXISTS admin_users (
  userId TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  addedBy TEXT,
  createdAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS admin_audit (
  id TEXT PRIMARY KEY,
  actorId TEXT NOT NULL,
  actorRole TEXT NOT NULL,
  action TEXT NOT NULL,
  targetType TEXT,
  targetId TEXT,
  detail TEXT,
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_time ON admin_audit(createdAt);
`);
  const newId = () => (typeof genRowId === "function" ? genRowId() : crypto.randomUUID());

  function roleOf(user) {
    if (!user || !user.id) return null;
    if (user.adminSessionVerified === false) return null;   // V6.1.93 B539: unverified session, no admin role
    if (typeof isConfiguredAdmin === "function" && isConfiguredAdmin(user)) return "owner";
    const row = db.prepare("SELECT role FROM admin_users WHERE userId = ?").get(user.id);
    return row && ROLES.includes(row.role) ? row.role : null;
  }
  const can = (user, permission) => { const r = roleOf(user); return !!r && PERMISSIONS[r].has(permission); };

  function scopedAamiRole(req) {
    const grant = req?.adminAamiAccess;
    if (!grant || grant.productId !== "admin-aami" || grant.companyId !== "nexa" || !Object.hasOwn(ADMIN_AAMI_PERMISSIONS, grant.role)) return null;
    return grant.role;
  }
  function canRequest(req, permission) {
    // Once the scoped middleware attaches an Admin AAMI grant, that grant is the
    // only authority for this request. A malformed or cross-company grant must
    // never fall through to a user's unrelated legacy/global Admin role.
    if (req && Object.hasOwn(req, "adminAamiAccess")) {
      const aamiRole = scopedAamiRole(req);
      return !!aamiRole && ADMIN_AAMI_PERMISSIONS[aamiRole].has(permission);
    }
    return can(req?.user, permission);
  }

  // V6.2.6: routes that were owner-only now also serve a verified Admin AAMI grant. A scoped request is decided ONLY by its
  // grant's permission set (the owner list never applies to it); an unscoped request keeps exactly the check the route already had.
  function allowRoute(req, permission, legacyAllowed) {
    if (req && Object.hasOwn(req, "adminAamiAccess")) return canRequest(req, permission);
    return legacyAllowed === true;
  }

  // Express guard: legacy admins retain their existing permissions; an Admin
  // AAMI grant is accepted only on requests already verified by the scoped route guard.
  const require_ = (permission) => (req, res, next) => {
    if (!canRequest(req, permission)) return res.status(403).json({ error: "Administrator access required." });
    req.adminRole = scopedAamiRole(req) ? "administrative_director" : roleOf(req.user);
    const action = stepUpPolicy?.actionFor?.(req);
    if (action && !stepUpPolicy?.validate?.(req, action)) {
      return res.status(428).json({ error: "Reauthenticate before this sensitive Admin action.", code: "STEP_UP_REQUIRED", action, requiresMfa: !!stepUpPolicy?.requiresMfa?.(req.user.id) });
    }
    return next();
  };

  // Middleware for the write routes shared with the legacy owner path: scoped requests get the permission check, the step-up
  // check and the grant's role on the audit row; unscoped requests pass through to the route's own existing guard.
  const scopedGate = (permission) => (req, res, next) => (req && Object.hasOwn(req, "adminAamiAccess") ? require_(permission)(req, res, next) : next());

  function audit(req, action, targetType, targetId, detail) {
    const role = req.adminRole || roleOf(req.user) || "unknown";
    db.prepare("INSERT INTO admin_audit(id,actorId,actorRole,action,targetType,targetId,detail,createdAt) VALUES(?,?,?,?,?,?,?,?)")
      .run(newId(), req.user.id, role, action, targetType || null, targetId || null, detail ? String(detail).slice(0, 500) : null, new Date().toISOString());
  }

  // Everyone who should be told when something needs review (owners from the env lists plus added admins).
  function adminUserIds(permission) {
    const ids = new Set();
    const env = process.env;
    String(env.NEXA_ADMIN_USER_IDS || "").split(",").map((x) => x.trim()).filter(Boolean).forEach((x) => ids.add(x));
    const emails = String(env.NEXA_ADMIN_EMAILS || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
    for (const e of emails) { const u = db.prepare("SELECT id FROM users WHERE lower(email) = ?").get(e); if (u) ids.add(u.id); }
    for (const r of db.prepare("SELECT userId, role FROM admin_users").all()) if (!permission || PERMISSIONS[r.role]?.has(permission)) ids.add(r.userId);
    return [...ids];
  }

  return { ROLES, PERMISSIONS, ADMIN_AAMI_PERMISSIONS, roleOf, can, canRequest, allowRoute, scopedGate, require: require_, audit, adminUserIds, newId, setStepUpPolicy };
}

module.exports = { create, ROLES, PERMISSIONS };
