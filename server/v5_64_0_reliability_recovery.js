'use strict';

const crypto = require('crypto');

const MAX_EVENT_BYTES = 64 * 1024;
const MAX_LOG_FIELD = 512;
const MAX_DEAD_LETTERS = 200;
const MAX_RECOVERY_BATCH = 500;
const DEFAULT_SHUTDOWN_MS = 10_000;

function boundedInt(value, min, max, fallback = min) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.trunc(n))) : fallback;
}

function normalizeErrorMessage(error) {
  return String(error && error.message ? error.message : error || 'unknown error').slice(0, MAX_LOG_FIELD);
}

function eventEnvelope({ type, source = 'server', severity = 'info', correlationId = null, actorId = null, payload = {} } = {}) {
  if (!type) throw new Error('event type is required');
  const body = JSON.stringify({ type: String(type).slice(0, 128), source: String(source).slice(0, 128), severity: String(severity).slice(0, 32), correlationId: correlationId ? String(correlationId).slice(0, 128) : null, actorId: actorId ? String(actorId).slice(0, 128) : null, payload });
  if (Buffer.byteLength(body, 'utf8') > MAX_EVENT_BYTES) throw new Error('event payload exceeds safety limit');
  return body;
}

function eventHash(body, previousHash = '') {
  return crypto.createHash('sha256').update(String(previousHash)).update('\n').update(String(body)).digest('hex');
}

function idempotencyFingerprint(parts) {
  return crypto.createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}

function staleLeaseBoundary(lockedAt, now = new Date(), leaseMs = 15 * 60 * 1000) {
  const t = new Date(lockedAt || 0).getTime();
  const n = new Date(now).getTime();
  return Number.isFinite(t) && Number.isFinite(n) && t <= n - Math.max(1000, Number(leaseMs) || 900000);
}

function retryDelayMs(attempts, base = 1000, cap = 60 * 60 * 1000) {
  const a = boundedInt(attempts, 0, 30, 0);
  return Math.min(cap, Math.max(1, Number(base) || 1000) * (2 ** Math.min(a, 10)));
}

function retryBudget(attempts, maxAttempts) {
  return boundedInt(attempts, 0, 100000, 0) < boundedInt(maxAttempts, 1, 100000, 1);
}

function safeDeadLetterLimit(limit) { return boundedInt(limit, 1, MAX_DEAD_LETTERS, 100); }
function safeRecoveryBatch(limit) { return boundedInt(limit, 1, MAX_RECOVERY_BATCH, 500); }
function safeShutdownMs(value) { return boundedInt(value, 1000, 120000, DEFAULT_SHUTDOWN_MS); }
function isTerminalJobStatus(status) { return ['completed', 'failed', 'cancelled'].includes(String(status)); }
function canCompleteJob(status) { return String(status) === 'running'; }
function canFailJob(status) { return String(status) === 'running'; }
function canCancelJob(status) { return ['queued', 'running'].includes(String(status)); }
function recoveryTransition(status, attempts, maxAttempts) {
  if (isTerminalJobStatus(status)) return { allowed: false, next: status };
  return retryBudget(attempts, maxAttempts) ? { allowed: true, next: 'queued' } : { allowed: true, next: 'failed' };
}
function workerIdentity(value) { const s = String(value || '').trim(); return s.length >= 3 && s.length <= 128 ? s : null; }
function queueName(value) { const s = String(value || 'default').trim(); return /^[A-Za-z0-9._:-]{1,80}$/.test(s) ? s : null; }
function jobType(value) { const s = String(value || '').trim(); return /^[A-Za-z0-9._:-]{1,128}$/.test(s) ? s : null; }
function correlationId(value) { const s = String(value || '').trim(); return /^[A-Za-z0-9._:-]{8,128}$/.test(s) ? s : null; }
function boundedText(value, max = MAX_LOG_FIELD) { return String(value == null ? '' : value).slice(0, boundedInt(max, 1, 4096, MAX_LOG_FIELD)); }
function redactOperationalValue(key, value) {
  const k = String(key || '').toLowerCase();
  if (/(token|secret|password|authorization|cookie|api[_-]?key|credential)/i.test(k)) return '[REDACTED]';
  return boundedText(value);
}
function operationalSnapshot(fields = {}) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) out[k] = redactOperationalValue(k, v);
  return out;
}
function readinessSummary(report) {
  return { production: !!report?.production, pass: Number(report?.pass || 0), warn: Number(report?.warn || 0), fail: Number(report?.fail || 0), skip: Number(report?.skip || 0), ok: report?.fail === 0 };
}
function shutdownPlan({ signal, timeoutMs = DEFAULT_SHUTDOWN_MS, activeJobs = 0 } = {}) {
  return { signal: boundedText(signal || 'SIGTERM', 32), timeoutMs: safeShutdownMs(timeoutMs), activeJobs: boundedInt(activeJobs, 0, 1000000, 0), drainRequired: boundedInt(activeJobs, 0, 1000000, 0) > 0 };
}
function backupFreshnessStatus(lastBackupAt, now = new Date(), maxAgeMs = 24 * 60 * 60 * 1000) {
  if (!lastBackupAt) return 'missing';
  const age = new Date(now).getTime() - new Date(lastBackupAt).getTime();
  if (!Number.isFinite(age)) return 'invalid';
  return age <= Math.max(1000, Number(maxAgeMs) || 86400000) ? 'fresh' : 'stale';
}

