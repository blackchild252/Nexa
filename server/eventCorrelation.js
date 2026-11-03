"use strict";
const crypto = require("node:crypto");
const { AsyncLocalStorage } = require("node:async_hooks");
const requestContext = new AsyncLocalStorage();

const MAX_ACTION = 80;
const MAX_METADATA = 4096;
const SEVERITIES = Object.freeze(["info", "warning", "error", "critical"]);

const SECRET_KEY = /password|passwd|secret|token|authorization|cookie|keyhash|api[-_]?key|private[-_]?key|credential|recovery[-_]?proof|otp/i;
const MAX_DEPTH = 3;
const MAX_KEYS = 30;

// Bounded, JSON-safe copy: secret-looking keys are dropped at every level, depth and width are capped,
// and values that cannot be stored (BigInt, functions, loops) never reach JSON.stringify.
function boundValue(value, depth) {
  if (value == null || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") return value.slice(0, 500);
  if (typeof value === "bigint") return String(value).slice(0, 40);
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof value !== "object") return undefined;
  if (depth >= MAX_DEPTH) return "[TRUNCATED]";
  if (Array.isArray(value)) return value.slice(0, MAX_KEYS).map((item) => { const v = boundValue(item, depth + 1); return v === undefined ? null : v; });
  const out = {};
  for (const key of Object.keys(value).slice(0, MAX_KEYS)) {
    if (SECRET_KEY.test(key)) continue;
    const v = boundValue(value[key], depth + 1);
    if (v !== undefined) out[String(key).slice(0, 80)] = v;
  }
  return out;
}

function normalizeMetadata(metadata = {}) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  try {
    const safe = boundValue(metadata, 0);
    const encoded = JSON.stringify(safe);
    return encoded.length <= MAX_METADATA ? safe : { truncated: true };
  } catch (_) {
    return { truncated: true };
  }
}

function runWithRequestId(requestId, fn) { return requestContext.run(String(requestId || ""), fn); }
function currentRequestId() { return requestContext.getStore() || null; }

function createEvent({ requestId, userId = null, action, entityType = null, entityId = null, severity = "info", metadata = {} }) {
  const normalizedAction = String(action || "").trim();
  if (!normalizedAction || normalizedAction.length > MAX_ACTION) throw new Error("Event action is required and must be bounded.");
  return {
    id: `evt_${crypto.randomBytes(12).toString("hex")}`,
    requestId: String(requestId || currentRequestId() || "").trim().slice(0, 100) || crypto.randomUUID(),
    userId: userId == null ? null : String(userId),
    action: normalizedAction,
    severity: SEVERITIES.includes(String(severity)) ? String(severity) : "info",
    entityType: entityType == null ? null : String(entityType).slice(0, 80),
    entityId: entityId == null ? null : String(entityId).slice(0, 160),
    metadata: normalizeMetadata(metadata),
    createdAt: new Date().toISOString(),
  };
}

function record(db, event) {
  db.prepare(`INSERT INTO platform_event_log(id,requestId,userId,action,entityType,entityId,metadata,createdAt,severity)
    VALUES(?,?,?,?,?,?,?,?,?)`).run(event.id, event.requestId, event.userId, event.action, event.entityType, event.entityId, JSON.stringify(event.metadata), event.createdAt, event.severity);
  return event;
}

function listByRequest(db, requestId, limit = 100) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 100);
  return db.prepare(`SELECT id,requestId,userId,action,entityType,entityId,metadata,createdAt,severity
    FROM platform_event_log WHERE requestId=? ORDER BY createdAt ASC LIMIT ?`).all(String(requestId), safeLimit).map(parseRow);
}

function parseRow(row) {
  let metadata = {};
  try { metadata = JSON.parse(row.metadata || "{}"); } catch (_) {}
  return { ...row, metadata };
}

module.exports = { normalizeMetadata, runWithRequestId, currentRequestId, createEvent, record, listByRequest, parseRow };
