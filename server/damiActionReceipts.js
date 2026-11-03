"use strict";

function record(db, action, status, result = null, error = null) {
  const id = `dar_${require("crypto").randomUUID()}`;
  const completedAt = new Date().toISOString();
  db.prepare(`INSERT INTO ai_action_receipts
    (id,userId,actionId,type,title,summary,status,result,error,createdAt,completedAt)
    VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(
    id,
    action.userId,
    action.id,
    action.type,
    action.title,
    action.summary,
    status,
    result == null ? null : JSON.stringify(result),
    error == null ? null : String(error).slice(0, 1000),
    action.createdAt,
    completedAt,
  );
  return { id, actionId: action.id, type: action.type, title: action.title, status, result, error, createdAt: action.createdAt, completedAt };
}

function list(db, userId, limit = 30) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 30, 100));
  return db.prepare(`SELECT id,actionId,type,title,status,result,error,createdAt,completedAt
    FROM ai_action_receipts WHERE userId=? ORDER BY completedAt DESC LIMIT ${safeLimit}`).all(userId).map(row => ({
      ...row,
      result: row.result ? (() => { try { return JSON.parse(row.result); } catch (_) { return null; } })() : null,
    }));
}

module.exports = { record, list };