const CONTROLS = [
  ['M950','job-type-format','job type format boundary',jobType],
  ['M951','queue-name-format','queue name format boundary',queueName],
  ['M952','worker-identity-bound','worker identity boundary',workerIdentity],
  ['M953','event-size-bound','operational event size boundary',(v)=>{try{eventEnvelope(v);return true}catch{return false}}],
  ['M954','event-hash-chain','operational event hash chaining',(v)=>/^[a-f0-9]{64}$/.test(eventHash(String(v || 'body')))],
  ['M955','idempotency-fingerprint','deterministic idempotency fingerprint',(v)=>idempotencyFingerprint(v).length===64],
  ['M956','stale-lease-boundary','stale worker lease boundary',(v)=>staleLeaseBoundary(v.lockedAt,v.now,v.leaseMs)],
  ['M957','retry-delay-cap','bounded exponential retry delay',(v)=>retryDelayMs(v.attempts,v.base,v.cap)<=Math.max(1,Number(v.cap)||3600000)],
  ['M958','retry-budget-boundary','retry budget transition',(v)=>typeof retryBudget(v.attempts,v.maxAttempts)==='boolean'],
  ['M959','dead-letter-limit','dead-letter query cap',(v)=>safeDeadLetterLimit(v) <= 200],
  ['M960','recovery-batch-cap','recovery batch cap',(v)=>safeRecoveryBatch(v) <= 500],
  ['M961','terminal-job-state','terminal job state invariant',(v)=>isTerminalJobStatus(v)],
  ['M962','complete-transition','job completion transition',(v)=>canCompleteJob(v)],
  ['M963','fail-transition','job failure transition',(v)=>canFailJob(v)],
  ['M964','cancel-transition','job cancellation transition',(v)=>canCancelJob(v)],
  ['M965','recovery-transition','stale recovery transition',(v)=>recoveryTransition(v.status,v.attempts,v.maxAttempts).allowed],
  ['M966','correlation-id-boundary','correlation identifier boundary',(v)=>correlationId(v)!==null],
  ['M967','bounded-log-field','bounded operational log field',(v)=>boundedText(v).length<=512],
  ['M968','secret-redaction','operational secret redaction',(v)=>redactOperationalValue(v.key,v.value)==='[REDACTED]'],
  ['M969','snapshot-redaction','operational snapshot redaction',(v)=>operationalSnapshot(v).password==='[REDACTED]'],
  ['M970','readiness-summary','readiness summary normalization',(v)=>readinessSummary(v).ok === (v.fail===0)],
  ['M971','shutdown-timeout','bounded shutdown timeout',(v)=>safeShutdownMs(v)<=120000],
  ['M972','shutdown-drain','shutdown drain planning',(v)=>shutdownPlan(v).drainRequired === (Number(v.activeJobs)>0)],
  ['M973','backup-freshness','backup freshness boundary',(v)=>['fresh','stale','missing','invalid'].includes(backupFreshnessStatus(v.lastBackupAt,v.now,v.maxAgeMs))],
  ['M974','recovery-integrity-cert','V5.64 cumulative recovery certification',(v)=>v === '5.64.0'],
];

module.exports = { MAX_EVENT_BYTES, MAX_LOG_FIELD, MAX_DEAD_LETTERS, MAX_RECOVERY_BATCH, DEFAULT_SHUTDOWN_MS, CONTROLS, boundedInt, normalizeErrorMessage, eventEnvelope, eventHash, idempotencyFingerprint, staleLeaseBoundary, retryDelayMs, retryBudget, safeDeadLetterLimit, safeRecoveryBatch, safeShutdownMs, isTerminalJobStatus, canCompleteJob, canFailJob, canCancelJob, recoveryTransition, workerIdentity, queueName, jobType, correlationId, boundedText, redactOperationalValue, operationalSnapshot, readinessSummary, shutdownPlan, backupFreshnessStatus };
