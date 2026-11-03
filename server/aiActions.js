"use strict";

// V4.17: consequential AI actions are proposed first, then explicitly confirmed.
// Confirmation state is persisted so a process restart or multi-instance deployment cannot
// silently lose/duplicate a pending action.
const crypto = require("crypto");
const TTL_MS = 5 * 60 * 1000;
const ACTIONS = new Set(["cancel_order", "settle_debt", "send_friend_request", "unfriend", "block_user"]);

function normalizeProposal(raw) {
  if (!raw || typeof raw !== "object") return null;
  const type = String(raw.type || "");
  if (!ACTIONS.has(type)) return null;
  const payload = raw.payload && typeof raw.payload === "object" ? raw.payload : {};
  const labels = {
    cancel_order: "Cancel Dream Marketplace order",
    settle_debt: "Mark debt as settled",
    send_friend_request: "Send friend request",
    unfriend: "Remove friend",
    block_user: "Block user",
  };
  return {
    type,
    payload,
    title: String(raw.title || labels[type]),
    summary: String(raw.summary || "This action will change your NEXA account data."),
  };
}

function clean(db) {
  db.prepare("DELETE FROM ai_action_confirmations WHERE expiresAt <= ? OR consumedAt IS NOT NULL").run(new Date().toISOString());
}

function createPending(db, userId, proposal) {
  clean(db);
  const normalized = normalizeProposal(proposal);
  if (!normalized) return null;
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString();
  db.prepare(`INSERT INTO ai_action_confirmations
    (id,userId,type,payload,title,summary,createdAt,expiresAt,consumedAt)
    VALUES(?,?,?,?,?,?,?,?,NULL)`).run(
      id, userId, normalized.type, JSON.stringify(normalized.payload), normalized.title,
      normalized.summary, createdAt, expiresAt
    );
  return { id, type: normalized.type, title: normalized.title, summary: normalized.summary, payload: normalized.payload, expiresAt };
}

function consume(db, userId, id) {
  clean(db);
  const row = db.prepare("SELECT * FROM ai_action_confirmations WHERE id = ? AND userId = ? AND consumedAt IS NULL AND expiresAt > ?")
    .get(String(id || ""), userId, new Date().toISOString());
  if (!row) return null;
  const changed = db.prepare("UPDATE ai_action_confirmations SET consumedAt = ? WHERE id = ? AND userId = ? AND consumedAt IS NULL AND expiresAt > ?")
    .run(new Date().toISOString(), row.id, userId, new Date().toISOString());
  if (!changed.changes) return null;
  let payload = {};
  try { payload = JSON.parse(row.payload || "{}"); } catch (_) {}
  return { id: row.id, userId: row.userId, type: row.type, title: row.title, summary: row.summary, payload, createdAt: row.createdAt, expiresAt: new Date(row.expiresAt).getTime() };
}

module.exports = { ACTIONS, normalizeProposal, createPending, consume };
