// Manager appointments (M7780). Owner decisions (2026-10-27):
//  - The Administrative Director approves a Manager's appointment. The CEO is not in this step.
//  - The Director names the unit (Business Hub, Kitchen or Blaca Essentials) when appointing. It comes from
//    the appointment record only, is chosen from a fixed list, and the Manager can never change it.
// An appointment is NOT a staff link: it holds no credentials, and a Manager signs in with their own NEXA
// account. A Manager is a boss of tier "manager" whose id is their NEXA account id. Their own staff are ordinary
// staff links under that boss (approved by the Director, as before), limited to the Manager's unit.
// Suspension and removal reuse the boss hold and boss removal in staffLinks, so the Manager's staff stop at once.
// Scope: this module only decides and records; it wires no route, screen or Admin/Central call.
"use strict";
const crypto = require("crypto");
const { StaffLinkError, UNIT_PERMISSIONS } = require("./staffLinks");

const MANAGER_UNITS = Object.freeze(["business-hub", "kitchen", "blaca-essentials"]);
const MANAGER_AUDIT_ACTIONS = Object.freeze(["manager_appointed", "manager_suspended", "manager_restored", "manager_removed"]);

const MANAGER_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS staff_managers (
  id TEXT PRIMARY KEY,
  nexaUserId TEXT NOT NULL,
  unit TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved',
  appointedBy TEXT NOT NULL,
  appointedTier TEXT NOT NULL,
  reason TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  removedAt TEXT
);
-- One live appointment per NEXA account, enforced by the database.
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_managers_one_live ON staff_managers(nexaUserId) WHERE status = 'approved';
CREATE TABLE IF NOT EXISTS staff_manager_audit (
  id TEXT PRIMARY KEY, at TEXT NOT NULL, action TEXT NOT NULL, managerUserId TEXT NOT NULL, unit TEXT,
  actorId TEXT NOT NULL, actorTier TEXT, reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_staff_manager_audit_user ON staff_manager_audit(managerUserId, at);
`;

const str = (v, max = 100) => typeof v === "string" && v.trim() !== "" && v.length <= max;
const forbidden = () => new StaffLinkError(403, "forbidden", "You cannot do that.");

function createStaffManagers(db, links) {
  if (!links || typeof links.suspendBoss !== "function" || typeof links.createPendingLink !== "function") throw new Error("staff links are required");
  db.exec(MANAGER_SCHEMA_SQL);
  function tx(fn) {
    db.exec("SAVEPOINT nexa_manager_tx");
    try { const r = fn(); db.exec("RELEASE nexa_manager_tx"); return r; }
    catch (e) { try { db.exec("ROLLBACK TO nexa_manager_tx"); db.exec("RELEASE nexa_manager_tx"); } catch (_) { /* original error wins */ } throw e; }
  }
  const cleanWhy = (reason) => { const w = typeof reason === "string" ? reason.trim() : ""; if (w.length < 3 || w.length > 500) throw new StaffLinkError(400, "reason_required", "A short reason is needed."); return w; };
  const isDirector = (a) => !!a && typeof a === "object" && a.tier === "director" && str(a.id);

  const insManager = db.prepare("INSERT INTO staff_managers (id,nexaUserId,unit,status,appointedBy,appointedTier,reason,createdAt,updatedAt) VALUES (?,?,?,'approved',?,?,?,?,?)");
  const insAudit = db.prepare("INSERT INTO staff_manager_audit (id,at,action,managerUserId,unit,actorId,actorTier,reason) VALUES (?,?,?,?,?,?,?,?)");
  const liveRow = db.prepare("SELECT * FROM staff_managers WHERE nexaUserId = ? AND status = 'approved'");
  const liveStaffLink = db.prepare("SELECT id FROM staff_links WHERE nexaUserId = ? AND status IN ('pending','approved','suspended')");
  const held = db.prepare("SELECT 1 AS x FROM staff_boss_holds WHERE bossTier = 'manager' AND bossId = ?");
  const markRemoved = db.prepare("UPDATE staff_managers SET status = 'removed', removedAt = ?, updatedAt = ? WHERE id = ? AND status = 'approved'");

  function audit(action, mgr, actor, reason, t) {
    if (!MANAGER_AUDIT_ACTIONS.includes(action)) throw new StaffLinkError(500, "bad_audit_action", "Audit action is not valid.");
    insAudit.run(crypto.randomUUID(), t, action, mgr.nexaUserId, mgr.unit || null, String(actor.id), actor.tier || null, reason);
  }
  const needManager = (userId) => { const m = str(userId) ? liveRow.get(userId) : null; if (!m) throw new StaffLinkError(404, "not_found", "Manager not found."); return m; };

  // The Director appoints and approves in one act. The unit is chosen here, from the fixed list.
  function appoint(actor, input) {
    if (!isDirector(actor)) throw forbidden();
    const i = input && typeof input === "object" ? input : {};
    if (!str(i.nexaUserId)) throw new StaffLinkError(400, "bad_user", "Choose a NEXA account.");
    if (i.nexaUserId === actor.id) throw new StaffLinkError(400, "self_appoint", "You cannot appoint yourself.");
    if (typeof i.unit !== "string" || !MANAGER_UNITS.includes(i.unit)) throw new StaffLinkError(400, "bad_unit", "That unit is not valid for a Manager.");
    const why = cleanWhy(i.reason);
    const t = new Date().toISOString();
    return tx(() => {
      if (liveStaffLink.get(i.nexaUserId)) throw new StaffLinkError(409, "already_staff", "That account already works as staff.");
      if (liveRow.get(i.nexaUserId)) throw new StaffLinkError(409, "already_manager", "That account is already a Manager.");
      const id = crypto.randomUUID();
      insManager.run(id, i.nexaUserId, i.unit, actor.id, "director", why, t, t);
      audit("manager_appointed", { nexaUserId: i.nexaUserId, unit: i.unit }, actor, why, t);
      return db.prepare("SELECT * FROM staff_managers WHERE id = ?").get(id);
    });
  }

  // The Manager as the server knows them, or null. A Manager whose boss hold is on counts as nobody.
  function managerFor(nexaUserId) {
    if (!str(nexaUserId)) return null;
    const m = liveRow.get(nexaUserId);
    if (!m || held.get(nexaUserId)) return null;
    return { id: m.nexaUserId, tier: "manager", unit: m.unit };
  }
  // Shape the Admin bridge permission check expects. Grants are NOT decided here; they come from the server's own grant record.
  function bridgeCaller(nexaUserId, grants) {
    const m = managerFor(nexaUserId);
    return m ? { id: m.id, tier: "manager", unit: m.unit, grants: Array.isArray(grants) ? grants : [] } : null;
  }

  function suspend(actor, managerUserId, reason) {
    if (!isDirector(actor)) throw forbidden();
    const m = needManager(managerUserId);
    const why = cleanWhy(reason);
    const t = new Date().toISOString();
    return tx(() => { const r = links.suspendBoss("manager", m.nexaUserId, actor, why); audit("manager_suspended", m, actor, why, t); return r; });
  }
  function restore(actor, managerUserId, reason) {
    if (!isDirector(actor)) throw forbidden();
    const m = needManager(managerUserId);
    const why = cleanWhy(reason);
    const t = new Date().toISOString();
    return tx(() => { const r = links.restoreBoss("manager", m.nexaUserId, actor, why); audit("manager_restored", m, actor, why, t); return r; });
  }
  // Removing a Manager ends their appointment and every staff link under them. Nobody's NEXA account is touched.
  function remove(actor, managerUserId, reason) {
    if (!isDirector(actor)) throw forbidden();
    const m = needManager(managerUserId);
    const why = cleanWhy(reason);
    const t = new Date().toISOString();
    return tx(() => {
      const r = links.removeBoss("manager", m.nexaUserId, actor, why);
      markRemoved.run(t, t, m.id);
      audit("manager_removed", m, actor, why, t);
      return r;
    });
  }

  // A Manager asks for their own staff. Boss, tier and unit come from the appointment, never from the request.
  // Staff permissions are capped to what the Manager's unit allows. The Director still approves the link.
  function requestStaff(managerActor, input, opts = {}) {
    const mgr = managerActor && typeof managerActor === "object" ? managerFor(managerActor.id) : null;
    if (!mgr) throw forbidden();
    const i = input && typeof input === "object" ? input : {};
    if (i.bossTier != null && i.bossTier !== "manager") throw forbidden();
    if (i.bossId != null && i.bossId !== mgr.id) throw forbidden();
    if (i.unit != null && i.unit !== mgr.unit) throw forbidden();
    if (str(i.nexaUserId) && liveRow.get(i.nexaUserId)) throw new StaffLinkError(409, "already_manager", "That account is already a Manager.");
    const cap = UNIT_PERMISSIONS[mgr.unit] || [];
    return links.createPendingLink({ ...i, bossTier: "manager", bossId: mgr.id, unit: mgr.unit, requestedBy: mgr.id }, { ...opts, bossCap: cap });
  }

  function listManagers() { return db.prepare("SELECT * FROM staff_managers WHERE status = 'approved' ORDER BY createdAt").all(); }
  function auditForManager(userId) { return str(userId) ? db.prepare("SELECT * FROM staff_manager_audit WHERE managerUserId = ? ORDER BY at").all(userId) : []; }
  return { appoint, managerFor, bridgeCaller, suspend, restore, remove, requestStaff, listManagers, auditForManager };
}

module.exports = { MANAGER_UNITS, MANAGER_AUDIT_ACTIONS, MANAGER_SCHEMA_SQL, createStaffManagers };
