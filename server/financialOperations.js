"use strict";

const crypto = require("crypto");
const paymentAttention = require("./paymentAttention");
const { createFxProvider } = require("./currencyModel");

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;
const EXCEPTION_CATEGORIES = Object.freeze({
  missing_ledger_entry: "A completed transaction has no canonical ledger entry.",
  unexpected_ledger_entry: "A non-completed transaction has a ledger entry.",
  duplicate_provider_reference: "Multiple wallet transactions share one external provider reference.",
  missing_provider_reference: "An external deposit or withdrawal has no provider reference.",
  stale_pending_payment: "A payment has remained pending beyond the review threshold.",
  stale_pending_withdrawal: "A withdrawal has remained pending beyond the review threshold.",
});

function clampInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}
function safeText(value, max = 240) { return String(value ?? "").trim().slice(0, max); }
function runInTransaction(db, fn) {
  if (typeof db.transaction === "function") return db.transaction(fn)();
  db.exec("BEGIN IMMEDIATE");
  try { const result = fn(); db.exec("COMMIT"); return result; }
  catch (error) { try { db.exec("ROLLBACK"); } catch (_) {} throw error; }
}
function ensureSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS wallet_reconciliation_runs (
      id TEXT PRIMARY KEY, runAt TEXT NOT NULL, providerStatus TEXT NOT NULL,
      transactionCount INTEGER NOT NULL, ledgerExceptionCount INTEGER NOT NULL,
      paymentAttentionCount INTEGER NOT NULL, summaryJson TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS wallet_reconciliation_exceptions (
      id TEXT PRIMARY KEY, source TEXT NOT NULL, sourceId TEXT NOT NULL, reference TEXT,
      category TEXT NOT NULL, severity TEXT NOT NULL DEFAULT 'warning', status TEXT NOT NULL DEFAULT 'open',
      detailsJson TEXT NOT NULL DEFAULT '{}', firstSeenAt TEXT NOT NULL, lastSeenAt TEXT NOT NULL,
      resolvedAt TEXT, resolutionReason TEXT, resolvedBy TEXT, runId TEXT,
      assignedTo TEXT, assignedAt TEXT, assignmentReason TEXT,
      UNIQUE(source, sourceId, category)
    );
    CREATE INDEX IF NOT EXISTS idx_wallet_recon_exception_status_time ON wallet_reconciliation_exceptions(status,lastSeenAt DESC);
    CREATE INDEX IF NOT EXISTS idx_wallet_recon_exception_reference ON wallet_reconciliation_exceptions(reference);
    CREATE TABLE IF NOT EXISTS wallet_reconciliation_audit (
      id TEXT PRIMARY KEY, exceptionId TEXT NOT NULL, actorId TEXT NOT NULL,
      actorRole TEXT NOT NULL, action TEXT NOT NULL, reason TEXT NOT NULL, createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_wallet_recon_audit_exception_time ON wallet_reconciliation_audit(exceptionId,createdAt DESC);
  `);
  const columns = new Set(db.prepare("PRAGMA table_info(wallet_reconciliation_exceptions)").all().map((column) => column.name));
  if (!columns.has("assignedTo")) db.exec("ALTER TABLE wallet_reconciliation_exceptions ADD COLUMN assignedTo TEXT");
  if (!columns.has("assignedAt")) db.exec("ALTER TABLE wallet_reconciliation_exceptions ADD COLUMN assignedAt TEXT");
  if (!columns.has("assignmentReason")) db.exec("ALTER TABLE wallet_reconciliation_exceptions ADD COLUMN assignmentReason TEXT");
}
function transactionFindings(tx, ledger, nowMs, pendingThresholdMs) {
  const findings = [];
  const count = Number(ledger?.entryCount || 0);
  if (tx.status === "completed" && count === 0) findings.push("missing_ledger_entry");
  if (tx.status !== "completed" && count > 0) findings.push("unexpected_ledger_entry");
  const age = nowMs - Date.parse(tx.createdAt || "");
  if (tx.status === "pending" && Number.isFinite(age) && age >= pendingThresholdMs) {
    findings.push(tx.type === "withdrawal" ? "stale_pending_withdrawal" : "stale_pending_payment");
  }
  if (tx.source !== "internal" && ["deposit", "withdrawal"].includes(tx.type) && tx.status === "completed" && !String(tx.providerReference || "").trim()) {
    findings.push("missing_provider_reference");
  }
  return findings;
}
function severityFor(category) {
  return ["missing_ledger_entry", "unexpected_ledger_entry", "duplicate_provider_reference", "amount_or_status_mismatch", "paid_after_cancellation", "refund_failed"].includes(category) ? "critical" : "warning";
}
function upsertException(db, finding, nowIso, runId) {
  const id = crypto.createHash("sha256").update(`${finding.source}\0${finding.sourceId}\0${finding.category}`).digest("hex").slice(0, 32);
  const detailsJson = JSON.stringify(finding.details || {});
  db.prepare(`INSERT INTO wallet_reconciliation_exceptions
    (id,source,sourceId,reference,category,severity,status,detailsJson,firstSeenAt,lastSeenAt,runId)
    VALUES(?,?,?,?,?,?,'open',?,?,?,?)
    ON CONFLICT(source,sourceId,category) DO UPDATE SET
      reference=excluded.reference, severity=excluded.severity, detailsJson=excluded.detailsJson,
      lastSeenAt=excluded.lastSeenAt, runId=excluded.runId
    WHERE wallet_reconciliation_exceptions.status IN ('open','assigned')`)
    .run(id, finding.source, finding.sourceId, finding.reference || null, finding.category, finding.severity || severityFor(finding.category), detailsJson, nowIso, nowIso, runId);
  return id;
}
function providerSummary(providerState = {}) {
  const mode = safeText(providerState.mode || "unknown", 30).toLowerCase();
  const status = safeText(providerState.status || "not_connected", 40).toLowerCase();
  const sandbox = mode === "sandbox" || status === "sandbox";
  const connected = status === "healthy" && providerState.ready === true && providerState.realFunds === true;
  return {
    status: sandbox ? "sandbox_simulation_only" : connected ? "connected" : "not_connected",
    mode: mode || "unknown", recordsCompared: 0,
    note: "No external provider transaction feed is registered; provider-side comparison is not performed. Local findings are not evidence of provider settlement.",
  };
}
function fxQuoteReadiness() {
  const provider = createFxProvider();
  const configured = provider.configured === true;
  return {
    status: configured ? "configured_unverified" : "not_connected",
    quoteAvailable: false,
    conversionAvailable: false,
    authority: "Main",
    note: configured
      ? "An FX adapter is registered, but a fresh verified quote has not been confirmed by this summary. Do not treat conversion as available."
      : "No FX quote adapter is registered. Quotes and cross-currency conversion are unavailable; Admin must not infer or calculate a rate.",
  };
}
function reconcile(db, options = {}) {
  ensureSchema(db);
  const now = options.now instanceof Date ? options.now : new Date();
  const nowMs = now.getTime(); const nowIso = now.toISOString();
  const pendingThresholdMinutes = clampInt(options.pendingThresholdMinutes, 15, 1, 7 * 24 * 60);
  const pendingThresholdMs = pendingThresholdMinutes * 60000;
  const runId = crypto.randomUUID();
  const txRows = db.prepare(`SELECT t.id,t.type,t.direction,t.amountMinor,t.currency,t.status,t.source,t.reference,t.providerReference,t.createdAt,t.completedAt,
      COUNT(l.id) AS entryCount, COALESCE(SUM(l.amountMinor),0) AS ledgerAmountMinor,
      COUNT(DISTINCT l.currency) AS ledgerCurrencyCount, MIN(l.currency) AS ledgerCurrency
    FROM wallet_transactions t LEFT JOIN wallet_ledger_entries l ON l.transactionId=t.id
    GROUP BY t.id ORDER BY t.createdAt DESC`).all();
  const providerRefs = new Map();
  for (const tx of txRows) {
    if (tx.source === "internal" || !String(tx.providerReference || "").trim()) continue;
    const key = String(tx.providerReference).trim();
    providerRefs.set(key, (providerRefs.get(key) || 0) + 1);
  }
  const findings = [];
  for (const tx of txRows) {
    const ledger = { entryCount: tx.entryCount };
    for (const category of transactionFindings(tx, ledger, nowMs, pendingThresholdMs)) {
      findings.push({ source: "wallet_transaction", sourceId: tx.id, reference: tx.reference, category, severity: severityFor(category), details: {
        transactionId: tx.id, type: tx.type, direction: tx.direction, amountMinor: Number(tx.amountMinor), currency: tx.currency,
        status: tx.status, source: tx.source, providerReferencePresent: Boolean(tx.providerReference), ledgerEntryCount: Number(tx.entryCount), createdAt: tx.createdAt,
      } });
    }
    if (tx.currency && tx.ledgerCurrencyCount > 0 && (Number(tx.ledgerCurrencyCount) !== 1 || tx.ledgerCurrency !== tx.currency)) {
      findings.push({ source: "wallet_transaction", sourceId: tx.id, reference: tx.reference, category: "currency_mismatch", severity: "critical", details: { transactionId: tx.id, currency: tx.currency, ledgerCurrency: tx.ledgerCurrency, ledgerCurrencyCount: Number(tx.ledgerCurrencyCount) } });
    }
    if (tx.status === "completed" && Number(tx.entryCount) > 0 && Number(tx.ledgerAmountMinor) !== (tx.direction === "debit" ? -Number(tx.amountMinor) : Number(tx.amountMinor))) {
      findings.push({ source: "wallet_transaction", sourceId: tx.id, reference: tx.reference, category: "amount_mismatch", severity: "critical", details: { transactionId: tx.id, amountMinor: Number(tx.amountMinor), expectedLedgerAmountMinor: tx.direction === "debit" ? -Number(tx.amountMinor) : Number(tx.amountMinor), actualLedgerAmountMinor: Number(tx.ledgerAmountMinor), currency: tx.currency } });
    }
  }
  for (const tx of txRows) {
    const ref = String(tx.providerReference || "").trim();
    if (tx.source !== "internal" && ref && providerRefs.get(ref) > 1) findings.push({ source: "wallet_transaction", sourceId: tx.id, reference: tx.reference, category: "duplicate_provider_reference", severity: "critical", details: { transactionId: tx.id, providerReferencePresent: true, providerReferenceMatchCount: providerRefs.get(ref) } });
  }
  let attention = { total: 0, items: [] };
  try { attention = paymentAttention.attentionReport(db, { now, limit: 100, offset: 0 }); } catch (_) { /* older test DBs may omit marketplace payment events */ }
  for (const item of attention.items || []) findings.push({ source: "payment_attention", sourceId: `${safeText(item.reference, 160)}:${safeText(item.outcome, 100)}`, reference: item.reference, category: item.category, severity: severityFor(item.category), details: { eventType: safeText(item.eventType, 100), outcome: safeText(item.outcome, 100), category: safeText(item.category, 100), receivedAt: safeText(item.receivedAt, 80) } });
  for (const finding of findings) upsertException(db, finding, nowIso, runId);
  const summary = {
    generatedAt: nowIso, runId, transactionCount: txRows.length,
    completedTransactions: txRows.filter((x) => x.status === "completed").length,
    pendingPayments: txRows.filter((x) => x.status === "pending" && x.type !== "withdrawal").length,
    pendingWithdrawals: txRows.filter((x) => x.status === "pending" && x.type === "withdrawal").length,
    failedTransactions: txRows.filter((x) => ["failed", "reversed"].includes(x.status)).length,
    failedPayments: txRows.filter((x) => x.type !== "withdrawal" && ["failed", "reversed"].includes(x.status)).length,
    failedWithdrawals: txRows.filter((x) => x.type === "withdrawal" && ["failed", "reversed"].includes(x.status)).length,
    ledgerEntriesChecked: txRows.reduce((n, x) => n + Number(x.entryCount || 0), 0),
    providerReconciliation: providerSummary(options.providerState),
    fxQuoteReadiness: fxQuoteReadiness(),
    findingsDetected: findings.length,
  };
  db.prepare(`INSERT INTO wallet_reconciliation_runs(id,runAt,providerStatus,transactionCount,ledgerExceptionCount,paymentAttentionCount,summaryJson) VALUES(?,?,?,?,?,?,?)`)
    .run(runId, nowIso, summary.providerReconciliation.status, summary.transactionCount, findings.filter((x) => x.source === "wallet_transaction").length, (attention.items || []).length, JSON.stringify(summary));
  const counts = db.prepare("SELECT status,COUNT(*) AS count FROM wallet_reconciliation_exceptions GROUP BY status").all();
  summary.exceptions = Object.fromEntries(counts.map((x) => [x.status, Number(x.count)]));
  return summary;
}
function getSummary(db, providerState = {}) {
  ensureSchema(db);
  const latest = db.prepare("SELECT summaryJson FROM wallet_reconciliation_runs ORDER BY runAt DESC,id DESC LIMIT 1").get();
  const summary = latest ? JSON.parse(latest.summaryJson || "{}") : {
    generatedAt: null, runId: null, transactionCount: 0, completedTransactions: 0,
    pendingPayments: 0, pendingWithdrawals: 0, failedTransactions: 0, failedPayments: 0, failedWithdrawals: 0, ledgerEntriesChecked: 0,
    findingsDetected: 0, note: "No reconciliation run has been recorded yet. Run reconciliation to inspect current records.",
    fxQuoteReadiness: fxQuoteReadiness(),
  };
  summary.providerReconciliation = providerSummary(providerState);
  summary.fxQuoteReadiness = fxQuoteReadiness();
  const counts = db.prepare("SELECT status,COUNT(*) AS count FROM wallet_reconciliation_exceptions GROUP BY status").all();
  summary.exceptions = Object.fromEntries(counts.map((x) => [x.status, Number(x.count)]));
  return summary;
}
function listExceptions(db, options = {}) {
  ensureSchema(db);
  const limit = clampInt(options.limit, DEFAULT_LIMIT, 1, MAX_LIMIT); const offset = clampInt(options.offset, 0, 0, 100000);
  const status = ["open", "assigned", "reviewed", "resolved", "active", "all"].includes(options.status) ? options.status : "open";
  const where = status === "all" ? "" : status === "active" ? "WHERE status IN ('open','assigned')" : "WHERE status=?";
  const rows = db.prepare(`SELECT id,source,sourceId,reference,category,severity,status,detailsJson,firstSeenAt,lastSeenAt,resolvedAt,resolutionReason,resolvedBy,assignedTo,assignedAt,assignmentReason FROM wallet_reconciliation_exceptions ${where} ORDER BY CASE status WHEN 'open' THEN 0 WHEN 'assigned' THEN 1 ELSE 2 END, lastSeenAt DESC LIMIT ? OFFSET ?`).all(...(status === "all" || status === "active" ? [limit, offset] : [status, limit, offset]));
  const total = db.prepare(`SELECT COUNT(*) AS count FROM wallet_reconciliation_exceptions ${where}`).get(...(status === "all" || status === "active" ? [] : [status])).count;
  return { status, limit, offset, total: Number(total), items: rows.map((r) => ({ ...r, details: JSON.parse(r.detailsJson || "{}"), detailsJson: undefined })) };
}
function searchTransactions(db, options = {}) {
  ensureSchema(db);
  const q = safeText(options.q, 120); const limit = clampInt(options.limit, DEFAULT_LIMIT, 1, MAX_LIMIT); const offset = clampInt(options.offset, 0, 0, 100000);
  if (q.length < 2) return { q, limit, offset, total: 0, items: [], hint: "Enter at least two characters to search transaction ID or reference." };
  const pattern = `%${q}%`;
  const where = "WHERE instr(lower(t.id),lower(?))>0 OR instr(lower(t.reference),lower(?))>0 OR instr(lower(COALESCE(t.providerReference,'')),lower(?))>0";
  const rows = db.prepare(`SELECT t.id,t.type,t.direction,t.amountMinor,t.currency,t.status,t.source,t.reference,t.providerReference,t.createdAt,t.completedAt,COUNT(l.id) AS ledgerEntryCount,COALESCE(SUM(l.amountMinor),0) AS ledgerAmountMinor FROM wallet_transactions t LEFT JOIN wallet_ledger_entries l ON l.transactionId=t.id ${where} GROUP BY t.id ORDER BY t.createdAt DESC LIMIT ? OFFSET ?`).all(pattern, pattern, pattern, limit, offset);
  const total = db.prepare(`SELECT COUNT(*) AS count FROM wallet_transactions t ${where}`).get(pattern, pattern, pattern).count;
  return { q, limit, offset, total: Number(total), items: rows.map((r) => ({ ...r, amountMinor: Number(r.amountMinor), ledgerEntryCount: Number(r.ledgerEntryCount), ledgerAmountMinor: Number(r.ledgerAmountMinor) })) };
}
function transactionTimeline(db, transactionId) {
  ensureSchema(db);
  const tx = db.prepare("SELECT id,type,direction,amountMinor,currency,status,source,reference,providerReference,createdAt,completedAt FROM wallet_transactions WHERE id=?").get(safeText(transactionId, 120));
  if (!tx) return null;
  const ledger = db.prepare("SELECT id,amountMinor,currency,createdAt FROM wallet_ledger_entries WHERE transactionId=? ORDER BY createdAt,id").all(tx.id).map((r) => ({ ...r, amountMinor: Number(r.amountMinor) }));
  const audit = db.prepare("SELECT action,actorRole,reason,createdAt FROM wallet_reconciliation_audit WHERE exceptionId IN (SELECT id FROM wallet_reconciliation_exceptions WHERE source='wallet_transaction' AND sourceId=?) ORDER BY createdAt").all(tx.id);
  const timeline = [{ type: "transaction_created", at: tx.createdAt, status: "recorded" }];
  if (tx.completedAt) timeline.push({ type: "transaction_completed", at: tx.completedAt, status: tx.status });
  for (const row of ledger) timeline.push({ type: "ledger_entry", at: row.createdAt, amountMinor: row.amountMinor, currency: row.currency });
  for (const row of audit) timeline.push({ type: row.action, at: row.createdAt, actorRole: row.actorRole, reason: row.reason });
  timeline.sort((a, b) => String(a.at).localeCompare(String(b.at)));
  return { transaction: { ...tx, amountMinor: Number(tx.amountMinor) }, ledgerEntries: ledger, timeline };
}
function assignException(db, { exceptionId, assignedTo, actorId, actorRole, reason, canAssign, now = new Date() }) {
  ensureSchema(db);
  const targetId = safeText(assignedTo, 120); const cleanReason = safeText(reason, 300);
  if (!targetId) throw Object.assign(new Error("Choose an authorized Admin to assign this exception."), { status: 400 });
  if (cleanReason.length < 10) throw Object.assign(new Error("Provide an assignment reason of at least 10 characters."), { status: 400 });
  if (typeof canAssign !== "function" || !canAssign(targetId)) throw Object.assign(new Error("Assignment target does not have Main-authorized financial operations permission."), { status: 403 });
  const current = db.prepare("SELECT id,status FROM wallet_reconciliation_exceptions WHERE id=?").get(safeText(exceptionId, 100));
  if (!current) throw Object.assign(new Error("Reconciliation exception not found."), { status: 404 });
  if (!["open", "assigned"].includes(current.status)) throw Object.assign(new Error("Only open or assigned exceptions can be reassigned."), { status: 409 });
  runInTransaction(db, () => {
    const changed = db.prepare("UPDATE wallet_reconciliation_exceptions SET status='assigned',assignedTo=?,assignedAt=?,assignmentReason=? WHERE id=? AND status IN ('open','assigned')")
      .run(targetId, now.toISOString(), cleanReason, current.id);
    if (changed.changes !== 1) throw Object.assign(new Error("Exception changed while being assigned; refresh and try again."), { status: 409 });
    db.prepare("INSERT INTO wallet_reconciliation_audit(id,exceptionId,actorId,actorRole,action,reason,createdAt) VALUES(?,?,?,?,?,?,?)")
      .run(crypto.randomUUID(), current.id, safeText(actorId, 120), safeText(actorRole, 40), "exception_assigned", cleanReason, now.toISOString());
  });
  return { id: current.id, status: "assigned", assignedTo: targetId, assignedAt: now.toISOString(), financialStateChanged: false };
}
function reviewException(db, { exceptionId, actorId, actorRole, reason, now = new Date() }) {
  ensureSchema(db);
  const cleanReason = safeText(reason, 500);
  if (cleanReason.length < 10) throw Object.assign(new Error("Provide a review reason of at least 10 characters."), { status: 400 });
  const current = db.prepare("SELECT id,status FROM wallet_reconciliation_exceptions WHERE id=?").get(safeText(exceptionId, 100));
  if (!current) throw Object.assign(new Error("Reconciliation exception not found."), { status: 404 });
  if (!["open", "assigned"].includes(current.status)) throw Object.assign(new Error("This exception has already reached a terminal review state."), { status: 409 });
  runInTransaction(db, () => {
    const changed = db.prepare("UPDATE wallet_reconciliation_exceptions SET status='reviewed',resolvedAt=?,resolutionReason=?,resolvedBy=? WHERE id=? AND status IN ('open','assigned')")
      .run(now.toISOString(), cleanReason, safeText(actorId, 120), current.id);
    if (changed.changes !== 1) throw Object.assign(new Error("Exception changed while being reviewed; refresh and try again."), { status: 409 });
    db.prepare("INSERT INTO wallet_reconciliation_audit(id,exceptionId,actorId,actorRole,action,reason,createdAt) VALUES(?,?,?,?,?,?,?)")
      .run(crypto.randomUUID(), current.id, safeText(actorId, 120), safeText(actorRole, 40), "exception_marked_reviewed", cleanReason, now.toISOString());
  });
  return { id: current.id, status: "reviewed", reviewedAt: now.toISOString(), financialStateChanged: false };
}
module.exports = { MAX_LIMIT, clampInt, transactionFindings, providerSummary, fxQuoteReadiness, ensureSchema, reconcile, getSummary, listExceptions, searchTransactions, transactionTimeline, assignException, reviewException };
