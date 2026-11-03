"use strict";

// Read-only owner analytics. Missing source tables are reported as unavailable,
// never silently represented as zero. Only aggregate values leave this module.
const DAY_MS = 86400000;
const WINDOWS = new Set([7, 30, 90]);
const TABLE_METRICS = [
  ["usersTotal", "users", "COUNT(*)", null, "users.createdAt"],
  ["signups", "users", "COUNT(*)", "createdAt", "users.createdAt"],
  ["orders", "mall_orders", "COUNT(*)", "createdAt", "mall_orders.createdAt"],
  ["refunds", "mall_refunds", "COUNT(*)", "createdAt", "mall_refunds.createdAt"],
  ["disputes", "mall_checkout_disputes", "COUNT(*)", "createdAt", "mall_checkout_disputes.createdAt"],
  ["walletTransactions", "wallet_transactions", "COUNT(*)", "createdAt", "wallet_transactions.createdAt"],
  ["notifications", "notification_events", "COUNT(*)", "createdAt", "notification_events.createdAt"],
  ["socialReports", "social_reports", "COUNT(*)", "createdAt", "social_reports.createdAt"],
  ["socialPosts", "yaayz_social_posts", "COUNT(*)", "createdAt", "yaayz_social_posts.createdAt"],
  ["socialMessages", "dm_messages", "COUNT(*)", "createdAt", "dm_messages.createdAt"],
  ["damiAuditEvents", "ai_dami_audit_events", "COUNT(*)", "createdAt", "ai_dami_audit_events.createdAt"],
  ["adminAuditEvents", "admin_audit", "COUNT(*)", "createdAt", "admin_audit.createdAt"],
  ["staffAccounts", "vendor_staff", "COUNT(*)", "createdAt", "vendor_staff.createdAt"],
  ["damiWorkflows", "ai_workflows", "COUNT(*)", "createdAt", "ai_workflows.createdAt"],
  ["damiWorkflowRuns", "ai_workflow_runs", "COUNT(*)", "createdAt", "ai_workflow_runs.createdAt"],
  ["growthEvents", "nexa_growth_events", "COUNT(*)", "createdAt", "nexa_growth_events.createdAt"],
  ["referralCodes", "nexa_referral_codes", "COUNT(*)", "createdAt", "nexa_referral_codes.createdAt"],
  ["referralAttributions", "nexa_referral_attributions", "COUNT(*)", "createdAt", "nexa_referral_attributions.createdAt"],
];

