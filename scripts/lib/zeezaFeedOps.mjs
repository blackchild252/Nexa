/**
 * Operations helpers for the read-only Zeeza admin AI feed adapter.
 * Pure functions with injectable clock, random and sleep so every rule is testable.
 * Nothing here calls an AI provider, changes rewards or billing, or logs account identifiers.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const FEED_SCHEMA_VERSION = 1;
export const FEED_SCHEMA_REVISION = 1;
export const SNAPSHOT_STALE_AFTER_SECONDS = 900;
export const DENIED_STOP_AFTER = 3;
export const SUPPORTED_SCHEMA_MAJOR = 1;
export const MAX_OUTPUT_BYTES = 2_000_000;

export const RETRY_POLICY = Object.freeze({
  maxAttempts: 3,
  baseDelayMs: 1_000,
  maxDelayMs: 60_000,
  maxRetryAfterMs: 300_000,
  runDeadlineMs: 45_000,
  watchMaxBackoffMs: 900_000,
});

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const RETRYABLE_CODES = new Set(['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EAI_AGAIN', 'EPIPE', 'UND_ERR_SOCKET', 'UND_ERR_CONNECT_TIMEOUT']);

/** M7742: a failure that carries enough facts to decide retry without parsing messages. */
export class FeedRequestError extends Error {
  constructor(message, { status = 0, retryable = false, retryAfterMs = null, code = '' } = {}) {
    super(message);
    this.name = 'FeedRequestError';
    this.status = status;
    this.retryable = retryable;
    this.retryAfterMs = retryAfterMs;
    this.code = code;
  }
}

/** Retry-After as seconds or HTTP date, capped. Returns null when absent or unusable. */
export function parseRetryAfter(value, now = Date.now()) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  let ms = null;
  if (/^\d+$/.test(text)) ms = Number(text) * 1000;
  else if (/[A-Za-z]/.test(text)) {
    const at = Date.parse(text);
    if (Number.isFinite(at)) ms = at - now;
  }
  if (!Number.isFinite(ms)) return null;
  return Math.min(RETRY_POLICY.maxRetryAfterMs, Math.max(0, Math.round(ms)));
}

export function classifyHttpFailure(status, retryAfterHeader, now = Date.now()) {
  const s = Number(status) || 0;
  return {
    status: s,
    retryable: RETRYABLE_STATUS.has(s),
    rateLimited: s === 429,
    retryAfterMs: parseRetryAfter(retryAfterHeader, now),
  };
}

/** M7742/M7754: network resets and timeouts retry; programmer errors and 4xx auth/shape errors never do. */
export function classifyThrown(error) {
  if (error instanceof FeedRequestError) return error;
  const code = String(error?.code || error?.cause?.code || '');
  const name = String(error?.name || '');
  if (name === 'TimeoutError' || (name === 'AbortError' && error?.timedOut)) return new FeedRequestError('Request timed out.', { retryable: true, code: 'TIMEOUT' });
  if (RETRYABLE_CODES.has(code)) return new FeedRequestError(`Connection problem (${code}).`, { retryable: true, code });
  if (name === 'TypeError' && /fetch failed|network|terminated/i.test(String(error?.message || ''))) return new FeedRequestError('Connection problem.', { retryable: true, code: code || 'NETWORK' });
  return error;
}

/** M7743: exponential backoff with jitter, honouring Retry-After, always bounded. */
export function computeBackoffMs(attempt, { retryAfterMs = null, random = Math.random } = {}) {
  const n = Math.max(1, Math.floor(attempt) || 1);
  const exp = Math.min(RETRY_POLICY.maxDelayMs, RETRY_POLICY.baseDelayMs * 2 ** (n - 1));
  const jittered = Math.round(exp / 2 + random() * (exp / 2));
  const wanted = retryAfterMs === null ? jittered : Math.max(jittered, retryAfterMs);
  return Math.min(RETRY_POLICY.maxRetryAfterMs, wanted);
}

/**
 * Runs `task(attemptNumber)` with bounded retries for transient failures only.
 * Stops early when the overall deadline would be passed or the signal is aborted.
 */
