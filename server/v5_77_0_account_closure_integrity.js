"use strict";

const crypto = require("crypto");

const DELETE_USER_TABLES = Object.freeze([
  "ai_voice_preferences", "ai_avatar", "ai_personalization", "ai_memory_settings", "ai_memories", "ai_plans",
  "ai_action_confirmations", "ai_action_receipts",
  "expenses", "debts", "financial_budgets", "financial_goals", "financial_goal_contributions", "financial_savings_rules", "financial_planning_settings", "market_insight_preferences", "notification_preferences",
  "favorites", "scam_checks", "push_tokens", "notification_events", "platform_event_log",
  "ai_workflows", "ai_workflow_runs", "ai_workflow_idempotency", "ai_workflow_run_receipts", "ai_calendar_events", "ai_tasks", "ai_notes", "ai_knowledge", "ai_dami_audit_events",
  "sessions", "extension_consents", "extension_audit_log", "extension_identities",
  "extensions", "mall_favorites", "mall_watches", "mall_alerts",
  "nexa_subscriptions", "nexa_subscription_preferences", "nexa_fee_previews",
  "aami_accounts", "aami_ledger", "aami_reward_events", "yaayz_social_posts", "yaayz_social_likes", "yaayz_social_views", "yaayz_social_comments", "yaayz_social_shares",
  "mall_inquiries", "mall_inquiry_requests", "mall_inquiry_messages", "mall_interaction_reports", "mall_exception_evidence",
  "money_store_ajo_contributions", "money_store_ajo_accounts", "kitchen_referrals"
]);

// Financial transaction history is retained as an integrity anchor, but wallet accounts
// are explicitly closed and free-text transaction fields are redacted. Paid Store Ajo
// contributions are not deleted during closure; closure is blocked until that position is resolved.
const RETAINED_USER_TABLES = Object.freeze([
  "wallet_accounts", "wallet_transactions", "wallet_ledger_entries",
  "mall_orders", "mall_order_items", "mall_order_events", "mall_order_idempotency",
  "mall_payment_events", "mall_refunds", "mall_checkout_disputes", "mall_dispute_threads",
  "mall_dispute_messages", "mall_dispute_refunds", "mall_reviews", "vendors", "vendor_subscription_periods",
  "vendor_launch_allocations", "vendor_subscription_payments", "vendor_subscription_reminders",
  "yaayz_ticket_listings", "yaayz_ticket_orders", "kitchen_orders", "kitchen_cashback_ledger",
  "nexa_subscription_charges", "money_groups", "money_group_members",
  "money_group_entries", "money_group_entry_shares"
]);

const CLOSURE_SUPPORT_TABLES = Object.freeze([
  "users", "sessions", "wallet_accounts", "wallet_transactions", "wallet_ledger_entries",
  "dm_threads", "dm_messages", "chat_rooms", "chat_room_members", "room_messages",
  "money_groups", "money_group_members", "money_group_entries", "money_group_entry_shares"
]);

const RATE_LIMIT_SCOPE_MAX = 80;
function tableExists(db, table) {
  return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table));
}
function hasColumn(db, table, column) {
  if (!tableExists(db, table)) return false;
  return db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column);
}
function normalizeScope(scope) { return String(scope || "default").slice(0, RATE_LIMIT_SCOPE_MAX); }
function userRateLimitKeyHash(userId) { return crypto.createHash("sha256").update(String(userId || "").trim() || "unknown").digest("hex"); }

function revokeUserSessions(db, userId, now = new Date().toISOString(), reason = "account_closed") {
  if (!tableExists(db, "sessions")) return 0;
  return db.prepare("UPDATE sessions SET revokedAt=?,revocationReason=? WHERE userId=? AND revokedAt IS NULL").run(now, String(reason).slice(0,80), userId).changes;
}