function tableExists(db, table) {
  return !!db.prepare("SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name=?").get(table);
}
function columns(db, table) {
  if (!tableExists(db, table)) return new Set();
  return new Set(db.prepare(`PRAGMA table_info("${table}")`).all().map((row) => row.name));
}
function safeCount(db, table, expression, dateColumn, since) {
  if (!tableExists(db, table)) return { value: null, available: false };
  const cols = columns(db, table);
  if (dateColumn && !cols.has(dateColumn)) return { value: null, available: false };
  const where = dateColumn ? ` WHERE "${dateColumn}" >= ?` : "";
  const row = dateColumn ? db.prepare(`SELECT ${expression} AS value FROM "${table}"${where}`).get(since) : db.prepare(`SELECT ${expression} AS value FROM "${table}"`).get();
  const value = Number(row?.value);
  return { value: Number.isFinite(value) ? value : 0, available: true };
}
function metric(db, table, expression, dateColumn, since, source) {
  const result = safeCount(db, table, expression, dateColumn, since);
  return { ...result, source: result.available ? source : null };
}
function sumByCurrency(db, table, amountColumn, dateColumn, since, source) {
  const cols = columns(db, table);
  if (!cols.has(amountColumn) || !cols.has("currency") || !cols.has(dateColumn)) return { value: null, available: false, source: null };
  const rows = db.prepare(`SELECT currency, COALESCE(SUM("${amountColumn}"),0) AS amount FROM "${table}" WHERE "${dateColumn}" >= ? GROUP BY currency ORDER BY currency ASC`).all(since);
  const value = Object.fromEntries(rows.map((row) => [String(row.currency || "UNKNOWN"), Number(row.amount) || 0]));
  return { value, available: true, source };
}
function countStatus(db, table, dateColumn, since, statusColumn, statuses, source) {
  const cols = columns(db, table);
  if (!cols.has(dateColumn) || !cols.has(statusColumn)) return { value: null, available: false, source: null };
  const marks = statuses.map(() => "?").join(",");
  const row = db.prepare(`SELECT COUNT(*) AS value FROM "${table}" WHERE "${dateColumn}" >= ? AND lower("${statusColumn}") IN (${marks})`).get(since, ...statuses);
  return { value: Number(row?.value) || 0, available: true, source };
}
function activeUsers(db, since) {
  const candidates = [
    ["wallet_transactions", "userId", "createdAt"],
    ["mall_orders", "userId", "createdAt"],
    ["ai_workflow_runs", "userId", "createdAt"],
    ["dm_messages", "senderId", "createdAt"],
    ["yaayz_social_posts", "authorId", "createdAt"],
  ];
  const unions = [];
  const args = [];
  for (const [table, userCol, timeCol] of candidates) {
    const cols = columns(db, table);
    if (cols.has(userCol) && cols.has(timeCol)) {
      unions.push(`SELECT "${userCol}" AS uid FROM "${table}" WHERE "${timeCol}" >= ?`);
      args.push(since);
    }
  }
  if (!unions.length) return { value: null, available: false, source: null };
  const row = db.prepare(`SELECT COUNT(DISTINCT uid) AS value FROM (${unions.join(" UNION ALL ")}) WHERE uid IS NOT NULL AND uid != ''`).get(...args);
  return { value: Number(row?.value) || 0, available: true, source: "activity proxy: distinct actors across available transaction, workflow, message and social-post sources; not full app-session telemetry" };
}
function buildOwnerAnalytics(db, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const windowDays = WINDOWS.has(Number(options.windowDays)) ? Number(options.windowDays) : 30;
  const since = new Date(now.getTime() - windowDays * DAY_MS).toISOString();
  const since7 = new Date(now.getTime() - 7 * DAY_MS).toISOString();
  const since30 = new Date(now.getTime() - 30 * DAY_MS).toISOString();
  const since90 = new Date(now.getTime() - 90 * DAY_MS).toISOString();
  const metrics = {};
  for (const [key, table, expression, dateColumn, source] of TABLE_METRICS) metrics[key] = metric(db, table, expression, dateColumn, key === "usersTotal" ? null : since, source);
  metrics.gmv = sumByCurrency(db, "mall_orders", "total", "createdAt", since, "mall_orders.total grouped by source currency");
  metrics.refundAmount = sumByCurrency(db, "mall_refunds", "amount", "createdAt", since, "mall_refunds.amount grouped by source currency");
  metrics.walletFailed = countStatus(db, "wallet_transactions", "createdAt", since, "status", ["failed"], "wallet_transactions.status=failed");
  metrics.dau = activeUsers(db, new Date(now.getTime() - DAY_MS).toISOString());
  metrics.wau = activeUsers(db, since7);
  metrics.mau = activeUsers(db, since30);
  metrics.activeUsers90d = activeUsers(db, since90);
  metrics.signupConversion = { value: null, available: false, source: null, reason: "No canonical funnel/session attribution source is configured." };
  metrics.retention = { value: null, available: false, source: null, reason: "Cohort retention requires a canonical account-activity event source." };
  metrics.churn = { value: null, available: false, source: null, reason: "Churn requires a canonical active-account lifecycle event." };
  metrics.activeUserSegmentation = { value: null, available: false, source: null, reason: "No stable segment taxonomy is configured." };
  metrics.failedPayments = tableExists(db, "mall_payment_events") ? countStatus(db, "mall_payment_events", "receivedAt", since, "outcome", ["failed", "error", "rejected"], "mall_payment_events.failed/error/rejected outcomes") : { value: null, available: false, source: null };
  metrics.moderation = tableExists(db, "moderation_content_reports") ? metric(db, "moderation_content_reports", "COUNT(*)", "createdAt", since, "moderation_content_reports.createdAt") : metrics.socialReports;
  metrics.customerCare = ["customer_care_threads", "support_tickets", "customer_care_messages"].find((t) => tableExists(db, t)) || null;
  metrics.customerCare = metrics.customerCare ? metric(db, metrics.customerCare, "COUNT(*)", columns(db, metrics.customerCare).has("createdAt") ? "createdAt" : null, since, `${metrics.customerCare} aggregate count`) : { value: null, available: false, source: null };
  metrics.staffWork = ["admin_work", "admin_staff_work", "staff_work_items", "staff_tasks"].find((t) => tableExists(db, t)) || null;
  metrics.staffWork = metrics.staffWork ? metric(db, metrics.staffWork, "COUNT(*)", columns(db, metrics.staffWork).has("createdAt") ? "createdAt" : null, since, `${metrics.staffWork} aggregate count`) : { value: null, available: false, source: null };
  metrics.providerHealth = { value: null, available: false, source: null, reason: "Provider readiness is available separately as boolean diagnostics; no normalized historical provider-health series exists." };
  metrics.systemHealth = { value: null, available: false, source: null, reason: "Live process health is not a historical analytics series." };
  metrics.anomalies = { value: null, available: false, source: null, reason: "No baseline-backed anomaly model is configured; no anomaly is inferred from missing data." };
  const dailySignups = tableExists(db, "users") && columns(db, "users").has("createdAt")
    ? db.prepare("SELECT substr(createdAt,1,10) AS day, COUNT(*) AS count FROM users WHERE createdAt >= ? GROUP BY substr(createdAt,1,10) ORDER BY day ASC").all(since)
    : [];
  return {
    generatedAt: now.toISOString(), windowDays, currencyNote: "GMV is gross recorded order total, not net settled sales. GMV and refund amounts remain grouped by source-native currency; currencies are never combined or converted.",
    metrics, trends: { dailySignups },
    export: { aggregateOnly: true, piiIncluded: false, availableFormats: ["json", "csv"] },
  };
}
function toCsv(report) {
  const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const rows = [["metric", "value", "available", "source", "reason"]];
  for (const [key, item] of Object.entries(report.metrics || {})) rows.push([key, item?.value ?? "", item?.available === true, item?.source || "", item?.reason || ""]);
  return rows.map((row) => row.map((value) => escape(value && typeof value === "object" ? JSON.stringify(value) : value)).join(",")).join("\r\n") + "\r\n";
}
module.exports = { buildOwnerAnalytics, toCsv, tableExists, columns };