export async function withRetry(task, { sleep = defaultSleep, random = Math.random, now = Date.now, signal, policy = RETRY_POLICY } = {}) {
  const started = now();
  let last;
  for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
    if (signal?.aborted) throw new FeedRequestError('Stopped before the request ran.', { code: 'ABORTED' });
    try {
      return await task(attempt);
    } catch (raw) {
      last = classifyThrown(raw);
      const retryable = last instanceof FeedRequestError && last.retryable;
      if (!retryable || attempt === policy.maxAttempts) throw last;
      const delay = computeBackoffMs(attempt, { retryAfterMs: last.retryAfterMs, random });
      if (now() - started + delay > policy.runDeadlineMs) throw last;
      await sleep(delay, signal);
    }
  }
  throw last;
}

export function defaultSleep(ms, signal) {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const timer = setTimeout(done, ms);
    function done() { signal?.removeEventListener?.('abort', done); clearTimeout(timer); resolve(); }
    signal?.addEventListener?.('abort', done, { once: true });
  });
}

/** M7743: next watch delay. Failures stretch the interval, rate limits honour Retry-After; success resets. */
export function nextWatchDelayMs({ intervalMs, consecutiveFailures = 0, retryAfterMs = null, random = Math.random }) {
  if (consecutiveFailures <= 0) return intervalMs;
  const stretched = Math.min(RETRY_POLICY.watchMaxBackoffMs, intervalMs * 2 ** Math.min(consecutiveFailures, 6));
  const jittered = Math.round(stretched * (0.9 + random() * 0.2));
  return Math.min(RETRY_POLICY.watchMaxBackoffMs, Math.max(intervalMs, jittered, retryAfterMs || 0));
}

/**
 * M7744 + M7745: one run at a time, scheduled after the previous run ends,
 * stoppable at any moment. `run` must resolve or reject; it never overlaps itself.
 */
export function createWatchRunner({ run, intervalMs, sleep = defaultSleep, onSuccess = () => {}, onFailure = () => {}, random = Math.random } = {}) {
  if (typeof run !== 'function') throw new Error('run is required.');
  const controller = new AbortController();
  const state = { inFlight: false, stopped: false, runs: 0, overlapAttempts: 0, consecutiveFailures: 0, maxConcurrent: 0, concurrent: 0, lastRetryAfterMs: null };
  async function runOnce() {
    if (state.inFlight) { state.overlapAttempts += 1; return 'skipped_overlap'; }
    if (state.stopped) return 'stopped';
    state.inFlight = true; state.concurrent += 1; state.maxConcurrent = Math.max(state.maxConcurrent, state.concurrent); state.runs += 1;
    try {
      const result = await run(controller.signal);
      state.consecutiveFailures = 0;
      onSuccess(result);
      return 'ok';
    } catch (error) {
      state.consecutiveFailures += 1;
      state.lastRetryAfterMs = classifyThrown(error)?.retryAfterMs ?? null;
      onFailure(error, state.consecutiveFailures);
      return 'failed';
    } finally { state.concurrent -= 1; state.inFlight = false; }
  }
  async function start() {
    while (!state.stopped) {
      const outcome = await runOnce();
      if (state.stopped) break;
      const retryAfterMs = outcome === 'failed' ? (state.lastRetryAfterMs ?? null) : null;
      await sleep(nextWatchDelayMs({ intervalMs, consecutiveFailures: state.consecutiveFailures, retryAfterMs, random }), controller.signal);
    }
    return state;
  }
  function stop() { state.stopped = true; controller.abort(); }
  return { start, stop, runOnce, state, signal: controller.signal };
}

/** M7746: freshness numbers only. No identifiers, no token, no notification text. */
export function createFreshnessTracker(now = () => Date.now()) {
  const s = { lastSuccessAt: null, lastAttemptAt: null, lastOutcome: 'none', consecutiveFailures: 0, totalRuns: 0, totalFailures: 0, campaigns: 0, notifications: 0 };
  return {
    success(payload) {
      s.lastAttemptAt = s.lastSuccessAt = now(); s.lastOutcome = 'ok'; s.consecutiveFailures = 0; s.totalRuns += 1;
      s.campaigns = Number(payload?.summary?.campaigns) || 0; s.notifications = Number(payload?.summary?.relevantNotifications) || 0;
    },
    failure(kind = 'error') {
      s.lastAttemptAt = now(); s.lastOutcome = ['rate_limited', 'timeout', 'denied', 'transient', 'invalid'].includes(kind) ? kind : 'error';
      s.consecutiveFailures += 1; s.totalRuns += 1; s.totalFailures += 1;
    },
    metrics(staleAfterMs = 900_000) {
      const t = now();
      const age = s.lastSuccessAt === null ? null : Math.max(0, Math.round((t - s.lastSuccessAt) / 1000));
      return {
        metric: 'zeeza_admin_feed_freshness',
        lastOutcome: s.lastOutcome,
        ageSecondsSinceLastSuccess: age,
        stale: age === null ? true : age * 1000 > staleAfterMs,
        consecutiveFailures: s.consecutiveFailures,
        totalRuns: s.totalRuns,
        totalFailures: s.totalFailures,
        campaigns: s.campaigns,
        relevantNotifications: s.notifications,
      };
    },
  };
}

