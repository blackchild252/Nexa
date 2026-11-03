"use strict";

// B145: incoming calls use the high-importance Android "calls" channel and expire with the ring window.
function isCallPush(data) { return Boolean(data && (data.screen === "call" || data.type === "group_call")); }

const crypto = require("crypto");

const MAX_ATTEMPTS = 5;
const BASE_RETRY_MS = 30_000;
const MAX_RETRY_MS = 60 * 60 * 1000;
const MAX_BATCH = 50;
const STALE_SENDING_MS = 15 * 60 * 1000;
const PROVIDER_TIMEOUT_MS = 15_000;
const RECEIPT_DELAY_MS = 60_000;
const RECEIPT_BATCH = 50;
const RECEIPT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const RECEIPT_LEASE_MS = 5 * 60 * 1000;
const PERMANENT_RECEIPT_ERRORS = new Set(['DeviceNotRegistered', 'MessageTooBig', 'InvalidCredentials', 'MismatchSenderId']);

function deliveryId(eventId, token) {
  return `nd_${crypto.createHash("sha256").update(`${eventId}\0${token}`).digest("hex").slice(0, 48)}`;
}


const PUSH_DATA_DENYLIST = /(?:message|body|text|preview|content|description|summary|private|sensitive|secret|token|password|authorization|email|phone|address)/i;
const SAFE_CHAT_ACTIONS = new Set(["dm_thread", "chat_room", "call"]);

function safePushMessage(event, token) {
  let data = {};
  try { data = JSON.parse(event?.data || "{}"); } catch (_) {}
  if (!data || typeof data !== "object" || Array.isArray(data)) data = {};
  const call = isCallPush(data);
  const privateChat = String(event?.type || "").toLowerCase() === "chat" || data.sensitive === true || data.containsSensitiveContent === true;
  const safeData = {};
  if (privateChat || call) {
    const action = String(data.action || data.screen || "").trim().toLowerCase();
    if (SAFE_CHAT_ACTIONS.has(action)) safeData.action = action;
    const candidateId = data.id ?? data.threadId ?? data.roomId ?? data.callId;
    if (candidateId != null && /^[A-Za-z0-9._:-]{1,160}$/.test(String(candidateId))) safeData.id = String(candidateId);
  } else {
    for (const [key, value] of Object.entries(data)) {
      if (!PUSH_DATA_DENYLIST.test(key) && /^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(key) && (value == null || ["string", "number", "boolean"].includes(typeof value))) safeData[key] = value;
    }
  }
  if (call) return { to: token, title: "Incoming call", body: "Open Zeeza to answer.", data: safeData, sound: "default", channelId: "calls", priority: "high", ttl: 45 };
  if (privateChat) return { to: token, title: "New Zeeza message", body: "Open Zeeza to view your message.", data: safeData, sound: "default" };
  return { to: token, title: String(event?.title || "NEXA").slice(0, 120), body: String(event?.body || "").slice(0, 180), data: safeData, sound: "default" };
}

function backoffMs(attempts) {
  const n = Math.max(1, Number(attempts) || 1);
  return Math.min(MAX_RETRY_MS, BASE_RETRY_MS * (2 ** Math.min(n - 1, 8)));
}

