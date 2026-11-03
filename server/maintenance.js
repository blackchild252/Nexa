"use strict";
const { purgePlatformEvents } = require("./dataRetention");
const { purgeExpiredSessions } = require("./sessionMaintenance");

function purgeExpiredMemories(db, now = new Date()) {
  const cutoff = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
  const result = db.prepare("DELETE FROM ai_memories WHERE expiresAt IS NOT NULL AND expiresAt <= ?").run(cutoff);
  return { deleted: result.changes };
}

function purgeOldWorkflowRuns(db, days = 365, now = new Date()) {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - Math.max(1, Math.min(3650, Math.floor(Number(days) || 365))));
  const result = db.prepare("DELETE FROM ai_workflow_runs WHERE createdAt < ?").run(d.toISOString());
  return { deleted: result.changes, days: Math.max(1, Math.min(3650, Math.floor(Number(days) || 365))) };
}

function expireStaleNotificationReceipts(db, maxHours = 24, now = new Date()) {
  const hours = Math.max(1, Math.min(168, Math.floor(Number(maxHours) || 24)));
  const cutoff = new Date(new Date(now).getTime() - hours * 60 * 60 * 1000).toISOString();
  const result = db.prepare("UPDATE notification_deliveries SET status='failed', nextAttemptAt=NULL, receiptCheckAt=NULL, updatedAt=?, lastError=? WHERE status='awaiting_receipt' AND updatedAt < ?").run(new Date(now).toISOString(), 'receipt confirmation expired', cutoff);
  return { expired: result.changes, hours };
}

function purgeOldNotificationDeliveries(db, days = 30, now = new Date()) {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - Math.max(1, Math.min(3650, Math.floor(Number(days) || 30))));
  const result = db.prepare("DELETE FROM notification_deliveries WHERE updatedAt < ? AND status IN ('delivered','dead','failed')").run(d.toISOString());
  return { deleted: result.changes, days: Math.max(1, Math.min(3650, Math.floor(Number(days) || 30))) };
}

function purgeExpiredFeePreviews(db, now = new Date()) {
  const cutoff = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
  const result = db.prepare("DELETE FROM nexa_fee_previews WHERE expiresAt <= ? OR consumedAt IS NOT NULL").run(cutoff);
  return { deleted: result.changes };
}

function purgeOldWorkflowReceipts(db, days = 365, now = new Date()) {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - Math.max(1, Math.min(3650, Math.floor(Number(days) || 365))));
  const result = db.prepare("DELETE FROM ai_workflow_run_receipts WHERE createdAt < ?").run(d.toISOString());
  return { deleted: result.changes, days: Math.max(1, Math.min(3650, Math.floor(Number(days) || 365))) };
}

function purgeOrphanedWorkflowReceipts(db) {
  const result = db.prepare("DELETE FROM ai_workflow_run_receipts WHERE NOT EXISTS (SELECT 1 FROM ai_workflows w WHERE w.id=ai_workflow_run_receipts.workflowId AND w.userId=ai_workflow_run_receipts.userId)").run();
  return { deleted: result.changes };
}

function runMaintenance(db, now = new Date()) {
  return {
    sessions: purgeExpiredSessions(db, now),
    memories: purgeExpiredMemories(db, now),
    workflowRuns: purgeOldWorkflowRuns(db, 365, now),
    workflowReceipts: purgeOldWorkflowReceipts(db, 365, now),
    orphanedWorkflowReceipts: purgeOrphanedWorkflowReceipts(db),
    feePreviews: purgeExpiredFeePreviews(db, now),
    platformEvents: purgePlatformEvents(db, 30, now),
    notificationReceipts: expireStaleNotificationReceipts(db, 24, now),
    notificationDeliveries: purgeOldNotificationDeliveries(db, 30, now),
  };
}

module.exports = { purgeExpiredMemories, purgeOldWorkflowRuns, purgeOldWorkflowReceipts, purgeOrphanedWorkflowReceipts, purgeExpiredFeePreviews, expireStaleNotificationReceipts, purgeOldNotificationDeliveries, runMaintenance };
