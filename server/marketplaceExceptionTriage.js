"use strict";
const crypto = require("node:crypto");
const CATEGORIES = Object.freeze(["delivery", "cancellation", "inventory", "refund", "payout", "dispute", "seller_suspension", "order_integrity", "general"]);
const SOURCES = Object.freeze(["order_event", "delivery_event", "refund_record", "payout_record", "dispute_record", "seller_status", "inventory_diagnostic", "admin_report", "system_diagnostic"]);
const ACTOR_ROLES = Object.freeze(["system", "admin", "staff", "buyer", "seller", "unknown"]);
const STATUSES = Object.freeze(["open", "acknowledged", "reviewing", "resolved", "closed"]);
const TERMINAL = new Set(["resolved", "closed"]);
const CATEGORY_EVIDENCE = Object.freeze({
  delivery: ["delivery event or carrier reference"], cancellation: ["order cancellation state"],
  inventory: ["order item or inventory diagnostic reference"], refund: ["refund record reference", "source currency when amount is present"],
  payout: ["Main-owned source record, if one exists"], dispute: ["dispute record reference", "resolution outcome when terminal"],
  seller_suspension: ["seller status source reference", "reason or provenance"], order_integrity: ["order source reference"], general: ["specific source evidence"]
});
const SLA_MINUTES = Object.freeze({ delivery: 240, cancellation: 240, inventory: 240, refund: 60, payout: 60, dispute: 240, seller_suspension: 60, order_integrity: 60, general: 1440 });
const TRANSITIONS = Object.freeze({ open: ["acknowledged", "reviewing", "resolved", "closed"], acknowledged: ["reviewing", "resolved", "closed"], reviewing: ["acknowledged", "resolved", "closed"], resolved: [], closed: [] });
const clean = (value, max = 180) => String(value ?? "").trim().slice(0, max);
function normalizeActorRole(value) { const role = clean(value, 24).toLowerCase(); return ACTOR_ROLES.includes(role) ? role : "unknown"; }
function evidenceCompleteness(row = {}) {
  const missing = [];
  const category = clean(row.category, 40);
  const categoryEvidenceRequired = CATEGORY_EVIDENCE[category] || ["specific source evidence"];
  if (!clean(row.orderId, 100)) missing.push("orderId");
  if (!CATEGORIES.includes(clean(row.category, 40))) missing.push("category");
  if (!SOURCES.includes(clean(row.sourceType, 40))) missing.push("sourceType");
  if (!clean(row.sourceId, 120)) missing.push("sourceId");
  if (!clean(row.summary, 500)) missing.push("summary");
  if (!clean(row.createdAt, 40) || !Number.isFinite(Date.parse(row.createdAt))) missing.push("createdAt");
  let evidence = Array.isArray(row.evidence) ? row.evidence : [];
  if (!evidence.length && row.evidenceJson) { try { const parsed = JSON.parse(row.evidenceJson); if (Array.isArray(parsed)) evidence = parsed; } catch (_) {} }
  if (!evidence.some((entry) => clean(entry, 160))) missing.push("evidence");
  if (category === "dispute" && ["resolved", "closed", "refunded"].includes(clean(row.status, 40).toLowerCase()) && !clean(row.resolution, 500)) missing.push("resolution");
  return { complete: missing.length === 0, missing, categoryEvidenceRequired };
}
function ageMinutes(createdAt, now = new Date().toISOString()) {
  const created = Date.parse(createdAt || ""), current = Date.parse(now || "");
  return Number.isFinite(created) && Number.isFinite(current) ? Math.max(0, Math.floor((current - created) / 60000)) : null;
}
function normalizeException(row = {}) {
  const status = STATUSES.includes(clean(row.status, 30)) ? clean(row.status, 30) : "unknown";
  const evidence = evidenceCompleteness(row);
  return {
    id: clean(row.id, 100), orderId: clean(row.orderId, 100), category: CATEGORIES.includes(clean(row.category, 40)) ? clean(row.category, 40) : "unknown",
    sourceType: SOURCES.includes(clean(row.sourceType, 40)) ? clean(row.sourceType, 40) : "unknown", sourceId: clean(row.sourceId, 120),
    actorRole: normalizeActorRole(row.actorRole), summary: clean(row.summary, 500), status, evidenceComplete: row.evidenceComplete == null ? evidence.complete : Number(row.evidenceComplete) === 1,
    missingEvidence: evidence.missing, categoryEvidenceRequired: evidence.categoryEvidenceRequired,
    evidence: (() => { let values = Array.isArray(row.evidence) ? row.evidence : []; if (!values.length && row.evidenceJson) { try { const parsed = JSON.parse(row.evidenceJson); if (Array.isArray(parsed)) values = parsed; } catch (_) {} } return values.slice(0, 20).map((entry) => clean(entry, 160)).filter(Boolean); })(),
    createdAt: clean(row.createdAt, 40), updatedAt: clean(row.updatedAt, 40), resolvedAt: row.resolvedAt ? clean(row.resolvedAt, 40) : null,
    ageMinutes: ageMinutes(row.createdAt, new Date().toISOString()), slaMinutes: SLA_MINUTES[clean(row.category, 40)] || SLA_MINUTES.general,
    escalationOverdue: ageMinutes(row.createdAt, row.updatedAt) > (SLA_MINUTES[clean(row.category, 40)] || SLA_MINUTES.general) && !TERMINAL.has(status),
    resolvedBy: row.resolvedBy ? clean(row.resolvedBy, 100) : null, terminal: TERMINAL.has(status), version: Number.isSafeInteger(Number(row.version)) ? Number(row.version) : 0,
  };
}
function ensureSchema(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS marketplace_exceptions (
    id TEXT PRIMARY KEY, orderId TEXT NOT NULL, category TEXT NOT NULL, sourceType TEXT NOT NULL, sourceId TEXT NOT NULL,
    actorId TEXT NOT NULL, actorRole TEXT NOT NULL DEFAULT 'unknown', summary TEXT NOT NULL, evidenceJson TEXT NOT NULL DEFAULT '[]',
    evidenceComplete INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'open', requestKey TEXT NOT NULL UNIQUE,
    createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, resolvedAt TEXT, resolvedBy TEXT, acknowledgedAt TEXT, acknowledgedBy TEXT,
    terminalAt TEXT, version INTEGER NOT NULL DEFAULT 1
  );
  CREATE INDEX IF NOT EXISTS idx_marketplace_exceptions_status_updated ON marketplace_exceptions(status, updatedAt DESC, id DESC);
  CREATE INDEX IF NOT EXISTS idx_marketplace_exceptions_order ON marketplace_exceptions(orderId, createdAt DESC, id DESC);
  CREATE INDEX IF NOT EXISTS idx_marketplace_exceptions_source ON marketplace_exceptions(sourceType, sourceId);`);
  ensureTriageSchema(db);
}
function create(db, input = {}) {
  const orderId = clean(input.orderId, 100), category = clean(input.category, 40), sourceType = clean(input.sourceType, 40), sourceId = clean(input.sourceId, 120);
  const actorId = clean(input.actorId, 100), actorRole = normalizeActorRole(input.actorRole), summary = clean(input.summary, 500), requestKey = clean(input.requestKey, 120);
  const now = clean(input.now || new Date().toISOString(), 40);
  if (!orderId || !CATEGORIES.includes(category) || !SOURCES.includes(sourceType) || !sourceId || !actorId || summary.length < 3 || !/^[A-Za-z0-9._:-]{8,120}$/.test(requestKey) || !Number.isFinite(Date.parse(now))) return { ok: false, status: 400, error: "Required exception provenance is missing or invalid." };
  if (!db.prepare("SELECT 1 FROM mall_orders WHERE id=?").get(orderId)) return { ok: false, status: 404, error: "Order not found." };
  const prior = db.prepare("SELECT * FROM marketplace_exceptions WHERE requestKey=?").get(requestKey);
  if (prior) {
    const sameSource = String(prior.orderId) === orderId && String(prior.category) === category && String(prior.sourceType) === sourceType && String(prior.sourceId) === sourceId;
    if (!sameSource) return { ok: false, status: 409, conflict: { code: "request_key_reused", reason: "source_or_case_mismatch" }, error: "Request key was already used for a different exception source." };
    return { ok: true, duplicate: true, exception: normalizeException(prior) };
  }
  const evidence = Array.isArray(input.evidence) ? input.evidence.slice(0, 20).map((v) => clean(v, 160)).filter(Boolean) : [];
  const base = { orderId, category, sourceType, sourceId, summary, createdAt: now, evidence };
  const completeness = evidenceCompleteness(base);
  const row = { id: clean(typeof input.genRowId === "function" ? input.genRowId("mkexc") : crypto.randomUUID(), 100), ...base, actorId, actorRole, evidenceJson: JSON.stringify(evidence), evidenceComplete: completeness.complete ? 1 : 0, status: "open", requestKey, updatedAt: now, version: 1 };
  try {
    db.prepare(`INSERT INTO marketplace_exceptions(id,orderId,category,sourceType,sourceId,actorId,actorRole,summary,evidenceJson,evidenceComplete,status,requestKey,createdAt,updatedAt,version) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(row.id,row.orderId,row.category,row.sourceType,row.sourceId,row.actorId,row.actorRole,row.summary,row.evidenceJson,row.evidenceComplete,row.status,row.requestKey,row.createdAt,row.updatedAt,row.version);
    return { ok: true, duplicate: false, exception: normalizeException(row) };
  } catch (error) {
    const raced = db.prepare("SELECT * FROM marketplace_exceptions WHERE requestKey=?").get(requestKey);
    if (raced) return { ok: true, duplicate: true, exception: normalizeException(raced) };
    throw error;
  }
}
function transition(db, { id, action, actorId, requestKey, expectedVersion, now = new Date().toISOString() } = {}) {
  const caseId = clean(id, 100), actor = clean(actorId, 100), key = clean(requestKey, 120), target = clean(action, 30);
  if (!caseId || !actor || !/^[A-Za-z0-9._:-]{8,120}$/.test(key) || !STATUSES.includes(target) || !Number.isFinite(Date.parse(now))) return { ok: false, status: 400, error: "Invalid triage transition request." };
  const replay = db.prepare("SELECT * FROM marketplace_exception_triage_events WHERE requestKey=?").get(key);
  if (replay) {
    if (String(replay.exceptionId) !== caseId || String(replay.toStatus) !== target) return { ok: false, status: 409, conflict: { code: "request_key_reused", reason: "case_or_action_mismatch" }, error: "Request key was already used for a different triage action." };
    const current = db.prepare("SELECT * FROM marketplace_exceptions WHERE id=?").get(caseId);
    return current ? { ok: true, duplicate: true, exception: normalizeException(current) } : { ok: false, status: 404, error: "Exception not found." };
  }
  const current = db.prepare("SELECT * FROM marketplace_exceptions WHERE id=?").get(caseId);
  if (!current) return { ok: false, status: 404, error: "Exception not found." };
  if (TERMINAL.has(current.status)) return { ok: false, status: 409, conflict: { code: "terminal_record", currentStatus: current.status, currentVersion: Number(current.version) }, error: "Terminal exception records cannot be changed." };
  if (expectedVersion != null && Number(expectedVersion) !== Number(current.version)) return { ok: false, status: 409, conflict: { code: "stale_version", expectedVersion: Number(expectedVersion), currentVersion: Number(current.version) }, error: "Exception changed; refresh before retrying." };
  if (!(TRANSITIONS[current.status] || []).includes(target)) return { ok: false, status: 409, conflict: { code: "invalid_transition", currentStatus: current.status, targetStatus: target }, error: "Invalid exception status transition." };
  const resolvedAt = target === "resolved" ? now : current.resolvedAt;
  const terminalAt = TERMINAL.has(target) ? now : current.terminalAt;
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = db.prepare("UPDATE marketplace_exceptions SET status=?,updatedAt=?,resolvedAt=?,resolvedBy=?,acknowledgedAt=CASE WHEN ?='acknowledged' AND acknowledgedAt IS NULL THEN ? ELSE acknowledgedAt END,acknowledgedBy=CASE WHEN ?='acknowledged' AND acknowledgedBy IS NULL THEN ? ELSE acknowledgedBy END,terminalAt=?,version=version+1 WHERE id=? AND version=? AND status NOT IN ('resolved','closed')").run(target,now,resolvedAt,target === "resolved" ? actor : current.resolvedBy,target,now,target,actor,terminalAt,caseId,current.version);
    if (!result.changes) { db.exec("ROLLBACK"); return { ok: false, status: 409, error: "Exception changed or became terminal; refresh before retrying." }; }
    db.prepare("INSERT INTO marketplace_exception_triage_events(id,exceptionId,fromStatus,toStatus,actorId,requestKey,createdAt) VALUES(?,?,?,?,?,?,?)").run(crypto.randomUUID(),caseId,current.status,target,actor,key,now);
    db.exec("COMMIT");
  } catch (error) { try { db.exec("ROLLBACK"); } catch (_) {} throw error; }
  return { ok: true, duplicate: false, exception: normalizeException(db.prepare("SELECT * FROM marketplace_exceptions WHERE id=?").get(caseId)) };
}
function ensureTriageSchema(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS marketplace_exception_triage_events (id TEXT PRIMARY KEY, exceptionId TEXT NOT NULL, fromStatus TEXT NOT NULL, toStatus TEXT NOT NULL, actorId TEXT NOT NULL, requestKey TEXT NOT NULL UNIQUE, createdAt TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS idx_marketplace_exception_triage_case ON marketplace_exception_triage_events(exceptionId, createdAt, id);`);
}
function list(db, { status = "all", category = "all", q = "", limit = 25, offset = 0 } = {}) {
  const allowed = [...STATUSES, "all"];
  const selected = allowed.includes(clean(status, 30)) ? clean(status, 30) : "all";
  const n = Math.min(100, Math.max(1, Math.floor(Number(limit) || 25))), o = Math.min(100000, Math.max(0, Math.floor(Number(offset) || 0)));
  const selectedCategory = [...CATEGORIES, "all"].includes(clean(category, 40)) ? clean(category, 40) : "all";
  const search = clean(q, 120).replace(/[\\%_]/g, "");
  const clauses = [], params = [];
  if (selected !== "all") { clauses.push("status=?"); params.push(selected); }
  if (selectedCategory !== "all") { clauses.push("category=?"); params.push(selectedCategory); }
  if (search) { clauses.push("(orderId LIKE ? OR category LIKE ? OR sourceType LIKE ? OR sourceId LIKE ? OR summary LIKE ?)"); for (let i = 0; i < 5; i++) params.push(`%${search}%`); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = db.prepare(`SELECT * FROM marketplace_exceptions ${where} ORDER BY updatedAt DESC,id DESC LIMIT ? OFFSET ?`).all(...params,n,o).map((row) => ({ ...normalizeException(row), eventHistory: triageHistory(db, row.id, 10), sourceRecord: sourceRecordExists(db, row) }));
  const total = db.prepare(`SELECT COUNT(*) AS count FROM marketplace_exceptions ${where}`).get(...params).count;
  const counts = Object.fromEntries(CATEGORIES.map((name) => [name, Number(db.prepare("SELECT COUNT(*) AS count FROM marketplace_exceptions WHERE category=?").get(name)?.count || 0)]));
  return { exceptions: rows.map((row) => ({ ...row, assignmentLineage: null, noteHistoryStatus: "not_supplied_by_main", auditRetentionStatus: auditRetentionReadiness(db) })), total, countsByCategory: counts, limit: n, offset: o, status: selected, category: selectedCategory, query: search, readOnly: true, authority: "main", providerCalls: false, mutationsPerformed: false };
}
function diagnostics({ orders = [], events = [], disputes = [], refunds = [], payoutHolds = null, orderItems = [] } = {}) {
  const safeOrders = Array.isArray(orders) ? orders : [];
  const ids = new Set(safeOrders.map((o) => clean(o.id, 100)).filter(Boolean));
  const orphanEvents = (Array.isArray(events) ? events : []).filter((e) => !ids.has(clean(e.orderId, 100))).length;
  const orphanDisputes = (Array.isArray(disputes) ? disputes : []).filter((d) => !ids.has(clean(d.orderId, 100))).length;
  const orphanRefunds = (Array.isArray(refunds) ? refunds : []).filter((r) => !ids.has(clean(r.orderId, 100))).length;
  const refundKeys = new Set(); let duplicateRefunds = 0;
  for (const refund of Array.isArray(refunds) ? refunds : []) { const key = clean(refund.reference || refund.id, 120); if (key && refundKeys.has(key)) duplicateRefunds++; else if (key) refundKeys.add(key); }
  const resolvedDisputesMissingDecision = (Array.isArray(disputes) ? disputes : []).filter((d) => ["resolved", "closed", "refunded"].includes(clean(d.status, 40).toLowerCase()) && !clean(d.resolution, 500)).length;
  const cancelledIds = new Set(safeOrders.filter((o) => clean(o.status, 40).toLowerCase() === "cancelled").map((o) => clean(o.id, 100)));
  const cancellationInventoryReview = (Array.isArray(orderItems) ? orderItems : []).filter((item) => cancelledIds.has(clean(item.orderId, 100)) && !["cancelled", "rejected", "returned"].includes(clean(item.status, 40).toLowerCase())).length;
  const refundCurrencyIntegrity = (Array.isArray(refunds) ? refunds : []).filter((r) => {
    const currency = clean(r.currency, 3), amount = Number(r.amount);
    return !/^[A-Z]{3}$/.test(currency) || !Number.isFinite(amount) || amount < 0;
  }).length;
  const heldPayouts = (Array.isArray(payoutHolds) ? payoutHolds : []).filter((p) => ["held", "review_required"].includes(clean(p.status, 40))).length;
  const reviewCount = orphanEvents + orphanDisputes + orphanRefunds + duplicateRefunds + resolvedDisputesMissingDecision + cancellationInventoryReview + refundCurrencyIntegrity;
  return { orphanEvents, orphanDisputes, orphanRefunds, duplicateRefunds, resolvedDisputesMissingDecision, cancellationInventoryReview, refundCurrencyIntegrity, disputeResolutionActorLineage: "unavailable_without_canonical_actor_field", heldPayouts, payoutHoldRecordsSupplied: Array.isArray(payoutHolds), requiresReview: reviewCount > 0, providerCalls: false, mutationsPerformed: false };
}
function actorRoleForEvent(event, { buyerId, sellerIds = [] } = {}) {
  const actor = clean(event?.actorId, 100);
  if (!actor) return "unknown";
  if (buyerId && actor === String(buyerId)) return "buyer";
  if (Array.isArray(sellerIds) && sellerIds.some((id) => String(id) === actor)) return "seller";
  return "unknown";
}
function auditRetentionReadiness(db) {
  try {
    const row = db.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN createdAt IS NULL OR createdAt='' OR julianday(createdAt) IS NULL THEN 1 ELSE 0 END) AS invalidTimestamps FROM marketplace_exception_triage_events").get() || {};
    return { available: true, totalEvents: Number(row.total) || 0, invalidTimestamps: Number(row.invalidTimestamps) || 0, retentionPolicy: "not_configured_no_auto_purge", purgePerformed: false };
  } catch (_) { return { available: false, reason: "audit_source_unavailable", retentionPolicy: "unknown", purgePerformed: false }; }
}
function triageHistory(db, exceptionId, limit = 50) {
  const id = clean(exceptionId, 100); if (!id) return [];
  const n = Math.min(100, Math.max(1, Math.floor(Number(limit) || 50)));
  return db.prepare("SELECT exceptionId,fromStatus,toStatus,createdAt FROM marketplace_exception_triage_events WHERE exceptionId=? ORDER BY createdAt DESC,id DESC LIMIT ?").all(id, n).map((event) => ({ exceptionId: clean(event.exceptionId,100), fromStatus: clean(event.fromStatus,30), toStatus: clean(event.toStatus,30), createdAt: clean(event.createdAt,40) }));
}
function sourceRecordExists(db, row = {}) {
  const sourceType = clean(row.sourceType, 40), sourceId = clean(row.sourceId, 120), orderId = clean(row.orderId, 100);
  if (!sourceType || !sourceId) return { available: false, exists: null, reason: "source_lineage_missing" };
  const tables = { order_event: ["mall_order_events", "id"], delivery_event: ["mall_delivery_events", "id"], refund_record: ["mall_refunds", "id"], dispute_record: ["mall_disputes", "id"], seller_status: ["mall_sellers", "id"] };
  const target = tables[sourceType];
  if (!target) return { available: false, exists: null, reason: "source_type_not_mapped" };
  try { const exists = !!db.prepare(`SELECT 1 FROM ${target[0]} WHERE ${target[1]}=? LIMIT 1`).get(sourceId); return { available: true, exists, reason: exists ? "source_record_found" : "source_record_missing", orderIdPresent: !!orderId }; }
  catch (_) { return { available: false, exists: null, reason: "source_table_unavailable" }; }
}
module.exports = { CATEGORIES, SOURCES, ACTOR_ROLES, STATUSES, TERMINAL, TRANSITIONS, CATEGORY_EVIDENCE, SLA_MINUTES, normalizeActorRole, evidenceCompleteness, normalizeException, ensureSchema, ensureTriageSchema, create, transition, list, diagnostics, actorRoleForEvent, triageHistory, sourceRecordExists, ageMinutes, auditRetentionReadiness };
