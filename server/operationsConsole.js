"use strict";

const { moderationQueue } = require("./moderationOperations");

const TABLES = Object.freeze({
  disputes: "mall_checkout_disputes",
  marketplaceOrders: "mall_orders",
  tickets: "yaayz_ticket_orders",
  kitchenOrders: "kitchen_orders",
  users: "users",
  extensions: "extensions",
  auditEvents: "platform_event_log",
});

function tableExists(db, table) {
  return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table));
}

function count(db, table, where = "", params = []) {
  if (!tableExists(db, table)) return 0;
  const row = db.prepare(`SELECT COUNT(*) AS n FROM ${table}${where ? ` WHERE ${where}` : ""}`).get(...params);
  return Number(row?.n || 0);
}

function recentEventSummary(db, windowMinutes = 60) {
  const minutes = Math.min(Math.max(Number(windowMinutes) || 60, 1), 1440);
  const since = new Date(Date.now() - minutes * 60000).toISOString();
  const out = { info: 0, warning: 0, error: 0, critical: 0 };
  // Like every other figure in summary(), this must tolerate a missing table or a not-yet-migrated schema.
  const columns = tableExists(db, "platform_event_log") ? db.prepare("PRAGMA table_info(platform_event_log)").all().map((c) => c.name) : [];
  if (!columns.includes("severity") || !columns.includes("createdAt")) return { windowMinutes: minutes, ...out };
  const rows = db.prepare("SELECT severity, COUNT(*) AS n FROM platform_event_log WHERE createdAt >= ? GROUP BY severity").all(since);
  for (const row of rows) if (Object.prototype.hasOwnProperty.call(out, row.severity)) out[row.severity] = Number(row.n || 0);
  return { windowMinutes: minutes, ...out };
}

function recentEvents(db, { severity = null, limit = 50, offset = 0 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const safeOffset = Math.min(Math.max(Number(offset) || 0, 0), 10000);
  const where = []; const params = [];
  if (severity && ["info", "warning", "error", "critical"].includes(String(severity))) { where.push("severity=?"); params.push(String(severity)); }
  const sql = `SELECT id,requestId,userId,action,entityType,entityId,severity,metadata,createdAt FROM platform_event_log ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
  return db.prepare(sql).all(...params, safeLimit, safeOffset).map(row => { let metadata = {}; try { metadata = JSON.parse(row.metadata || "{}"); } catch (_) {} return { ...row, metadata }; });
}

function summary(db) {
  return {
    users: count(db, TABLES.users),
    marketplace: { orders: count(db, TABLES.marketplaceOrders), disputes: count(db, TABLES.disputes) },
    yaayz: { tickets: count(db, TABLES.tickets), pendingOrders: count(db, TABLES.tickets, "status IN ('pending','processing')") },
    kitchen: { orders: count(db, TABLES.kitchenOrders), pendingOrders: count(db, TABLES.kitchenOrders, "status IN ('pending','processing')") },
    trustSafety: { openReports: count(db, "social_reports", "status IN ('open','review')"), urgentReports: count(db, "social_reports", "status IN ('open','review') AND reason IN ('fraud','threat','child_safety')"), openAppeals: count(db, "social_report_appeals", "status IN ('open','under_review')") },
    extensions: { registered: count(db, TABLES.extensions) },
    merchant: { vendors: count(db, "vendors"), marketplaceItems: count(db, "mall_order_items", "status IN ('placed','confirmed','fulfilled')"), yaayzOrders: count(db, "yaayz_ticket_orders", "status IN ('paid','fulfilled')"), kitchenOrders: count(db, "kitchen_orders", "status IN ('paid','fulfilled')") },
    audit: { events: count(db, TABLES.auditEvents), recent: recentEventSummary(db) },
  };
}

module.exports = { TABLES, tableExists, count, summary, recentEventSummary, recentEvents };