function closureBlockers(db, userId) {
  const blockers = [];
  if (tableExists(db, "wallet_accounts") && tableExists(db, "wallet_ledger_entries")) {
    const accounts = db.prepare("SELECT currency,status FROM wallet_accounts WHERE userId=?").all(userId);
    for (const account of accounts) {
      const balance = Number(db.prepare("SELECT COALESCE(SUM(amountMinor),0) AS amountMinor FROM wallet_ledger_entries WHERE userId=? AND currency=?").get(userId, account.currency)?.amountMinor || 0);
      if (balance !== 0) blockers.push({ code: "wallet_balance", currency: account.currency, amountMinor: balance });
    }
    if (tableExists(db, "wallet_transactions")) {
      const pending = db.prepare("SELECT COUNT(*) AS count FROM wallet_transactions WHERE userId=? AND status='pending'").get(userId);
      if (Number(pending?.count || 0) > 0) blockers.push({ code: "wallet_pending_transactions", count: Number(pending.count) });
    }
  }
  if (tableExists(db, "money_store_ajo_contributions")) {
    const paid = db.prepare("SELECT COUNT(*) AS count FROM money_store_ajo_contributions WHERE userId=? AND status='paid'").get(userId);
    if (Number(paid?.count || 0) > 0) blockers.push({ code: "paid_store_ajo", count: Number(paid.count) });
  }
  return blockers;
}

function closureSchemaReadiness(db) {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name);
  const missing = CLOSURE_SUPPORT_TABLES.filter((t) => !tables.includes(t));
  const missingUserColumns = ["accountStatus", "closedAt"].filter((c) => !hasColumn(db, "users", c));
  return { ok: missing.length === 0 && missingUserColumns.length === 0, missingTables: missing, missingUserColumns };
}

function redactWalletHistory(db, userId, now) {
  if (!tableExists(db, "wallet_transactions")) return 0;
  const result = db.prepare("UPDATE wallet_transactions SET description='Closed account transaction', metadata='{" + '"redacted":"account_closed"' + "}', counterpartyUserId=CASE WHEN counterpartyUserId=? THEN NULL ELSE counterpartyUserId END WHERE userId=?").run(userId, userId);
  return result.changes;
}

function closeWalletAccounts(db, userId, now) {
  if (!tableExists(db, "wallet_accounts")) return 0;
  return db.prepare("UPDATE wallet_accounts SET status='closed', updatedAt=? WHERE userId=? AND status!='closed'").run(now, userId).changes;
}

function cleanupRateLimitState(db, userId) {
  if (!tableExists(db, "rate_limit_buckets")) return 0;
  return db.prepare("DELETE FROM rate_limit_buckets WHERE keyHash=?").run(userRateLimitKeyHash(userId)).changes;
}

// B128: vendor-staff access is account-owned relationship state. Closing either a
// staff member or the vendor owner must not leave an active staff relationship
// attached to a closed account/vendor. Historical removed rows are retained for
// audit continuity, but their invite codes are cleared.
function cleanupVendorStaff(db, userId, now = new Date().toISOString()) {
  if (!tableExists(db, "vendor_staff") || !tableExists(db, "vendors")) return 0;
  const owned = db.prepare("SELECT id FROM vendors WHERE userId=?").all(userId).map((r) => r.id);
  let changed = 0;
  changed += db.prepare("UPDATE vendor_staff SET status='removed', removedAt=?, inviteCode=NULL WHERE userId=? AND status!='removed'").run(now, userId).changes;
  for (const vendorId of owned) {
    changed += db.prepare("UPDATE vendor_staff SET status='removed', removedAt=?, inviteCode=NULL WHERE vendorId=? AND status!='removed'").run(now, vendorId).changes;
  }
  return changed;
}

// B128 governance: these are relationship columns whose owner is not literally
// named userId. They must remain explicitly classified in the closure contract.
const CLOSURE_RELATIONSHIP_COLUMNS = Object.freeze([
  ["vendors", "userId", "vendor-lifecycle"],
  ["vendor_staff", "userId", "vendor-staff-lifecycle"],
  ["money_store_ajo_contributions", "userId", "financial-blocker"],
  ["kitchen_referrals", "ownerId", "delete-on-closure"],
  ["kitchen_cashback_ledger", "beneficiaryId", "financial-retention"],
  ["kitchen_cashback_ledger", "referredByUserId", "financial-retention"],
  ["yaayz_social_comments", "userId", "delete-on-closure"],
  ["yaayz_social_shares", "userId", "delete-on-closure"],
  ["social_reports", "reporterId", "moderation-retention"],
  ["social_reports", "targetUserId", "moderation-retention"],
  ["social_report_appeals", "appellantId", "moderation-retention"],
  ["fitness_gyms", "ownerId", "public-business-retention"],
  ["mall_inquiries", "buyerId", "delete-on-closure"],
  ["mall_inquiries", "sellerId", "delete-on-closure"],
  ["mall_inquiry_requests", "buyerId", "delete-on-closure"],
  ["mall_inquiry_messages", "senderId", "delete-on-closure"],
  ["mall_interaction_reports", "reporterId", "delete-on-closure"],
  ["mall_exception_evidence", "vendorId", "delete-through-owned-vendor"],
  ["kitchen_referrals", "ownerId", "delete-on-closure"],
]);

