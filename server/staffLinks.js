// Staff Link registry (M7767, M7768). One row per NEXA account that works for a boss.
// Main owns this registry (owner decision 2026-10-14): all staff, top to bottom including vendor
// staff, share this one table; each person has exactly one individual link. A link holds NO
// credentials, passwords, codes or 2FA material — the person signs in with their own NEXA account.
"use strict";

class StaffLinkError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

// Boss tiers that can have staff. Tier of the boss -> who must approve that boss's staff.
// Owner decisions: Administrative Director approves vendor and Manager staff; CEO approves Director
// staff; Founder approves CEO staff (decided 2026-10-14). Nobody approves their own staff.
const BOSS_TIERS = Object.freeze(["ceo", "director", "manager", "vendor"]);
const APPROVER_TIER = Object.freeze({ ceo: "founder", director: "ceo", manager: "director", vendor: "director" });
const STATUSES = Object.freeze(["pending", "approved", "rejected", "suspended", "removed"]);
const LIVE_STATUSES = Object.freeze(["pending", "approved", "suspended"]); // occupy the one link
// M7776 — permissions a boss can hand to staff. A boss can only grant what the boss holds.
const PERMISSIONS = Object.freeze(["products", "orders", "uploads", "stock", "sales_view", "kitchen_sales"]);
const UNITS = Object.freeze(["central", "admin", "business-hub", "kitchen", "blaca-essentials"]);

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS staff_links (
  id TEXT PRIMARY KEY,
  nexaUserId TEXT NOT NULL,
  bossTier TEXT NOT NULL,
  bossId TEXT NOT NULL,
  unit TEXT NOT NULL,
  permissions TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending',
  requestedBy TEXT NOT NULL,
  requestKey TEXT,
  approverId TEXT,
  approverTier TEXT,
  decisionReason TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  decidedAt TEXT,
  activatedAt TEXT
);
-- One live link per NEXA account, across every tier and unit. Enforced by the database, so
-- concurrent or retried requests cannot create a second one.
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_links_one_live ON staff_links(nexaUserId) WHERE status IN ('pending','approved','suspended');
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_links_request_key ON staff_links(requestedBy, requestKey) WHERE requestKey IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_links_boss ON staff_links(bossTier, bossId, status);
`;

const UPLOAD_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS staff_uploads (
  id TEXT PRIMARY KEY, linkId TEXT NOT NULL, bossId TEXT NOT NULL, unit TEXT NOT NULL, kind TEXT NOT NULL,
  payload TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', submittedBy TEXT NOT NULL,
  decidedBy TEXT, decisionReason TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_staff_uploads_queue ON staff_uploads(bossId, status);
`;
// M7783 — audit trail. Holds who did what to which link and why. Never credentials, codes or 2FA material.
const AUDIT_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS staff_link_audit (
  id TEXT PRIMARY KEY, at TEXT NOT NULL, action TEXT NOT NULL, linkId TEXT, actorId TEXT NOT NULL, actorTier TEXT,
  subjectUserId TEXT, bossTier TEXT, bossId TEXT, unit TEXT, reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_staff_link_audit_link ON staff_link_audit(linkId, at);
CREATE INDEX IF NOT EXISTS idx_staff_link_audit_boss ON staff_link_audit(bossTier, bossId, at);
`;
// M7781 — a hold pauses every staff link of one boss without rewriting the links, so lifting it restores them exactly.
const HOLD_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS staff_boss_holds (
  bossTier TEXT NOT NULL, bossId TEXT NOT NULL, reason TEXT NOT NULL, heldBy TEXT NOT NULL, heldAt TEXT NOT NULL,
  PRIMARY KEY (bossTier, bossId)
);
`;
// M7778/M7779 — which permissions make sense in which unit. A unit not listed here is not restricted yet.
const UNIT_PERMISSIONS = Object.freeze({
  "business-hub": Object.freeze(["products", "orders", "uploads", "stock", "sales_view"]),
  "kitchen": Object.freeze(["uploads", "kitchen_sales", "sales_view"]),
  "blaca-essentials": Object.freeze(["products", "uploads", "stock", "sales_view"]),
});
const AUDIT_ACTIONS = Object.freeze(["link_requested", "link_approved", "link_rejected", "link_suspended", "link_removed", "link_resumed", "boss_suspended", "boss_restored", "boss_removed", "upload_approved", "upload_rejected", "migrated", "migration_rolled_back"]);
const str = (v, max = 200) => typeof v === "string" && v.trim() !== "" && v.length <= max;
const FORBIDDEN_KEY = /pass(word)?|secret|token|code|otp|2fa|totp|credential/i;

function normalizePermissions(perms) {
  if (!Array.isArray(perms) || perms.length > 20) throw new StaffLinkError(400, "bad_permissions", "Permissions must be a short list.");
  const out = [];
  for (const p of perms) {
    if (typeof p !== "string" || !PERMISSIONS.includes(p)) throw new StaffLinkError(400, "bad_permissions", "A permission name is not valid.");
    if (!out.includes(p)) out.push(p);
  }
  return out.sort();
}

// Validates and normalizes a Staff Link record. Never accepts credential-like fields.
function buildLinkRecord(input, { genId, now = () => new Date().toISOString() } = {}) {
  if (!input || typeof input !== "object") throw new StaffLinkError(400, "bad_link", "Link request is not valid.");
  for (const k of Object.keys(input)) {
    if (FORBIDDEN_KEY.test(k) && k !== "requestKey") throw new StaffLinkError(400, "credential_field", "Staff links never carry credentials.");
  }
  if (!str(input.nexaUserId) || !str(input.bossId) || !str(input.requestedBy)) throw new StaffLinkError(400, "bad_link", "Link request is not valid.");
  if (!BOSS_TIERS.includes(input.bossTier)) throw new StaffLinkError(400, "bad_tier", "That boss tier is not valid.");
  if (!UNITS.includes(input.unit)) throw new StaffLinkError(400, "bad_unit", "That unit is not valid.");
  const allowedHere = UNIT_PERMISSIONS[input.unit];
  if (allowedHere && Array.isArray(input.permissions) && input.permissions.some((p) => PERMISSIONS.includes(p) && !allowedHere.includes(p))) throw new StaffLinkError(400, "permission_not_for_unit", "That permission does not belong to this unit.");
  if (input.requestKey != null && !str(input.requestKey, 80)) throw new StaffLinkError(400, "bad_link", "Request key is not valid.");
  if (input.nexaUserId === input.bossId) throw new StaffLinkError(400, "self_link", "A person cannot be their own staff.");
  const t = now();
  return {
    id: genId ? genId() : require("crypto").randomUUID(),
    nexaUserId: input.nexaUserId, bossTier: input.bossTier, bossId: input.bossId, unit: input.unit,
    permissions: JSON.stringify(normalizePermissions(input.permissions || [])),
    status: "pending", requestedBy: input.requestedBy, requestKey: input.requestKey || null,
    approverId: null, approverTier: null, decisionReason: null, createdAt: t, updatedAt: t, decidedAt: null,
  };
}

function createStaffLinks(db) {
  db.exec(SCHEMA_SQL);
  db.exec(AUDIT_SCHEMA_SQL);
  db.exec(HOLD_SCHEMA_SQL);
  // Works on better-sqlite3 and node:sqlite alike: a savepoint, so a state change and its audit row land together or not at all.
  function tx(fn) {
    db.exec("SAVEPOINT nexa_staff_tx");
    try { const r = fn(); db.exec("RELEASE nexa_staff_tx"); return r; }
    catch (e) { try { db.exec("ROLLBACK TO nexa_staff_tx"); db.exec("RELEASE nexa_staff_tx"); } catch (_) { /* original error wins */ } throw e; }
  }
  const insAudit = db.prepare("INSERT INTO staff_link_audit (id,at,action,linkId,actorId,actorTier,subjectUserId,bossTier,bossId,unit,reason) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
  function audit(action, link, actor, reason, t = new Date().toISOString()) {
    if (!AUDIT_ACTIONS.includes(action)) throw new StaffLinkError(500, "bad_audit_action", "Audit action is not valid.");
    const why = typeof reason === "string" && reason.trim() ? reason.trim().slice(0, 500) : null;
    insAudit.run(require("crypto").randomUUID(), t, action, link ? link.id : null, String(actor && actor.id || "system"), actor && actor.tier || null, link ? link.nexaUserId : null, link ? link.bossTier : null, link ? link.bossId : null, link ? link.unit : null, why);
  }
  const byKey = db.prepare("SELECT * FROM staff_links WHERE requestedBy = ? AND requestKey = ?");
  const live = db.prepare("SELECT id, bossTier, bossId, status FROM staff_links WHERE nexaUserId = ? AND status IN ('pending','approved','suspended')");
  const ins = db.prepare("INSERT INTO staff_links (id,nexaUserId,bossTier,bossId,unit,permissions,status,requestedBy,requestKey,approverId,approverTier,decisionReason,createdAt,updatedAt,decidedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");

  // Creates a pending link. Retried request (same requestedBy + requestKey) returns the same row.
  // An account that already has a live link anywhere is refused, whoever asks.
  function createPendingLink(input, opts = {}) {
    const rec = buildLinkRecord(input, opts);
    // M7776 — fail closed: the caller must say what the boss holds; staff get at most that.
    if (!Array.isArray(opts.bossCap)) throw new StaffLinkError(500, "boss_cap_missing", "Boss permissions were not supplied.");
    for (const p of JSON.parse(rec.permissions)) if (!opts.bossCap.includes(p)) throw new StaffLinkError(403, "over_cap", "That is more than you hold yourself.");
    if (rec.requestKey) {
      const prior = byKey.get(rec.requestedBy, rec.requestKey);
      if (prior) {
        if (prior.nexaUserId !== rec.nexaUserId) throw new StaffLinkError(409, "request_key_reuse", "That request key was already used for something else.");
        return { link: prior, replayed: true };
      }
    }
    try {
      tx(() => {
        ins.run(rec.id, rec.nexaUserId, rec.bossTier, rec.bossId, rec.unit, rec.permissions, rec.status, rec.requestedBy, rec.requestKey, rec.approverId, rec.approverTier, rec.decisionReason, rec.createdAt, rec.updatedAt, rec.decidedAt);
        audit("link_requested", rec, { id: rec.requestedBy, tier: rec.bossTier }, null, rec.createdAt);
      });
    } catch (e) {
      if (/UNIQUE/i.test(String(e && e.message)) ) {
        // Race: someone else's retry or a competing boss got there first. Re-check and answer plainly.
        if (rec.requestKey) {
          const prior = byKey.get(rec.requestedBy, rec.requestKey);
          if (prior && prior.nexaUserId === rec.nexaUserId) return { link: prior, replayed: true };
        }
        throw new StaffLinkError(409, "already_linked", "This account already has a staff link.");
      }
      throw e;
    }
    return { link: db.prepare("SELECT * FROM staff_links WHERE id = ?").get(rec.id), replayed: false };
  }

  function liveLinkFor(nexaUserId) { return live.get(nexaUserId) || null; }

  // M7770/M7771 — decide a pending link. The approver must hold the tier the chain requires for
  // this boss's tier (director -> vendor & manager staff, ceo -> director staff, founder -> CEO staff).
  // Nobody can decide a link they requested, are the boss of, or are the subject of. A rejection
  // needs an audit reason. The UPDATE only succeeds while the row is still pending, so two
  // approvers racing cannot both win.
  function decideLink(linkId, approver, decision, reason, now = () => new Date().toISOString()) {
    if (!approver || !str(approver.id) || !BOSS_TIERS.concat(["founder"]).includes(approver.tier)) throw new StaffLinkError(403, "not_approver", "You cannot decide this request.");
    if (decision !== "approved" && decision !== "rejected") throw new StaffLinkError(400, "bad_decision", "Decision must be approved or rejected.");
    const cleanReason = typeof reason === "string" ? reason.trim() : "";
    if (decision === "rejected" && (cleanReason.length < 3 || cleanReason.length > 500)) throw new StaffLinkError(400, "reason_required", "A rejection needs a short reason.");
    if (cleanReason.length > 500) throw new StaffLinkError(400, "reason_required", "Reason is too long.");
    const link = db.prepare("SELECT * FROM staff_links WHERE id = ?").get(linkId);
    if (!link) throw new StaffLinkError(404, "not_found", "Request not found.");
    if (approver.id === link.requestedBy || approver.id === link.bossId || approver.id === link.nexaUserId) throw new StaffLinkError(403, "self_approval", "You cannot decide your own request.");
    if (approver.tier !== APPROVER_TIER[link.bossTier]) throw new StaffLinkError(403, "wrong_tier", "You cannot decide this request.");
    const t = now();
    tx(() => {
      const r = db.prepare("UPDATE staff_links SET status = ?, approverId = ?, approverTier = ?, decisionReason = ?, decidedAt = ?, updatedAt = ? WHERE id = ? AND status = 'pending'").run(decision, approver.id, approver.tier, cleanReason || null, t, t, linkId);
      if (!r.changes) throw new StaffLinkError(409, "already_decided", "This request was already decided.");
      audit(decision === "approved" ? "link_approved" : "link_rejected", link, approver, cleanReason, t);
    });
    return db.prepare("SELECT * FROM staff_links WHERE id = ?").get(linkId);
  }
  // M7772-M7774 — staff sign-in. The person has ALREADY authenticated as their own NEXA account and
  // passed direct 2FA (twoFactorVerified comes from Main's existing sign-in, never from the client
  // body). This function never creates an account, password or verification; it only reads the
  // approved link and returns where the person lands, resolved on the server. Every failure gives
  // the same answer, so nothing reveals whether an account is staff or who its boss is.
  // Owner decisions: Business Hub staff work for a vendor (M7773). Kitchen and Blaca Essentials staff work under a Manager
  // (2026-10-27), so those doors accept Manager staff only, and only staff of that same unit.
  const DOORS = Object.freeze({
    "business-hub": Object.freeze({ tiers: Object.freeze(["vendor"]), unit: null, section: "vendor-shop" }),
    "kitchen": Object.freeze({ tiers: Object.freeze(["manager"]), unit: "kitchen", section: "manager-section" }),
    "blaca-essentials": Object.freeze({ tiers: Object.freeze(["manager"]), unit: "blaca-essentials", section: "manager-section" }),
  });
  // A link counts only while it is approved AND its boss is not on hold (M7781). Every staff check reads this live.
  const approvedFor = db.prepare("SELECT l.* FROM staff_links l WHERE l.nexaUserId = ? AND l.status = 'approved' AND NOT EXISTS (SELECT 1 FROM staff_boss_holds h WHERE h.bossTier = l.bossTier AND h.bossId = l.bossId)");
  const markActive = db.prepare("UPDATE staff_links SET activatedAt = ?, updatedAt = ? WHERE id = ? AND activatedAt IS NULL");
  function staffDoorSignIn(door, session, now = () => new Date().toISOString()) {
    const fail = () => new StaffLinkError(401, "staff_sign_in_failed", "Staff sign-in was not successful.");
    const rule = typeof door === "string" && Object.prototype.hasOwnProperty.call(DOORS, door) ? DOORS[door] : null;
    if (!rule || !session || session.authenticated !== true || session.twoFactorVerified !== true || !str(session.nexaUserId)) throw fail();
    const link = approvedFor.get(session.nexaUserId);
    if (!link || !rule.tiers.includes(link.bossTier) || (rule.unit && link.unit !== rule.unit)) throw fail();
    const t = now();
    markActive.run(t, t, link.id);
    return { linkId: link.id, nexaUserId: link.nexaUserId, destination: { section: rule.section, bossTier: link.bossTier, bossId: link.bossId, unit: link.unit }, permissions: JSON.parse(link.permissions) };
  }
  // M7775 — one decision point for any vendor-staff action. The vendor comes from the server-resolved
  // link, and the caller names the vendor the action touches; they must match. Fail closed.
  function authorizeStaffAction(nexaUserId, targetBossId, permission) {
    const l = str(nexaUserId) ? approvedFor.get(nexaUserId) : null;
    if (!l || l.bossId !== targetBossId || !JSON.parse(l.permissions).includes(permission)) throw new StaffLinkError(403, "forbidden", "You cannot do that.");
    return l;
  }

  // M7777 — upload approval queue. Staff uploads (product, menu item, photo) stay pending until the
  // boss side (vendor owner or Manager of that unit) approves. The approver's authority over
  // `bossId` is resolved by the server from their own account, never from the request.
  db.exec(UPLOAD_SCHEMA_SQL);
  const UPLOAD_KINDS = ["product", "menu_item", "photo"];
  function submitUpload(nexaUserId, kind, payload, now = () => new Date().toISOString()) {
    if (!UPLOAD_KINDS.includes(kind)) throw new StaffLinkError(400, "bad_upload", "That upload type is not valid.");
    const body = JSON.stringify(payload ?? null);
    if (body === undefined || body.length > 20000 || payload === null || typeof payload !== "object") throw new StaffLinkError(400, "bad_upload", "Upload is not valid.");
    const l = approvedFor.get(str(nexaUserId) ? nexaUserId : "");
    if (!l || !JSON.parse(l.permissions).includes("uploads")) throw new StaffLinkError(403, "forbidden", "You cannot do that.");
    const id = require("crypto").randomUUID(), t = now();
    db.prepare("INSERT INTO staff_uploads (id,linkId,bossId,unit,kind,payload,status,submittedBy,createdAt,updatedAt) VALUES (?,?,?,?,?,?,'pending',?,?,?)").run(id, l.id, l.bossId, l.unit, kind, body, l.nexaUserId, t, t);
    return db.prepare("SELECT * FROM staff_uploads WHERE id = ?").get(id);
  }
  function decideUpload(uploadId, approver, decision, reason, now = () => new Date().toISOString()) {
    if (!approver || !str(approver.id) || !str(approver.bossId)) throw new StaffLinkError(403, "forbidden", "You cannot do that.");
    if (decision !== "approved" && decision !== "rejected") throw new StaffLinkError(400, "bad_decision", "Decision must be approved or rejected.");
    const why = typeof reason === "string" ? reason.trim() : "";
    if ((decision === "rejected" && why.length < 3) || why.length > 500) throw new StaffLinkError(400, "reason_required", "A rejection needs a short reason.");
    const u = db.prepare("SELECT * FROM staff_uploads WHERE id = ?").get(uploadId);
    if (!u) throw new StaffLinkError(404, "not_found", "Upload not found.");
    if (u.bossId !== approver.bossId) throw new StaffLinkError(403, "forbidden", "You cannot do that.");
    if (approver.id === u.submittedBy) throw new StaffLinkError(403, "self_approval", "You cannot decide your own upload.");
    const t = now();
    tx(() => {
      const r = db.prepare("UPDATE staff_uploads SET status=?, decidedBy=?, decisionReason=?, updatedAt=? WHERE id=? AND status='pending'").run(decision, approver.id, why || null, t, uploadId);
      if (!r.changes) throw new StaffLinkError(409, "already_decided", "This upload was already decided.");
      const owner = db.prepare("SELECT * FROM staff_links WHERE id = ?").get(u.linkId);
      audit(decision === "approved" ? "upload_approved" : "upload_rejected", owner || { id: u.linkId, nexaUserId: u.submittedBy, bossTier: null, bossId: u.bossId, unit: u.unit }, { id: approver.id, tier: approver.tier || null }, why, t);
    });
    return db.prepare("SELECT * FROM staff_uploads WHERE id = ?").get(uploadId);
  }

  // M7781 — suspension and removal. Authority: the link's own boss, or the tier that approves that boss's staff.
  // Nobody acts on their own link. Removing a link never touches the NEXA account (no users table access here).
  // Staff authority ends at once because every staff check above reads the link and the hold live, per request.
  const actorOk = (a) => a && str(a.id) && (BOSS_TIERS.includes(a.tier) || a.tier === "founder");
  const bossSide = (a, l) => a.tier === l.bossTier && (a.bossId || a.id) === l.bossId;
  function canActOnLink(a, l) { return actorOk(a) && a.id !== l.nexaUserId && (bossSide(a, l) || a.tier === APPROVER_TIER[l.bossTier]); }
  const cleanWhy = (reason) => { const w = typeof reason === "string" ? reason.trim() : ""; if (w.length < 3 || w.length > 500) throw new StaffLinkError(400, "reason_required", "A short reason is needed."); return w; };
  function changeLink(linkId, actor, reason, from, to, action) {
    const why = cleanWhy(reason);
    const l = db.prepare("SELECT * FROM staff_links WHERE id = ?").get(linkId);
    if (!l || !canActOnLink(actor, l)) throw new StaffLinkError(l ? 403 : 404, l ? "forbidden" : "not_found", l ? "You cannot do that." : "Request not found.");
    const t = new Date().toISOString();
    tx(() => {
      const r = db.prepare(`UPDATE staff_links SET status = ?, decisionReason = ?, updatedAt = ? WHERE id = ? AND status IN (${from.map(() => "?").join(",")})`).run(to, why, t, linkId, ...from);
      if (!r.changes) throw new StaffLinkError(409, "wrong_state", "That link cannot be changed from its current state.");
      audit(action, l, actor, why, t);
    });
    return db.prepare("SELECT * FROM staff_links WHERE id = ?").get(linkId);
  }
  const suspendLink = (id, actor, reason) => changeLink(id, actor, reason, ["approved"], "suspended", "link_suspended");
  const removeLink = (id, actor, reason) => changeLink(id, actor, reason, ["pending", "approved", "suspended"], "removed", "link_removed");
  // Resuming is the approver tier's call only, so a boss cannot undo a suspension the approver placed.
  function resumeLink(linkId, actor, reason) {
    const l = db.prepare("SELECT * FROM staff_links WHERE id = ?").get(linkId);
    if (!l || !actorOk(actor) || actor.id === l.nexaUserId || actor.tier !== APPROVER_TIER[l.bossTier]) throw new StaffLinkError(l ? 403 : 404, l ? "forbidden" : "not_found", l ? "You cannot do that." : "Request not found.");
    return changeLink(linkId, actor, reason, ["suspended"], "approved", "link_resumed");
  }
  // Boss-level hold/removal: only the tier that approves that boss's staff may act, never on themselves.
  const bossActorOk = (a, bossTier, bossId) => actorOk(a) && BOSS_TIERS.includes(bossTier) && str(bossId) && a.tier === APPROVER_TIER[bossTier] && a.id !== bossId && a.bossId !== bossId;
  const approvedUsersOf = db.prepare("SELECT nexaUserId FROM staff_links WHERE bossTier = ? AND bossId = ? AND status = 'approved'");
  function suspendBoss(bossTier, bossId, actor, reason) {
    const why = cleanWhy(reason);
    if (!bossActorOk(actor, bossTier, bossId)) throw new StaffLinkError(403, "forbidden", "You cannot do that.");
    const t = new Date().toISOString();
    return tx(() => {
      const r = db.prepare("INSERT OR IGNORE INTO staff_boss_holds (bossTier, bossId, reason, heldBy, heldAt) VALUES (?,?,?,?,?)").run(bossTier, bossId, why, actor.id, t);
      if (!r.changes) throw new StaffLinkError(409, "already_held", "That boss is already suspended.");
      audit("boss_suspended", { id: null, nexaUserId: null, bossTier, bossId, unit: null }, actor, why, t);
      return { affectedUserIds: approvedUsersOf.all(bossTier, bossId).map((x) => x.nexaUserId) };
    });
  }
  function restoreBoss(bossTier, bossId, actor, reason) {
    const why = cleanWhy(reason);
    if (!bossActorOk(actor, bossTier, bossId)) throw new StaffLinkError(403, "forbidden", "You cannot do that.");
    const t = new Date().toISOString();
    return tx(() => {
      const r = db.prepare("DELETE FROM staff_boss_holds WHERE bossTier = ? AND bossId = ?").run(bossTier, bossId);
      if (!r.changes) throw new StaffLinkError(409, "not_held", "That boss is not suspended.");
      audit("boss_restored", { id: null, nexaUserId: null, bossTier, bossId, unit: null }, actor, why, t);
      return { restoredUserIds: approvedUsersOf.all(bossTier, bossId).map((x) => x.nexaUserId) };
    });
  }
  function removeBoss(bossTier, bossId, actor, reason) {
    const why = cleanWhy(reason);
    if (!bossActorOk(actor, bossTier, bossId)) throw new StaffLinkError(403, "forbidden", "You cannot do that.");
    const t = new Date().toISOString();
    return tx(() => {
      const rows = db.prepare("SELECT * FROM staff_links WHERE bossTier = ? AND bossId = ? AND status IN ('pending','approved','suspended')").all(bossTier, bossId);
      db.prepare("UPDATE staff_links SET status = 'removed', decisionReason = ?, updatedAt = ? WHERE bossTier = ? AND bossId = ? AND status IN ('pending','approved','suspended')").run(why, t, bossTier, bossId);
      db.prepare("DELETE FROM staff_boss_holds WHERE bossTier = ? AND bossId = ?").run(bossTier, bossId);
      audit("boss_removed", { id: null, nexaUserId: null, bossTier, bossId, unit: null }, actor, why, t);
      for (const r of rows) audit("link_removed", r, actor, why, t);
      return { affectedUserIds: rows.map((x) => x.nexaUserId) };
    });
  }
  const isHeld = db.prepare("SELECT 1 FROM staff_boss_holds WHERE bossTier = ? AND bossId = ?");
  function bossIsHeld(bossTier, bossId) { return !!isHeld.get(bossTier, bossId); }
  const auditByLink = db.prepare("SELECT * FROM staff_link_audit WHERE linkId = ? ORDER BY at, rowid LIMIT 200");
  const auditByBoss = db.prepare("SELECT * FROM staff_link_audit WHERE bossTier = ? AND bossId = ? ORDER BY at, rowid LIMIT 500");
  function auditForLink(linkId) { return str(linkId) ? auditByLink.all(linkId) : []; }
  function auditForBoss(bossTier, bossId) { return BOSS_TIERS.includes(bossTier) && str(bossId) ? auditByBoss.all(bossTier, bossId) : []; }

  // M7784 — move existing vendor staff (vendor_staff table) into staff links. Three steps, none automatic:
  // plan (writes nothing), apply (needs the exact confirm word), rollback (removes only untouched migrated links).
  // vendor_staff itself is never changed, so nobody loses the access they have today. The old 'manager' tier powers
  // (list/invite/remove staff) are not part of a link and keep working through vendor_staff until M7780/M7784 finish.
  const MIGRATION_ACTOR = "system:migration";
  const MIGRATION_REASON = "migrated_from_vendor_staff";
  function planVendorStaffMigration() {
    const rows = db.prepare("SELECT id, vendorId, userId, role, status FROM vendor_staff ORDER BY createdAt, id").all();
    const plan = { wouldCreate: [], alreadyMigrated: [], conflicts: [], skipped: { invited: 0, removed: 0, other: 0 }, notMigrated: { managerPowers: 0 } };
    const activeByUser = new Map();
    for (const r of rows) if (r.status === "active" && str(r.userId)) { if (!activeByUser.has(r.userId)) activeByUser.set(r.userId, []); activeByUser.get(r.userId).push(r); }
    for (const r of rows) {
      if (r.status === "invited") { plan.skipped.invited++; continue; }
      if (r.status === "removed") { plan.skipped.removed++; continue; }
      if (r.status !== "active" || !str(r.userId)) { plan.skipped.other++; continue; }
      const mine = activeByUser.get(r.userId);
      const existing = live.get(r.userId);
      const entry = { vendorStaffId: r.id, nexaUserId: r.userId, vendorId: r.vendorId, role: r.role };
      if (mine.length > 1) { plan.conflicts.push({ ...entry, reason: "staff_of_several_vendors" }); continue; }
      if (existing) {
        if (existing.bossTier === "vendor" && existing.bossId === r.vendorId) plan.alreadyMigrated.push(entry);
        else plan.conflicts.push({ ...entry, reason: "already_has_other_link" });
        continue;
      }
      if (r.role === "manager") plan.notMigrated.managerPowers++;
      plan.wouldCreate.push({ ...entry, unit: "business-hub", permissions: ["orders", "products"] });
    }
    return plan;
  }
  function applyVendorStaffMigration({ confirm } = {}) {
    if (confirm !== "MIGRATE_VENDOR_STAFF") throw new StaffLinkError(400, "confirm_required", "Run the plan first, then pass the confirm word.");
    const plan = planVendorStaffMigration();
    const t = new Date().toISOString();
    tx(() => {
      for (const e of plan.wouldCreate) {
        const rec = buildLinkRecord({ nexaUserId: e.nexaUserId, bossTier: "vendor", bossId: e.vendorId, unit: e.unit, permissions: e.permissions, requestedBy: MIGRATION_ACTOR, requestKey: `migrate:${e.vendorStaffId}` }, { now: () => t });
        ins.run(rec.id, rec.nexaUserId, rec.bossTier, rec.bossId, rec.unit, rec.permissions, "approved", rec.requestedBy, rec.requestKey, MIGRATION_ACTOR, "migration", MIGRATION_REASON, t, t, t);
        audit("migrated", rec, { id: MIGRATION_ACTOR, tier: "migration" }, MIGRATION_REASON, t);
      }
    });
    return { created: plan.wouldCreate.length, conflictsLeftAlone: plan.conflicts.length, alreadyMigrated: plan.alreadyMigrated.length };
  }
  function rollbackVendorStaffMigration({ confirm } = {}) {
    if (confirm !== "ROLLBACK_VENDOR_STAFF_MIGRATION") throw new StaffLinkError(400, "confirm_required", "Pass the confirm word to roll back.");
    const t = new Date().toISOString();
    return tx(() => {
      const mine = db.prepare("SELECT * FROM staff_links WHERE requestedBy = ? AND approverId = ?").all(MIGRATION_ACTOR, MIGRATION_ACTOR);
      let removed = 0, leftAlone = 0;
      for (const l of mine) {
        if (l.status === "approved" && l.decisionReason === MIGRATION_REASON) { db.prepare("DELETE FROM staff_links WHERE id = ?").run(l.id); audit("migration_rolled_back", l, { id: MIGRATION_ACTOR, tier: "migration" }, MIGRATION_REASON, t); removed++; }
        else leftAlone++;
      }
      return { removed, leftAlone };
    });
  }
  const forBoss = db.prepare("SELECT * FROM staff_links WHERE bossTier = ? AND bossId = ? ORDER BY createdAt DESC LIMIT 200");
  // Pending requests this approver tier is allowed to decide (director -> vendor and manager staff). Oldest first.
  function listPendingForApprover(approverTier) {
    const tiers = BOSS_TIERS.filter((t) => APPROVER_TIER[t] === approverTier);
    if (!tiers.length) return [];
    return db.prepare(`SELECT * FROM staff_links WHERE status = 'pending' AND bossTier IN (${tiers.map(() => "?").join(",")}) ORDER BY createdAt ASC LIMIT 200`).all(...tiers);
  }
  function listForBoss(bossTier, bossId) { return str(bossId) && BOSS_TIERS.includes(bossTier) ? forBoss.all(bossTier, bossId) : []; }
  return { createPendingLink, liveLinkFor, decideLink, listPendingForApprover, staffDoorSignIn, authorizeStaffAction, submitUpload, decideUpload, listForBoss, suspendLink, removeLink, resumeLink, suspendBoss, restoreBoss, removeBoss, bossIsHeld, auditForLink, auditForBoss, planVendorStaffMigration, applyVendorStaffMigration, rollbackVendorStaffMigration };
}

module.exports = { PERMISSIONS, UNIT_PERMISSIONS, AUDIT_ACTIONS, AUDIT_SCHEMA_SQL, HOLD_SCHEMA_SQL, UPLOAD_SCHEMA_SQL, StaffLinkError, BOSS_TIERS, APPROVER_TIER, STATUSES, LIVE_STATUSES, UNITS, SCHEMA_SQL, buildLinkRecord, normalizePermissions, createStaffLinks };
