"use strict";
const crypto = require("node:crypto");
function ensureSchema(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS marketplace_investigations (
    id TEXT PRIMARY KEY, orderId TEXT NOT NULL, category TEXT NOT NULL,
    reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', createdBy TEXT NOT NULL,
    requestKey TEXT NOT NULL UNIQUE, createdAt TEXT NOT NULL, resolvedAt TEXT, resolvedBy TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_marketplace_investigations_status_time ON marketplace_investigations(status,createdAt DESC);
  CREATE INDEX IF NOT EXISTS idx_marketplace_investigations_order ON marketplace_investigations(orderId,createdAt DESC);`);
}
function create(db, { orderId, category, reason, actorId, requestKey, genRowId, now = new Date().toISOString() } = {}) {
  const clean = (v, max) => String(v || "").trim().slice(0, max);
  const order = clean(orderId, 100), type = clean(category, 80), note = clean(reason, 500), actor = clean(actorId, 100), key = clean(requestKey, 120);
  if (!order || !type || note.length < 3 || !actor || !/^[A-Za-z0-9._:-]{8,120}$/.test(key)) return { ok: false, status: 400, error: "Provide an order, category, reason of at least 3 characters, and valid requestKey." };
  if (!db.prepare("SELECT 1 FROM mall_orders WHERE id=?").get(order)) return { ok: false, status: 404, error: "Order not found." };
  const prior = db.prepare("SELECT * FROM marketplace_investigations WHERE requestKey=?").get(key);
  if (prior) return { ok: true, duplicate: true, investigation: prior };
  const row = { id: typeof genRowId === "function" ? genRowId("mkinv") : crypto.randomUUID(), orderId: order, category: type, reason: note, status: "open", createdBy: actor, requestKey: key, createdAt: now };
  try {
    db.prepare("INSERT INTO marketplace_investigations(id,orderId,category,reason,status,createdBy,requestKey,createdAt) VALUES(?,?,?,?,?,?,?,?)").run(row.id,row.orderId,row.category,row.reason,row.status,row.createdBy,row.requestKey,row.createdAt);
    return { ok: true, duplicate: false, investigation: row };
  } catch (error) {
    const raced = db.prepare("SELECT * FROM marketplace_investigations WHERE requestKey=?").get(key);
    if (raced) return { ok: true, duplicate: true, investigation: raced };
    throw error;
  }
}
function list(db, { status = "open", limit = 50, offset = 0 } = {}) {
  const valid = ["open", "reviewed", "resolved", "all"];
  const s = valid.includes(String(status)) ? String(status) : "open";
  const n = Math.min(100, Math.max(1, Math.floor(Number(limit) || 50)));
  const o = Math.max(0, Math.floor(Number(offset) || 0));
  const where = s === "all" ? "" : "WHERE status=?";
  const params = s === "all" ? [n,o] : [s,n,o];
  const rows = db.prepare(`SELECT id,orderId,category,reason,status,createdBy,createdAt,resolvedAt,resolvedBy FROM marketplace_investigations ${where} ORDER BY createdAt DESC,id DESC LIMIT ? OFFSET ?`).all(...params);
  return { investigations: rows, limit: n, offset: o, status: s, readOnly: true };
}
module.exports = { ensureSchema, create, list };