function closureRelationshipManifest() { return CLOSURE_RELATIONSHIP_COLUMNS.map(([table, column, policy]) => ({ table, column, policy })); }

// B131: DELETE_USER_TABLES contains a small set of relationship tables whose owner
// column is not literally `userId`. Keep these predicates explicit rather than
// guessing column names inside the generic deletion loop. Child rows are removed
// before their parent inquiry rows; vendor-scoped evidence is resolved through the
// canonical vendor owner relation.
// B132: retained Yaayz seller inventory is historical commerce state, but an account
// closure must retire active inventory and cancel any still-pending payment
// reservations owned by that seller. Paid orders remain retained for financial
// integrity. This is deliberately seller-scoped and transaction-safe.
function cleanupRetainedSellerArtifacts(db, userId, now = new Date().toISOString()) {
  let changed = 0;
  if (!tableExists(db, "yaayz_ticket_listings")) return changed;
  const pending = tableExists(db, "yaayz_ticket_orders")
    ? db.prepare(`SELECT o.id,o.ticketId,o.quantity
        FROM yaayz_ticket_orders o
        JOIN yaayz_ticket_listings t ON t.id=o.ticketId
        WHERE t.sellerId=? AND o.status='pending_payment'`).all(userId)
    : [];
  if (pending.length && tableExists(db, "yaayz_ticket_listings")) {
    const restore = db.prepare("UPDATE yaayz_ticket_listings SET quantity=quantity+?,updatedAt=? WHERE id=?");
    for (const row of pending) restore.run(Number(row.quantity || 0), now, row.ticketId);
  }
  if (pending.length && tableExists(db, "yaayz_ticket_orders")) {
    const cancel = db.prepare("UPDATE yaayz_ticket_orders SET status='cancelled',updatedAt=? WHERE id=? AND status='pending_payment'");
    for (const row of pending) changed += cancel.run(now, row.id).changes;
  }
  changed += db.prepare("UPDATE yaayz_ticket_listings SET active=0,updatedAt=? WHERE sellerId=? AND active=1").run(now, userId).changes;
  return changed;
}

function cleanupNonUserIdClosureArtifacts(db, userId) {
  let deleted = 0;
  if (tableExists(db, "mall_inquiries")) {
    const inquiryIds = db.prepare("SELECT id FROM mall_inquiries WHERE buyerId=? OR sellerId=?").all(userId, userId).map((r) => r.id);
    if (inquiryIds.length) {
      const placeholders = inquiryIds.map(() => "?").join(",");
      if (tableExists(db, "mall_inquiry_messages")) deleted += db.prepare(`DELETE FROM mall_inquiry_messages WHERE inquiryId IN (${placeholders})`).run(...inquiryIds).changes;
      if (tableExists(db, "mall_inquiry_requests")) deleted += db.prepare(`DELETE FROM mall_inquiry_requests WHERE inquiryId IN (${placeholders})`).run(...inquiryIds).changes;
      deleted += db.prepare(`DELETE FROM mall_inquiries WHERE id IN (${placeholders})`).run(...inquiryIds).changes;
    }
  }
  if (tableExists(db, "mall_interaction_reports")) {
    deleted += db.prepare("DELETE FROM mall_interaction_reports WHERE reporterId=?").run(userId).changes;
  }
  if (tableExists(db, "kitchen_referrals")) {
    deleted += db.prepare("DELETE FROM kitchen_referrals WHERE ownerId=?").run(userId).changes;
  }
  if (tableExists(db, "mall_exception_evidence") && tableExists(db, "vendors")) {
    const vendorIds = db.prepare("SELECT id FROM vendors WHERE userId=?").all(userId).map((r) => r.id);
    if (vendorIds.length) {
      const placeholders = vendorIds.map(() => "?").join(",");
      deleted += db.prepare(`DELETE FROM mall_exception_evidence WHERE vendorId IN (${placeholders})`).run(...vendorIds).changes;
    }
  }
  return deleted;
}

function cleanupDirectMessages(db, userId) {
  if (!tableExists(db, "dm_threads") || !tableExists(db, "dm_messages")) return 0;
  const ids = db.prepare("SELECT id FROM dm_threads WHERE userAId=? OR userBId=?").all(userId, userId).map((r) => r.id);
  let deleted = 0;
  for (const id of ids) deleted += db.prepare("DELETE FROM dm_messages WHERE threadId=?").run(id).changes;
  deleted += db.prepare("DELETE FROM dm_threads WHERE userAId=? OR userBId=?").run(userId, userId).changes;
  return deleted;
}

