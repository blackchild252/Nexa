"use strict";

const closureIntegrity = require("./v5_77_0_account_closure_integrity");

const REQUIRED_CLOSURE_SUPPORT = Object.freeze([...closureIntegrity.CLOSURE_SUPPORT_TABLES]);
const REQUIRED_RELATIONSHIP_TABLES = Object.freeze([...new Set(closureIntegrity.CLOSURE_RELATIONSHIP_COLUMNS.map(([table]) => table))]);
const REQUIRED_RETAINED = Object.freeze([
  "wallet_accounts", "wallet_transactions", "wallet_ledger_entries",
  "mall_orders", "mall_payment_events", "mall_refunds", "mall_checkout_disputes",
  "yaayz_ticket_orders", "kitchen_orders", "nexa_subscription_charges",
  "money_groups", "money_group_members", "money_group_entries", "money_group_entry_shares"
]);

function readiness(db, userId) {
  const user = db.prepare("SELECT id,accountStatus,closedAt FROM users WHERE id=?").get(userId);
  if (!user) return { ok:false, reason:"account_not_found", retainedTables:[] };
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r=>r.name);
  const retainedTables = REQUIRED_RETAINED.filter(t=>tables.includes(t));
  const missingRetainedTables = REQUIRED_RETAINED.filter(t=>!tables.includes(t));
  const missingClosureSupport = REQUIRED_CLOSURE_SUPPORT.filter(t=>!tables.includes(t));
  const missingRelationshipTables = REQUIRED_RELATIONSHIP_TABLES.filter(t=>!tables.includes(t));
  const userColumns = tables.includes("users") ? db.prepare("PRAGMA table_info(users)").all().map(r=>r.name) : [];
  const missingUserColumns = ["accountStatus", "closedAt"].filter(c=>!userColumns.includes(c));
  const blockers = closureIntegrity.closureBlockers(db, userId);
  return {
    ok: user.accountStatus !== "closed" && missingRetainedTables.length === 0 && missingClosureSupport.length === 0 && missingRelationshipTables.length === 0 && missingUserColumns.length === 0 && blockers.length === 0,
    accountStatus: user.accountStatus || "active",
    closedAt: user.closedAt || null,
    retainedTables,
    missingRetainedTables,
    missingClosureSupport,
    missingRelationshipTables,
    missingUserColumns,
    blockers,
    safeToClose: user.accountStatus === "active" && missingRetainedTables.length === 0 && missingClosureSupport.length === 0 && missingRelationshipTables.length === 0 && missingUserColumns.length === 0 && blockers.length === 0,
  };
}

module.exports = { REQUIRED_CLOSURE_SUPPORT, REQUIRED_RELATIONSHIP_TABLES, REQUIRED_RETAINED, readiness };