export function failureKind(error) {
  const e = classifyThrown(error);
  if (e?.status === 429) return 'rate_limited';
  if (e?.status === 401 || e?.status === 403) return 'denied';
  if (e?.code === 'TIMEOUT') return 'timeout';
  if (e instanceof FeedRequestError && e.retryable) return 'transient';
  if (/not JSON|not valid JSON|invalid|shape/i.test(String(e?.message || ''))) return 'invalid';
  return 'error';
}

/** M7748: consumer-side compatibility rules for the emitted payload. */
export function checkFeedSchemaCompatibility(payload, supportedMajor = SUPPORTED_SCHEMA_MAJOR) {
  const major = payload?.schemaVersion;
  if (!Number.isInteger(major) || major < 1) return { compatible: false, reason: 'schemaVersion is missing or not a positive whole number.' };
  if (major !== supportedMajor) return { compatible: false, reason: `schemaVersion ${major} is not supported; this consumer reads ${supportedMajor}.` };
  const revision = payload?.schemaRevision;
  if (revision !== undefined && (!Number.isInteger(revision) || revision < 0)) return { compatible: false, reason: 'schemaRevision must be a whole number from 0.' };
  return { compatible: true, reason: 'Same major version. Unknown extra fields must be ignored; removed or retyped fields bump the major.' };
}

/** M7741: event-complete delivery may only be claimed when the server proves a durable cursor. */
export function evaluateDeliveryContract(serverResponse) {
  const c = serverResponse?.cursor;
  const valid = c && typeof c === 'object' && !Array.isArray(c)
    && c.durable === true && typeof c.value === 'string' && c.value.length > 0 && c.value.length <= 512;
  if (valid) return { mode: 'cursor', eventComplete: true, cursor: c.value, note: 'Server supplied a durable cursor.' };
  return { mode: 'snapshot', eventComplete: false, cursor: null, note: 'Bounded snapshot only. Events between polls can be missed; do not claim complete delivery.' };
}

/** M7749: optional operator allowlist of notification categories. Empty or absent means no extra filter. */
export function parseCategoryAllowlist(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const items = String(value).split(',').map((v) => v.trim().toLowerCase()).filter(Boolean);
  if (!items.length || items.length > 20) throw new Error('NEXA_FEED_NOTIFICATION_CATEGORIES must list 1 to 20 categories.');
  for (const i of items) if (!/^[a-z0-9_-]{1,40}$/.test(i)) throw new Error('Notification categories may only use letters, numbers, dash and underscore.');
  return new Set(items);
}

const FORBIDDEN_KEYS = /^(token|accesstoken|sessiontoken|authorization|password|secret|tokenhash|referraltoken|apikey)$/i;
const SECRET_SHAPES = [/\bbearer\s+[A-Za-z0-9._~+/-]{12,}/i, /\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{10,}/i, /-----BEGIN [A-Z ]*PRIVATE KEY-----/];

function walk(value, visit, depth = 0) {
  if (depth > 12) throw new Error('Feed output is nested too deeply.');
  if (Array.isArray(value)) { value.forEach((v) => walk(v, visit, depth + 1)); return; }
  if (value && typeof value === 'object') { for (const [k, v] of Object.entries(value)) { visit(k, v); walk(v, visit, depth + 1); } }
}