function cleanupChatRooms(db, userId) {
  if (!tableExists(db, "chat_rooms") || !tableExists(db, "chat_room_members") || !tableExists(db, "room_messages")) return 0;
  let changed = 0;
  const owned = db.prepare("SELECT id FROM chat_rooms WHERE ownerId=?").all(userId).map((r) => r.id);
  for (const roomId of owned) {
    const successor = db.prepare("SELECT m.userId FROM chat_room_members m JOIN users u ON u.id=m.userId WHERE m.roomId=? AND m.userId!=? AND COALESCE(u.accountStatus,'active')='active' ORDER BY m.joinedAt ASC LIMIT 1").get(roomId, userId);
    if (successor?.userId) {
      db.prepare("UPDATE chat_rooms SET ownerId=?,updatedAt=? WHERE id=? AND ownerId=?").run(successor.userId, new Date().toISOString(), roomId, userId);
      db.prepare("UPDATE chat_room_members SET role='member' WHERE roomId=? AND role='owner'").run(roomId);
      db.prepare("UPDATE chat_room_members SET role='owner' WHERE roomId=? AND userId=?").run(roomId, successor.userId);
    } else {
      changed += db.prepare("DELETE FROM room_messages WHERE roomId=?").run(roomId).changes;
      changed += db.prepare("DELETE FROM chat_room_members WHERE roomId=?").run(roomId).changes;
      changed += db.prepare("DELETE FROM chat_rooms WHERE id=? AND ownerId=?").run(roomId, userId).changes;
      continue;
    }
  }
  changed += db.prepare("DELETE FROM room_messages WHERE senderId=?").run(userId).changes;
  changed += db.prepare("DELETE FROM chat_room_members WHERE userId=?").run(userId).changes;
  return changed;
}

function transferOrCloseMoneyGroups(db, userId, now) {
  if (!tableExists(db, "money_groups") || !tableExists(db, "money_group_members")) return 0;
  let changed = 0;
  const owned = db.prepare("SELECT id FROM money_groups WHERE ownerId=?").all(userId).map((r) => r.id);
  for (const groupId of owned) {
    const successor = db.prepare("SELECT m.userId FROM money_group_members m JOIN users u ON u.id=m.userId WHERE m.groupId=? AND m.userId!=? AND COALESCE(u.accountStatus,'active')='active' ORDER BY m.createdAt ASC LIMIT 1").get(groupId, userId);
    if (successor?.userId) {
      db.prepare("UPDATE money_groups SET ownerId=?,updatedAt=? WHERE id=? AND ownerId=?").run(successor.userId, now, groupId, userId);
      db.prepare("UPDATE money_group_members SET role='member' WHERE groupId=? AND userId=?").run(groupId, userId);
      db.prepare("UPDATE money_group_members SET role='owner' WHERE groupId=? AND userId=?").run(groupId, successor.userId);
    } else {
      db.prepare("UPDATE money_groups SET closedAt=?,updatedAt=? WHERE id=? AND ownerId=?").run(now, now, groupId, userId);
    }
  }
  // Keep the group ledger internally consistent: entry shares may reference this member row.
  // Convert the closed account to a non-login placeholder instead of orphaning financial attribution.
  changed += db.prepare("UPDATE money_group_members SET userId=NULL,name='Closed NEXA account',role=CASE WHEN role='owner' THEN 'member' ELSE role END,claimCode=NULL WHERE userId=?").run(userId).changes;
  return changed;
}

module.exports = {
  DELETE_USER_TABLES,
  RETAINED_USER_TABLES,
  CLOSURE_SUPPORT_TABLES,
  tableExists,
  hasColumn,
  userRateLimitKeyHash,
  closureBlockers,
  closureSchemaReadiness,
  redactWalletHistory,
  closeWalletAccounts,
  cleanupRateLimitState,
  cleanupVendorStaff,
  CLOSURE_RELATIONSHIP_COLUMNS,
  closureRelationshipManifest,
  cleanupDirectMessages,
  cleanupChatRooms,
  transferOrCloseMoneyGroups,
  cleanupNonUserIdClosureArtifacts,
  cleanupRetainedSellerArtifacts,
  revokeUserSessions,
};
