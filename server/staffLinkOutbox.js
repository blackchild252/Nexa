// Staff link event outbox (M7785, sending side). Main records WHAT must be told to Admin or Central
// (link id, event type, target) and nothing else. The signed event is built fresh each time it is
// handed out, because a signed event goes stale after 5 minutes and a retry must not send an old one.
// No permissions, codes, credentials or raw error text are stored here.
// This module does not make any HTTP call. A sender (not built yet) takes what claimDue() returns.
"use strict";
const crypto = require("crypto");
const { EVENT_TYPES, TARGETS } = require("./staffLinkEvents");

const OUTBOX_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS staff_link_outbox (
  id TEXT PRIMARY KEY,
  linkId TEXT NOT NULL,
  type TEXT NOT NULL,
  target TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  nextAttemptAt INTEGER NOT NULL,
  leaseUntil INTEGER,
  lastError TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
-- The same news for the same link and target is queued once while it is still waiting.
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_outbox_once ON staff_link_outbox(linkId, type, target) WHERE status IN ('pending','claimed');
CREATE INDEX IF NOT EXISTS idx_staff_outbox_due ON staff_link_outbox(status, nextAttemptAt);
`;

const OUTBOX_STATUSES = Object.freeze(["pending", "claimed", "sent", "dead"]);
const DEFAULTS = Object.freeze({ maxAttempts: 6, baseDelayMs: 30 * 1000, maxDelayMs: 30 * 60 * 1000, leaseMs: 60 * 1000, batch: 20 });

class OutboxError extends Error {
  constructor(code) { super(code); this.code = code; }
}

const isText = (v, max = 100) => typeof v === "string" && v.length > 0 && v.length <= max;
// Only a short machine word is kept as the reason. Anything else becomes "unknown", so raw errors, URLs and secrets are never stored.
const safeCode = (c) => (typeof c === "string" && /^[a-z][a-z0-9_]{0,39}$/.test(c) ? c : "unknown");

function createStaffLinkOutbox(db, { signer, now = () => Date.now(), options = {} } = {}) {
  if (!signer || typeof signer.buildEvent !== "function") throw new OutboxError("signer_required");
  const cfg = { ...DEFAULTS, ...options };
  db.exec(OUTBOX_SCHEMA_SQL);

  function tx(fn) {
    db.exec("SAVEPOINT nexa_outbox_tx");
    try { const r = fn(); db.exec("RELEASE nexa_outbox_tx"); return r; }
    catch (e) { try { db.exec("ROLLBACK TO nexa_outbox_tx"); db.exec("RELEASE nexa_outbox_tx"); } catch (_) { /* original error wins */ } throw e; }
  }
  const iso = () => new Date(now()).toISOString();
  const insert = db.prepare("INSERT OR IGNORE INTO staff_link_outbox (id,linkId,type,target,status,attempts,nextAttemptAt,createdAt,updatedAt) VALUES (?,?,?,?,'pending',0,?,?,?)");
  const dueRows = db.prepare("SELECT * FROM staff_link_outbox WHERE (status = 'pending' AND nextAttemptAt <= ?) OR (status = 'claimed' AND leaseUntil <= ?) ORDER BY nextAttemptAt, createdAt LIMIT ?");
  const lease = db.prepare("UPDATE staff_link_outbox SET status = 'claimed', leaseUntil = ?, updatedAt = ? WHERE id = ? AND ((status = 'pending' AND nextAttemptAt <= ?) OR (status = 'claimed' AND leaseUntil <= ?))");
  const linkRow = db.prepare("SELECT * FROM staff_links WHERE id = ?");
  const byId = db.prepare("SELECT * FROM staff_link_outbox WHERE id = ?");
  const markDone = db.prepare("UPDATE staff_link_outbox SET status = 'sent', leaseUntil = NULL, lastError = NULL, updatedAt = ? WHERE id = ? AND status = 'claimed'");
  const markRetry = db.prepare("UPDATE staff_link_outbox SET status = 'pending', attempts = ?, nextAttemptAt = ?, leaseUntil = NULL, lastError = ?, updatedAt = ? WHERE id = ? AND status = 'claimed'");
  const markDead = db.prepare("UPDATE staff_link_outbox SET status = 'dead', attempts = ?, leaseUntil = NULL, lastError = ?, updatedAt = ? WHERE id = ? AND status IN ('claimed','pending')");
  const counts = db.prepare("SELECT status, COUNT(*) AS n FROM staff_link_outbox GROUP BY status");

  // Queue one piece of news for one target. Asking twice while it still waits does nothing.
  function enqueue(linkId, type, target) {
    if (!isText(linkId)) throw new OutboxError("bad_link");
    if (!EVENT_TYPES.includes(type)) throw new OutboxError("bad_type");
    if (!TARGETS.includes(target)) throw new OutboxError("bad_target");
    const t = iso();
    const r = insert.run(crypto.randomUUID(), linkId, type, target, now(), t, t);
    return { queued: Number(r.changes) === 1 };
  }
  // Admin and Central both hear about every change. Both rows land together or neither does.
  function enqueueForLink(linkId, type) {
    return tx(() => TARGETS.map((target) => ({ target, ...enqueue(linkId, type, target) })));
  }

  // Hands out due items and takes a short lease on each, so two workers never send the same one.
  // A lease that runs out (a sender that crashed) makes the item due again.
  function claimDue(limit = cfg.batch) {
    const n = Math.max(1, Math.min(Number(limit) || cfg.batch, 100));
    const t = now();
    const out = [];
    for (const row of dueRows.all(t, t, n)) {
      const got = lease.run(t + cfg.leaseMs, iso(), row.id, t, t);
      if (Number(got.changes) !== 1) continue; // someone else took it
      const link = linkRow.get(row.linkId);
      if (!link) { markDead.run(row.attempts + 1, "link_missing", iso(), row.id); continue; }
      out.push({ id: row.id, target: row.target, type: row.type, attempt: row.attempts + 1, event: signer.buildEvent(link, row.type, row.target) });
    }
    return out;
  }

  function markSent(id) {
    const r = markDone.run(iso(), id);
    if (Number(r.changes) !== 1) throw new OutboxError("not_claimed");
    return { status: "sent" };
  }
  // The sender reports a short reason word. The next try waits longer each time; after the last try the item is dead.
  function markFailed(id, reason) {
    const row = byId.get(id);
    if (!row || row.status !== "claimed") throw new OutboxError("not_claimed");
    const attempts = row.attempts + 1;
    const code = safeCode(reason);
    if (attempts >= cfg.maxAttempts) { markDead.run(attempts, code, iso(), id); return { status: "dead", attempts }; }
    const wait = Math.min(cfg.baseDelayMs * 2 ** (attempts - 1), cfg.maxDelayMs);
    markRetry.run(attempts, now() + wait, code, iso(), id);
    return { status: "pending", attempts, retryInMs: wait };
  }

  function summary() {
    const s = Object.fromEntries(OUTBOX_STATUSES.map((k) => [k, 0]));
    for (const r of counts.all()) if (r.status in s) s[r.status] = Number(r.n);
    return s;
  }
  return { enqueue, enqueueForLink, claimDue, markSent, markFailed, summary };
}

module.exports = { OUTBOX_SCHEMA_SQL, OUTBOX_STATUSES, DEFAULTS, OutboxError, createStaffLinkOutbox };