/** M7750: refuse to write anything that is malformed, oversized or carries secret-looking data. */
export function assertAgentInputIntegrity(payload, { token = '' } = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Feed output must be an object.');
  const compat = checkFeedSchemaCompatibility(payload);
  if (!compat.compatible) throw new Error(`Feed output rejected: ${compat.reason}`);
  if (!Array.isArray(payload.campaigns) || !Array.isArray(payload.notifications)) throw new Error('Feed output rejected: campaigns and notifications must be lists.');
  const s = payload.summary || {};
  if (s.campaigns !== payload.campaigns.length) throw new Error('Feed output rejected: campaign count does not match the list.');
  if (s.relevantNotifications !== payload.notifications.length) throw new Error('Feed output rejected: notification count does not match the list.');
  if (Date.parse(payload.generatedAt) > Date.now() + 300_000) throw new Error('Feed output rejected: generation time is in the future.');
  const ids = new Set();
  for (const c of payload.campaigns) {
    if (ids.has(c.campaignId)) throw new Error('Feed output rejected: duplicate campaign id.');
    ids.add(c.campaignId);
    if (Date.parse(c.campaignEndAt) < Date.parse(c.campaignStartAt)) throw new Error('Feed output rejected: a campaign ends before it starts.');
  }
  if (payload.handling && (payload.handling.externalAiProvider !== 'disabled' || payload.handling.mutations !== 'none')) throw new Error('Feed output rejected: handling rules say an AI provider or a change is allowed.');
  if (payload.correlationId !== undefined && !isCorrelationId(payload.correlationId)) throw new Error('Feed output rejected: correlation id has the wrong shape.');
  walk(payload, (key) => { if (FORBIDDEN_KEYS.test(key)) throw new Error('Feed output rejected: a secret-named field is present.'); });
  const text = JSON.stringify(payload);
  if (Buffer.byteLength(text, 'utf8') > MAX_OUTPUT_BYTES) throw new Error('Feed output rejected: larger than the size limit.');
  if (token && token.length >= 16 && text.includes(token)) throw new Error('Feed output rejected: it contains the admin token.');
  if (SECRET_SHAPES.some((re) => re.test(text))) throw new Error('Feed output rejected: it contains secret-looking text.');
  return { ok: true, bytes: Buffer.byteLength(text, 'utf8'), sha256: crypto.createHash('sha256').update(text).digest('hex') };
}

const PUBLIC_SEGMENTS = new Set(['public', 'static', 'www', 'wwwroot', 'htdocs', 'dist', 'web-build', 'build', '_next', '.well-known', 'assets']);

/** M7751: the output file must be a new private .json file outside any public or static folder. */
export function assertSafeOutputPath(output, { cwd = process.cwd() } = {}) {
  if (typeof output !== 'string' || !output.trim() || output.includes('\0')) throw new Error('--output requires a file path.');
  const target = path.resolve(cwd, output);
  if (path.extname(target).toLowerCase() !== '.json') throw new Error('--output must end in .json.');
  const dir = path.dirname(target);
  let realDir = dir;
  try { realDir = fs.realpathSync(dir); } catch { throw new Error('--output folder does not exist.'); }
  const check = (p) => p.split(path.sep).filter(Boolean).some((seg) => PUBLIC_SEGMENTS.has(seg.toLowerCase()));
  if (check(path.relative(cwd, target)) || check(realDir) || check(dir)) throw new Error('--output must not be inside a public, static or build folder.');
  return path.join(realDir, path.basename(target));
}

/** Safe stderr summary of a failure: no URL, no headers, no token. */
export function describeFailure(error, max = 180) {
  const e = classifyThrown(error);
  const msg = String(e?.message || 'unknown error').replace(/https?:\/\/\S+/gi, '[url]').replace(/\s+/g, ' ').trim().slice(0, max);
  return msg || 'unknown error';
}

/** M7747: the server sends readAt as an ISO string or null. Anything else is "unknown" and shown as unread. */
export function normalizeReadState(readAt) {
  if (readAt === null || readAt === undefined || readAt === '') return { read: false, state: 'unread' };
  if (typeof readAt === 'string' && readAt.length <= 80 && Number.isFinite(Date.parse(readAt))) return { read: true, state: 'read' };
  return { read: false, state: 'unknown' };
}

/** M7747: the server's unreadCount can never be smaller than the unread rows it just listed. */
export function checkUnreadConsistency(rawNotifications, unreadCount) {
  const rows = Array.isArray(rawNotifications) ? rawNotifications : [];
  const unreadInList = rows.filter((n) => n && typeof n === 'object' && !normalizeReadState(n.readAt).read).length;
  const unknown = rows.filter((n) => n && typeof n === 'object' && normalizeReadState(n.readAt).state === 'unknown').length;
  const countGiven = Number.isSafeInteger(unreadCount) && unreadCount >= 0;
  const consistent = (countGiven ? unreadCount >= unreadInList - unknown : true) && unknown === 0;
  return { consistent, serverUnreadCountPresent: countGiven, unknownReadStateCount: unknown };
}

