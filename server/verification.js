"use strict";
// Verification (B320): people and vendors ask to be verified; an admin approves or rejects.
// v1 takes written details only. Identity documents and photos are DEFERRED until the owner decides how to store them safely.
const KINDS = ["user", "vendor"];
const MIN_DETAILS = 20;
const MAX_DETAILS = 1000;
const MAX_REASON = 300;

function ensureSchema(db) {
  db.exec(`
CREATE TABLE IF NOT EXISTS verification_requests (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  kind TEXT NOT NULL,
  details TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reason TEXT,
  reviewedBy TEXT,
  reviewedAt TEXT,
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_verification_status ON verification_requests(status, createdAt);
CREATE INDEX IF NOT EXISTS idx_verification_user ON verification_requests(userId, createdAt);
CREATE TABLE IF NOT EXISTS user_verifications (
  userId TEXT NOT NULL,
  kind TEXT NOT NULL,
  verifiedAt TEXT NOT NULL,
  requestId TEXT,
  PRIMARY KEY (userId, kind)
);
`);
}

function register(app, { db, auth, admin, notify }) {
  ensureSchema(db);
  const fail = (res, status, error) => res.status(status).json({ error });
  const ping = (userId, title, body, data) => { try { if (notify && userId) Promise.resolve(notify(userId, title, body, data || { type: "system", screen: "verification", action: "verification" })).catch(() => {}); } catch (_) {} };
  const verifiedMap = (userId) => {
    const m = { user: false, vendor: false };
    for (const r of db.prepare("SELECT kind FROM user_verifications WHERE userId = ?").all(userId)) if (r.kind in m) m[r.kind] = true;
    return m;
  };
  const mineShape = (r) => ({ id: r.id, kind: r.kind, status: r.status, reason: r.status === "rejected" ? r.reason || "" : "", createdAt: r.createdAt, reviewedAt: r.reviewedAt || null });

  app.post("/api/verification/requests", auth.authMiddleware, (req, res) => {
    const b = req.body || {};
    const kind = String(b.kind || "").toLowerCase();
    if (!KINDS.includes(kind)) return fail(res, 400, "Choose what you want verified: your account or your shop.");
    const details = String(b.details || "").trim();
    if (details.length < MIN_DETAILS) return fail(res, 400, `Tell us a little more (at least ${MIN_DETAILS} characters).`);
    if (details.length > MAX_DETAILS) return fail(res, 400, `Keep it under ${MAX_DETAILS} characters.`);
    if (kind === "vendor" && !db.prepare("SELECT 1 FROM vendors WHERE userId = ?").get(req.user.id)) return fail(res, 400, "Create your shop first, then ask for shop verification.");
    if (verifiedMap(req.user.id)[kind]) return fail(res, 409, "You are already verified.");
    if (db.prepare("SELECT 1 FROM verification_requests WHERE userId = ? AND kind = ? AND status = 'pending'").get(req.user.id, kind)) return fail(res, 409, "You already have a request waiting for review.");
    const id = admin.newId();
    const createdAt = new Date().toISOString();
    db.prepare("INSERT INTO verification_requests(id,userId,kind,details,status,createdAt) VALUES(?,?,?,?,?,?)").run(id, req.user.id, kind, details, "pending", createdAt);
    for (const adminId of admin.adminUserIds("verification")) if (adminId !== req.user.id) ping(adminId, "Verification request", `A ${kind === "vendor" ? "shop" : "member"} asked to be verified.`, { type: "system", screen: "admin_verification", action: "admin_verification" });
    res.status(201).json({ request: mineShape({ id, kind, status: "pending", createdAt }) });
  });

  app.get("/api/verification/requests/mine", auth.authMiddleware, (req, res) => {
    const rows = db.prepare("SELECT * FROM verification_requests WHERE userId = ? ORDER BY createdAt DESC LIMIT 20").all(req.user.id);
    res.json({ verified: verifiedMap(req.user.id), requests: rows.map(mineShape) });
  });

  app.get("/api/admin/verification", auth.authMiddleware, admin.require("verification"), (req, res) => {
    const status = ["pending", "approved", "rejected"].includes(String(req.query.status)) ? String(req.query.status) : "pending";
    const kind = KINDS.includes(String(req.query.kind)) ? String(req.query.kind) : null;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const rows = db.prepare(
      `SELECT r.*, u.name AS userName, u.email AS userEmail, v.shopName AS shopName
       FROM verification_requests r JOIN users u ON u.id = r.userId LEFT JOIN vendors v ON v.userId = r.userId
       WHERE r.status = ? AND (? IS NULL OR r.kind = ?) ORDER BY r.createdAt ASC LIMIT ? OFFSET ?`
    ).all(status, kind, kind, limit, offset);
    res.json({ requests: rows.map((r) => ({ id: r.id, kind: r.kind, status: r.status, details: r.details, createdAt: r.createdAt, reason: r.reason || "", reviewedAt: r.reviewedAt || null, user: { id: r.userId, name: r.userName, email: r.userEmail }, shopName: r.kind === "vendor" ? r.shopName || null : null })) });
  });

  app.post("/api/admin/verification/:id/decision", auth.authMiddleware, admin.require("verification"), (req, res) => {
    const r = db.prepare("SELECT * FROM verification_requests WHERE id = ?").get(req.params.id);
    if (!r) return fail(res, 404, "Request not found.");
    if (r.status !== "pending") return fail(res, 409, "This request was already decided.");
    const decision = String((req.body || {}).decision || "").toLowerCase();
    if (!["approve", "reject"].includes(decision)) return fail(res, 400, "Choose approve or reject.");
    const reason = String((req.body || {}).reason || "").trim().slice(0, MAX_REASON);
    if (decision === "reject" && reason.length < 3) return fail(res, 400, "Give a short reason so the person knows what to fix.");
    if (r.userId === req.user.id) return fail(res, 403, "You can't decide your own request.");
    const now = new Date().toISOString();
    const status = decision === "approve" ? "approved" : "rejected";
    db.transaction(() => {
      const changed = db.prepare("UPDATE verification_requests SET status=?, reason=?, reviewedBy=?, reviewedAt=? WHERE id=? AND status='pending'").run(status, reason || null, req.user.id, now, r.id);
      if (!changed.changes) throw Object.assign(new Error("decided"), { decided: true });
      if (decision === "approve") db.prepare("INSERT OR REPLACE INTO user_verifications(userId,kind,verifiedAt,requestId) VALUES(?,?,?,?)").run(r.userId, r.kind, now, r.id);
    })();
    admin.audit(req, `verification_${status}`, "verification_request", r.id, reason || null);
    ping(r.userId, decision === "approve" ? "You're verified" : "Verification not approved", decision === "approve" ? "Your verification was approved." : `Your request was not approved: ${reason}`);
    res.json({ ok: true, status });
  });
}

module.exports = { register, ensureSchema, KINDS, MIN_DETAILS, MAX_DETAILS };
