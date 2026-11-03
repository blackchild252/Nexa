"use strict";

const crypto = require("crypto");
const reliability = require("./v5_64_0_reliability_recovery");

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_LEASE_MS = 15 * 60 * 1000;
const MAX_PAYLOAD_BYTES = 64 * 1024;

function ensureSchema(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS platform_jobs (
    id TEXT PRIMARY KEY,
    queue TEXT NOT NULL,
    type TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    attempts INTEGER NOT NULL DEFAULT 0,
    maxAttempts INTEGER NOT NULL DEFAULT 5,
    availableAt TEXT NOT NULL,
    lockedAt TEXT,
    lockedBy TEXT,
    lastError TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  ); CREATE INDEX IF NOT EXISTS idx_platform_jobs_claim ON platform_jobs(status, queue, availableAt);`);
}

function enqueue(db, { queue = "default", type, payload = {}, maxAttempts = DEFAULT_MAX_ATTEMPTS, availableAt = new Date().toISOString() }) {
  type = reliability.jobType(type);
  queue = reliability.queueName(queue);
  if (!type) throw new Error("Invalid job type.");
  if (!queue) throw new Error("Invalid queue name.");
  const encoded = JSON.stringify(payload);
  if (Buffer.byteLength(encoded, "utf8") > MAX_PAYLOAD_BYTES) throw new Error("Job payload exceeds the 64KB safety limit.");
  const now = new Date().toISOString();
  const id = `job_${crypto.randomBytes(12).toString("hex")}`;
  db.prepare("INSERT INTO platform_jobs(id,queue,type,payload,status,attempts,maxAttempts,availableAt,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?)")
    .run(id, String(queue), String(type), encoded, "queued", 0, Math.max(1, Number(maxAttempts) || DEFAULT_MAX_ATTEMPTS), availableAt, now, now);
  return { id, queue, type, status: "queued", availableAt };
}

function claim(db, { queue = "default", workerId, now = new Date().toISOString() } = {}) {
  workerId = reliability.workerIdentity(workerId);
  queue = reliability.queueName(queue);
  if (!workerId) throw new Error("Invalid workerId.");
  if (!queue) throw new Error("Invalid queue name.");
  const tx = db.transaction(() => {
    const row = db.prepare("SELECT * FROM platform_jobs WHERE queue=? AND status='queued' AND availableAt<=? ORDER BY availableAt ASC, createdAt ASC LIMIT 1").get(String(queue), now);
    if (!row) return null;
    const changed = db.prepare("UPDATE platform_jobs SET status='running', attempts=attempts+1, lockedAt=?, lockedBy=?, updatedAt=? WHERE id=? AND status='queued'").run(now, String(workerId), now, row.id);
    if (!changed.changes) return null;
    return { ...row, status: "running", attempts: row.attempts + 1, lockedAt: now, lockedBy: String(workerId) };
  });
  return tx();
}

function complete(db, id, now = new Date().toISOString()) {
  return db.prepare("UPDATE platform_jobs SET status='completed', lockedAt=NULL, lockedBy=NULL, updatedAt=? WHERE id=? AND status='running'").run(now, id).changes > 0;
}

function fail(db, id, error, now = Date.now()) {
  const row = db.prepare("SELECT * FROM platform_jobs WHERE id=? AND status='running'").get(id);
  if (!row) return false;
  const terminal = row.attempts >= row.maxAttempts;
  const next = new Date(now + reliability.retryDelayMs(row.attempts)).toISOString();
  const status = terminal ? "failed" : "queued";
  db.prepare("UPDATE platform_jobs SET status=?, availableAt=?, lockedAt=NULL, lockedBy=NULL, lastError=?, updatedAt=? WHERE id=?")
    .run(status, next, String(error || "Job failed").slice(0, 1000), new Date(now).toISOString(), id);
  return true;
}

function recoverStale(db, { now = new Date(), leaseMs = DEFAULT_LEASE_MS, limit = 500 } = {}) {
  const at = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const cutoff = new Date(at - Math.max(1000, Number(leaseMs) || DEFAULT_LEASE_MS)).toISOString();
  const rows = db.prepare("SELECT * FROM platform_jobs WHERE status='running' AND lockedAt IS NOT NULL AND lockedAt <= ? ORDER BY lockedAt ASC LIMIT ?").all(cutoff, reliability.safeRecoveryBatch(limit));
  let requeued = 0, failed = 0;
  const tx = db.transaction(() => {
    for (const row of rows) {
      const terminal = Number(row.attempts) >= Number(row.maxAttempts);
      const status = terminal ? "failed" : "queued";
      db.prepare("UPDATE platform_jobs SET status=?, lockedAt=NULL, lockedBy=NULL, lastError=?, updatedAt=? WHERE id=? AND status='running'")
        .run(status, terminal ? "stale lease exhausted retry budget" : "stale worker lease recovered", new Date(at).toISOString(), row.id);
      if (terminal) failed++; else requeued++;
    }
  });
  tx();
  return { scanned: rows.length, requeued, failed };
}

function deadLetters(db, limit = 100) {
  const safe = reliability.safeDeadLetterLimit(limit);
  return db.prepare("SELECT id,queue,type,attempts,maxAttempts,lastError,createdAt,updatedAt FROM platform_jobs WHERE status='failed' ORDER BY updatedAt DESC LIMIT ?").all(safe);
}

module.exports = { DEFAULT_MAX_ATTEMPTS, DEFAULT_LEASE_MS, MAX_PAYLOAD_BYTES, ensureSchema, enqueue, claim, complete, fail, recoverStale, deadLetters };
