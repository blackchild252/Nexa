"use strict";

const jobQueue = require("./jobQueue");
const vendorSubscriptions = require("./vendorSubscriptions");

const QUEUE = "vendor-subscriptions";
const REMINDER_JOB = "vendor_subscription_day25_reminder";
const EXPIRY_JOB = "vendor_subscription_expiry_sweep";

function ensureSchema(db) {
  jobQueue.ensureSchema(db);
  vendorSubscriptions.ensureSchema(db);
}

function enqueueReminder(db, period) {
  ensureSchema(db);
  const existing = db.prepare("SELECT id FROM platform_jobs WHERE queue=? AND type=? AND payload LIKE ? AND status IN ('queued','running') LIMIT 1")
    .get(QUEUE, REMINDER_JOB, `%"periodId":"${String(period.id).replace(/[%_]/g, "")}"%`);
  if (existing) return existing.id;
  return jobQueue.enqueue(db, { queue: QUEUE, type: REMINDER_JOB, payload: { periodId: period.id }, availableAt: period.reminderAt }).id;
}

function enqueueExpirySweep(db, now = new Date()) {
  ensureSchema(db);
  const iso = new Date(now).toISOString();
  const existing = db.prepare("SELECT id FROM platform_jobs WHERE queue=? AND type=? AND status IN ('queued','running') LIMIT 1").get(QUEUE, EXPIRY_JOB);
  if (existing) return existing.id;
  return jobQueue.enqueue(db, { queue: QUEUE, type: EXPIRY_JOB, payload: {}, availableAt: iso }).id;
}

async function processOne(db, { sendPush, now = new Date(), workerId = `vendor-subscriptions-${process.pid}` } = {}) {
  ensureSchema(db);
  const job = jobQueue.claim(db, { queue: QUEUE, workerId, now: new Date(now).toISOString() });
  if (!job) return { processed: false };
  let payload = {};
  try { payload = JSON.parse(job.payload || "{}"); } catch (_) {}
  try {
    if (job.type === REMINDER_JOB) {
      const period = db.prepare("SELECT * FROM vendor_subscription_periods WHERE id=?").get(payload.periodId);
      if (!period || period.status !== vendorSubscriptions.PERIOD_STATUSES.ACTIVE) {
        jobQueue.complete(db, job.id);
        return { processed: true, type: job.type, skipped: true };
      }
      const sent = vendorSubscriptions.markReminderSent(db, period.id, period.userId, "DAY_25", new Date(now).toISOString());
      if (sent && typeof sendPush === "function") {
        await sendPush(
          period.userId,
          "NEXA vendor subscription",
          "Your NEXA vendor subscription expires in 5 days. Renew for ₦10,000 for the next 30 days to remain active in the market.",
          { screen: "chat", type: "chat", action: "chat", vendorId: period.vendorId, dedupeKey: `vendor-subscription-day25:${period.id}` }
        );
      }
      jobQueue.complete(db, job.id);
      return { processed: true, type: job.type, sent };
    }
    if (job.type === EXPIRY_JOB) {
      const expired = vendorSubscriptions.expireDue(db, now);
      jobQueue.complete(db, job.id);
      enqueueExpirySweep(db, new Date(new Date(now).getTime() + 60 * 1000));
      return { processed: true, type: job.type, expired };
    }
    jobQueue.complete(db, job.id);
    return { processed: true, type: job.type, skipped: true };
  } catch (e) {
    jobQueue.fail(db, job.id, e?.message || "Vendor subscription job failed");
    throw e;
  }
}

async function tick(db, { sendPush, now = new Date(), workerId } = {}) {
  ensureSchema(db);
  const current = new Date(now);
  vendorSubscriptions.expireDue(db, current);
  for (const period of vendorSubscriptions.dueReminders(db, current, 100)) enqueueReminder(db, period);
  enqueueExpirySweep(db, current);
  const results = [];
  for (let i = 0; i < 20; i++) {
    const result = await processOne(db, { sendPush, now: current, workerId });
    if (!result.processed) break;
    results.push(result);
  }
  return results;
}

module.exports = { QUEUE, REMINDER_JOB, EXPIRY_JOB, ensureSchema, enqueueReminder, enqueueExpirySweep, processOne, tick };