/** M7752: stop hammering the API when the token is refused again and again; the operator must rotate it. */
export function deniedStopDecision(kind, consecutiveDenied, limit = DENIED_STOP_AFTER) {
  const next = kind === 'denied' ? consecutiveDenied + 1 : 0;
  return { consecutiveDenied: next, stop: next >= limit };
}

/** M7756: tell a consumer whether a saved snapshot is still current. Never throws. */
export function assessSnapshotFreshness(payload, { now = Date.now(), maxAgeSeconds = SNAPSHOT_STALE_AFTER_SECONDS } = {}) {
  const at = Date.parse(payload?.generatedAt);
  if (!Number.isFinite(at)) return { status: 'invalid', ageSeconds: null, warning: 'Snapshot has no valid generation time. Do not treat it as current.' };
  const age = Math.round((now - at) / 1000);
  if (age < -300) return { status: 'invalid', ageSeconds: age, warning: 'Snapshot is dated in the future. Do not treat it as current.' };
  const limit = Number.isInteger(payload?.freshness?.staleAfterSeconds) && payload.freshness.staleAfterSeconds > 0 ? payload.freshness.staleAfterSeconds : maxAgeSeconds;
  if (age > limit) return { status: 'stale', ageSeconds: age, warning: `Snapshot is ${age} seconds old (limit ${limit}). It is valid but not current; say so and do not claim live status.` };
  return { status: 'fresh', ageSeconds: Math.max(0, age), warning: null };
}

/** M7758/M7759/M7760: fixed handling rules that travel with every snapshot. */
export const SAVED_FILE_MAX_DAYS = 7;
export const FEED_HANDLING = Object.freeze({
  externalAiProvider: 'disabled',
  mutations: 'none',
  httpMethods: 'GET only',
  savedFile: Object.freeze({ maxDays: SAVED_FILE_MAX_DAYS, deleteWhenDone: true, containsAdminIdentifiers: true, mode: '0600' }),
});

/** M7761: a random per-run ID for support. It holds no account data, no token and no time-based secret. */
export function newCorrelationId(randomBytes = crypto.randomBytes) {
  return `feed-${randomBytes(8).toString('hex')}`;
}
export function isCorrelationId(value) { return typeof value === 'string' && /^feed-[0-9a-f]{16}$/.test(value); }

/**
 * M7757: a short list for a human reviewer. Notification title and body are left out by default because they
 * can name people. Only IDs, type, time and read state stay. Campaigns keep the fields a reviewer needs.
 */
export function buildReviewQueue(payload, { includeNotificationText = false } = {}) {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.campaigns) || !Array.isArray(payload.notifications)) throw new Error('Review queue needs a valid feed payload.');
  const campaigns = payload.campaigns.filter((c) => c.eligibleForReview || (Array.isArray(c.flags) && c.flags.length)).map((c) => ({
    campaignId: c.campaignId, status: c.status, campaignEndAt: c.campaignEndAt, qualifiedReferrals: c.qualifiedReferrals, target: c.target,
    rewardStatus: c.rewardStatus, eligibleForReview: Boolean(c.eligibleForReview), flags: Array.isArray(c.flags) ? c.flags : [],
  }));
  const notifications = payload.notifications.filter((n) => !n.read).map((n) => {
    const row = { notificationId: n.notificationId, type: n.type, createdAt: n.createdAt, readState: n.readState, relatedCampaignId: n.relatedCampaignId };
    if (includeNotificationText) { row.title = n.title; row.body = n.body; }
    return row;
  });
  return {
    kind: 'zeeza_human_review_queue',
    schemaVersion: payload.schemaVersion, schemaRevision: payload.schemaRevision,
    generatedAt: payload.generatedAt, correlationId: payload.correlationId || null,
    notificationTextIncluded: Boolean(includeNotificationText),
    handling: payload.handling || FEED_HANDLING,
    counts: { campaignsToReview: campaigns.length, unreadNotifications: notifications.length },
    campaigns, notifications,
  };
}