function enqueue(db, event, tokens, now = new Date()) {
  const nowIso = new Date(now).toISOString();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO notification_deliveries
      (id,eventId,token,status,attempts,nextAttemptAt,createdAt,updatedAt,lastError)
    VALUES (?,?,?,?,?,?,?,?,NULL)`);
  let queued = 0;
  for (const token of [...new Set((tokens || []).map(String))].slice(0, MAX_BATCH)) {
    const result = stmt.run(deliveryId(event.id, token), event.id, token, "pending", 0, nowIso, nowIso, nowIso);
    queued += result.changes;
  }
  return queued;
}

function providerAdapterEnabled(fetchImpl) {
  // An injected adapter is an explicit test/local integration choice. The process-global
  // network adapter is disabled unless an operator opts in through configuration.
  return fetchImpl !== globalThis.fetch || process.env.NEXA_PUSH_DELIVERY_ENABLED === "true";
}

function scheduleRetry(db, row, error, now = new Date()) {
  const attempts = Number(row.attempts || 0) + 1;
  const terminal = attempts >= MAX_ATTEMPTS;
  const next = terminal ? null : new Date(new Date(now).getTime() + backoffMs(attempts)).toISOString();
  db.prepare(`UPDATE notification_deliveries
    SET status=?, attempts=?, nextAttemptAt=?, updatedAt=?, lastError=? WHERE id=?`)
    .run(terminal ? "failed" : "retry", attempts, next, new Date(now).toISOString(), String(error || "delivery failed").slice(0, 240), row.id);
  return { status: terminal ? "failed" : "retry", attempts, nextAttemptAt: next };
}

async function deliverOne(db, row, now = new Date(), fetchImpl = globalThis.fetch, timeoutMs = PROVIDER_TIMEOUT_MS) {
  if (!providerAdapterEnabled(fetchImpl)) return { status: "skipped", reason: "provider_disabled" };
  // Claim the row before touching the provider. This prevents overlapping request/startup
  // workers from delivering the same event/device pair concurrently.
  const claimed = db.prepare("UPDATE notification_deliveries SET status='sending', updatedAt=? WHERE id=? AND status IN ('pending','retry')")
    .run(new Date(now).toISOString(), row.id);
  if (!claimed.changes) return { status: 'skipped', reason: 'already_claimed' };
  row = { ...row, status: 'sending' };
  if (typeof fetchImpl !== "function") return scheduleRetry(db, row, "provider unavailable", now);
  const event = db.prepare("SELECT id,userId,title,body,data FROM notification_events WHERE id=?").get(row.eventId);
  if (!event) {
    db.prepare("UPDATE notification_deliveries SET status='failed', updatedAt=?, lastError=? WHERE id=?")
      .run(new Date(now).toISOString(), "notification event missing", row.id);
    return { status: "failed", reason: "event_missing" };
  }
  // A push token is an installation identifier, not an account identifier.
  // The same device can switch accounts, so never deliver an old queued event
  // unless the token is still registered to the event owner at send time.
  const tokenOwner = db.prepare("SELECT 1 FROM push_tokens WHERE token=? AND userId=?").get(row.token, event.userId);
  if (!tokenOwner) {
    db.prepare("UPDATE notification_deliveries SET status='dead', attempts=attempts+1, nextAttemptAt=NULL, updatedAt=?, lastError=? WHERE id=?")
      .run(new Date(now).toISOString(), "push token no longer belongs to notification owner", row.id);
    return { status: "dead", reason: "token_owner_changed" };
  }
  const pushMessage = safePushMessage(event, row.token);
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const safeTimeout = Math.max(1_000, Math.min(60_000, Number(timeoutMs) || PROVIDER_TIMEOUT_MS));
  const timer = controller ? setTimeout(() => controller.abort(), safeTimeout) : null;
  try {
    const request = {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify([pushMessage]),
    };
    if (controller) request.signal = controller.signal;
    const response = await fetchImpl("https://exp.host/--/api/v2/push/send", request);
    const payload = await response.json().catch(() => null);
    const ticket = payload?.data?.[0];
    if (ticket?.status === "ok" || (response.ok && !ticket?.status)) {
      const ticketId = String(ticket?.id || '').trim();
      if (!ticketId) return scheduleRetry(db, row, 'provider returned no ticket id', now);
      const nextReceipt = new Date(new Date(now).getTime() + RECEIPT_DELAY_MS).toISOString();
      db.prepare("UPDATE notification_deliveries SET status='awaiting_receipt', attempts=attempts+1, nextAttemptAt=?, providerTicketId=?, updatedAt=?, lastError=NULL WHERE id=?")
        .run(nextReceipt, ticketId, new Date(now).toISOString(), row.id);
      return { status: "awaiting_receipt", ticketId };
    }
    if (ticket?.details?.error === "DeviceNotRegistered") {
      db.prepare("DELETE FROM push_tokens WHERE token=? AND userId=?").run(row.token, event.userId);
      db.prepare("UPDATE notification_deliveries SET status='dead', attempts=attempts+1, nextAttemptAt=NULL, updatedAt=?, lastError=? WHERE id=?")
        .run(new Date(now).toISOString(), "DeviceNotRegistered", row.id);
      return { status: "dead" };
    }
    return scheduleRetry(db, row, ticket?.message || `HTTP ${response.status}`, now);
  } catch (error) {
    return scheduleRetry(db, row, error?.name === "AbortError" ? `provider timeout after ${safeTimeout}ms` : (error?.message || "network error"), now);
  } finally {
    if (timer) clearTimeout(timer);
  }
}


function normalizeReceiptError(receipt) {
  return String(receipt?.details?.error || receipt?.message || receipt?.error || "receipt failed").slice(0, 240);
}

async function processReceipts(db, now = new Date(), limit = RECEIPT_BATCH, fetchImpl = globalThis.fetch) {
  if (!providerAdapterEnabled(fetchImpl)) return { attempted: 0, delivered: 0, retried: 0, dead: 0, failed: 0, expired: 0, skipped: "provider_disabled" };
  const safeLimit = Math.max(1, Math.min(RECEIPT_BATCH, Number(limit) || RECEIPT_BATCH));
  const cutoff = new Date(new Date(now).getTime() - RECEIPT_MAX_AGE_MS).toISOString();
  const rows = db.prepare(`SELECT * FROM notification_deliveries
    WHERE status='awaiting_receipt' AND providerTicketId IS NOT NULL AND nextAttemptAt <= ? AND updatedAt >= ?
    ORDER BY nextAttemptAt ASC LIMIT ?`).all(new Date(now).toISOString(), cutoff, safeLimit);
  const claimedRows = [];
  for (const candidate of rows) {
    const claimed = db.prepare("UPDATE notification_deliveries SET status='receipt_checking', receiptCheckAt=?, updatedAt=? WHERE id=? AND status='awaiting_receipt'")
      .run(new Date(now).toISOString(), new Date(now).toISOString(), candidate.id);
    if (claimed.changes) claimedRows.push({ ...candidate, status: 'receipt_checking' });
  }
  const claimedCount = claimedRows.length;
  if (!claimedRows.length) return { attempted: 0, delivered: 0, retried: 0, dead: 0, failed: 0, expired: 0 };
  if (typeof fetchImpl !== 'function') {
    for (const row of claimedRows) db.prepare("UPDATE notification_deliveries SET status='awaiting_receipt', receiptCheckAt=NULL, updatedAt=? WHERE id=? AND status='receipt_checking'").run(new Date(now).toISOString(), row.id);
    return { attempted: 0, delivered: 0, retried: claimedRows.length, dead: 0, failed: 0, expired: 0 };
  }
  const ids = claimedRows.map((r) => String(r.providerTicketId)).filter(Boolean);
  let payload;
  try {
    const response = await fetchImpl('https://exp.host/--/api/v2/push/getReceipts', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ ids })
    });
    payload = await response.json().catch(() => null);
    if (!response.ok || !payload || typeof payload.data !== 'object') throw new Error(`receipt HTTP ${response.status}`);
  } catch (error) {
    for (const row of claimedRows) scheduleRetry(db, { ...row, status: 'retry', attempts: Number(row.attempts || 0) }, error?.message || 'receipt provider unavailable', now);
    return { attempted: claimedCount, delivered: 0, retried: claimedCount, dead: 0, failed: 0, expired: 0 };
  }
  const results = { attempted: claimedCount, delivered: 0, retried: 0, dead: 0, failed: 0, expired: 0 };
  for (const row of claimedRows) {
    const receipt = payload.data?.[row.providerTicketId];
    if (!receipt) {
      const age = new Date(now).getTime() - new Date(row.createdAt || now).getTime();
      if (age >= RECEIPT_MAX_AGE_MS) {
        db.prepare("UPDATE notification_deliveries SET status='failed', nextAttemptAt=NULL, receiptCheckAt=NULL, updatedAt=?, lastError=? WHERE id=? AND status='receipt_checking'")
          .run(new Date(now).toISOString(), 'receipt expired without provider confirmation', row.id);
        results.failed++; results.expired++;
      } else {
        db.prepare("UPDATE notification_deliveries SET status='awaiting_receipt', nextAttemptAt=?, receiptCheckAt=NULL, updatedAt=? WHERE id=? AND status='receipt_checking'")
          .run(new Date(new Date(now).getTime() + RECEIPT_DELAY_MS).toISOString(), new Date(now).toISOString(), row.id);
        results.retried++;
      }
      continue;
    }
    if (receipt.status === 'ok') {
      db.prepare("UPDATE notification_deliveries SET status='delivered', receiptStatus='ok', receiptAt=?, receiptCheckAt=NULL, nextAttemptAt=NULL, updatedAt=?, lastError=NULL WHERE id=? AND status='receipt_checking'")
        .run(new Date(now).toISOString(), new Date(now).toISOString(), row.id);
      results.delivered++; continue;
    }
    const errorCode = String(receipt?.details?.error || '');
    const message = normalizeReceiptError(receipt);
    if (PERMANENT_RECEIPT_ERRORS.has(errorCode)) {
      if (errorCode === 'DeviceNotRegistered') {
        const eventOwner = db.prepare("SELECT userId FROM notification_events WHERE id=?").get(row.eventId);
        if (eventOwner) db.prepare("DELETE FROM push_tokens WHERE token=? AND userId=?").run(row.token, eventOwner.userId);
      }
      db.prepare("UPDATE notification_deliveries SET status='dead', receiptStatus=?, receiptAt=?, receiptCheckAt=NULL, nextAttemptAt=NULL, updatedAt=?, lastError=? WHERE id=? AND status='receipt_checking'")
        .run(errorCode || 'permanent_error', new Date(now).toISOString(), new Date(now).toISOString(), message, row.id);
      results.dead++; continue;
    }
    const retry = scheduleRetry(db, { ...row, status: 'retry' }, message, now);
    db.prepare("UPDATE notification_deliveries SET receiptStatus=?, receiptAt=? WHERE id=? AND status='retry'").run(errorCode || 'error', new Date(now).toISOString(), row.id);
    retry.status === 'failed' ? results.failed++ : results.retried++;
  }
  return results;
}

function recoverStaleReceiptChecks(db, now = new Date()) {
  const cutoff = new Date(new Date(now).getTime() - RECEIPT_LEASE_MS).toISOString();
  const result = db.prepare(`UPDATE notification_deliveries
    SET status='awaiting_receipt', receiptCheckAt=NULL, updatedAt=?, nextAttemptAt=?, lastError=?
    WHERE status='receipt_checking' AND receiptCheckAt < ?`).run(
      new Date(now).toISOString(), new Date(now).toISOString(), 'stale receipt worker recovered', cutoff
  );
  return { recovered: result.changes, cutoff };
}

async function deliverDue(db, now = new Date(), limit = MAX_BATCH, fetchImpl = globalThis.fetch) {
  const safeLimit = Math.max(1, Math.min(MAX_BATCH, Number(limit) || MAX_BATCH));
  const nowIso = new Date(now).toISOString();
  const rows = db.prepare(`SELECT * FROM notification_deliveries
    WHERE status IN ('pending','retry') AND nextAttemptAt <= ?
    ORDER BY nextAttemptAt ASC LIMIT ?`).all(nowIso, safeLimit);
  const results = [];
  for (const row of rows) results.push(await deliverOne(db, row, now, fetchImpl));
  recoverStaleReceiptChecks(db, now);
  const receipts = await processReceipts(db, now, MAX_BATCH, fetchImpl);
  return {
    attempted: rows.length + receipts.attempted,
    delivered: results.filter((r) => r.status === "delivered").length + receipts.delivered,
    awaitingReceipt: results.filter((r) => r.status === "awaiting_receipt").length,
    retried: results.filter((r) => r.status === "retry").length + receipts.retried,
    dead: results.filter((r) => r.status === "dead").length + receipts.dead,
    failed: results.filter((r) => r.status === "failed").length + receipts.failed,
    pendingProvider: results.filter((r) => r.reason === "provider_unavailable").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    receipts,
  };
}

/** Puts deliveries stuck in "sending" back to "retry". The background worker calls it for everyone; a signed-in user's request passes { userId } so it only touches that user's own deliveries. */
function recoverStaleSending(db, now = new Date(), { userId = null } = {}) {
  const cutoff = new Date(new Date(now).getTime() - STALE_SENDING_MS).toISOString();
  const scope = userId ? " AND eventId IN (SELECT id FROM notification_events WHERE userId=?)" : "";
  const args = [new Date(now).toISOString(), new Date(now).toISOString(), 'stale delivery worker recovered', cutoff];
  if (userId) args.push(String(userId));
  const result = db.prepare(`UPDATE notification_deliveries
    SET status='retry', nextAttemptAt=?, updatedAt=?, lastError=?
    WHERE status='sending' AND updatedAt < ?${scope}`).run(...args);
  return { recovered: result.changes, cutoff };
}

module.exports = { MAX_ATTEMPTS, BASE_RETRY_MS, MAX_RETRY_MS, MAX_BATCH, STALE_SENDING_MS, PROVIDER_TIMEOUT_MS, RECEIPT_DELAY_MS, RECEIPT_BATCH, RECEIPT_MAX_AGE_MS, RECEIPT_LEASE_MS, deliveryId, backoffMs, enqueue, deliverOne, processReceipts, deliverDue, recoverStaleSending, recoverStaleReceiptChecks, safePushMessage, providerAdapterEnabled };
