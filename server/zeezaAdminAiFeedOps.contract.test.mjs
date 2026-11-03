import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  FeedRequestError, parseRetryAfter, classifyHttpFailure, classifyThrown, computeBackoffMs, withRetry,
  nextWatchDelayMs, createWatchRunner, createFreshnessTracker, failureKind, checkFeedSchemaCompatibility,
  evaluateDeliveryContract, parseCategoryAllowlist, assertAgentInputIntegrity, assertSafeOutputPath, describeFailure,
  RETRY_POLICY, MAX_OUTPUT_BYTES,
} from '../scripts/lib/zeezaFeedOps.mjs';
import { fetchAdminFeed, buildAgentInput, sanitizeNotifications, writeSnapshot } from '../scripts/zeeza-admin-ai-feed.mjs';

const TOKEN = 'a-valid-admin-session-token';
const campaign = { id: 'c1', userId: 'u1', accountType: 'user', campaignStartAt: '2026-10-01T00:00:00Z', campaignEndAt: '2026-10-31T00:00:00Z', status: 'active', qualifiedReferrals: 3, referralsInWindow: 3, target: 30, rewardStatus: 'in_progress', eligibleForReview: false };
const json = (payload, status = 200, extra = {}) => new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json', ...extra } });
const noSleep = async () => {};
const goodFetch = (extra = {}) => async (url) => String(url).includes('referral-followups')
  ? json({ programme: 'zeeza', kitchenHubSeparate: true, followups: [campaign], ...extra })
  : json({ notifications: [] });

// ---- M7741 durable cursor contract
test('M7741: without a durable server cursor the feed says snapshot-only and never claims event-complete', async () => {
  assert.deepEqual(evaluateDeliveryContract(null), { mode: 'snapshot', eventComplete: false, cursor: null, note: evaluateDeliveryContract(null).note });
  for (const bad of [{ cursor: 'abc' }, { cursor: { value: 'abc' } }, { cursor: { durable: false, value: 'abc' } }, { cursor: { durable: true, value: '' } }, { cursor: { durable: true, value: 'x'.repeat(600) } }, { cursor: [] }]) {
    assert.equal(evaluateDeliveryContract(bad).eventComplete, false);
  }
  const out = await fetchAdminFeed({ base: 'https://admin.example', token: TOKEN, fetchImpl: goodFetch(), sleep: noSleep });
  assert.equal(out.delivery.eventComplete, false);
  assert.equal(out.delivery.mode, 'snapshot');
});
test('M7741: a valid durable cursor from the server is passed through as the only way to claim completeness', async () => {
  const d = evaluateDeliveryContract({ cursor: { durable: true, value: 'cur-123' } });
  assert.deepEqual([d.mode, d.eventComplete, d.cursor], ['cursor', true, 'cur-123']);
  const out = await fetchAdminFeed({ base: 'https://admin.example', token: TOKEN, fetchImpl: goodFetch({ cursor: { durable: true, value: 'cur-9' } }), sleep: noSleep });
  assert.equal(out.delivery.cursor, 'cur-9');
});

// ---- M7742 retry
test('M7742: transient statuses retry, permanent ones do not', () => {
  for (const s of [408, 425, 429, 500, 502, 503, 504]) assert.equal(classifyHttpFailure(s).retryable, true, String(s));
  for (const s of [400, 401, 403, 404, 405, 422, 501]) assert.equal(classifyHttpFailure(s).retryable, false, String(s));
});
test('M7742: a 503 then success returns data after one retry; a 403 is tried once only', async () => {
  let calls = 0;
  const flaky = async (url) => {
    if (String(url).includes('referral-followups')) { calls += 1; if (calls === 1) return json({}, 503); return json({ programme: 'zeeza', kitchenHubSeparate: true, followups: [campaign] }); }
    return json({ notifications: [] });
  };
  const out = await fetchAdminFeed({ base: 'https://admin.example', token: TOKEN, fetchImpl: flaky, sleep: noSleep, random: () => 0 });
  assert.equal(calls, 2); assert.equal(out.summary.campaigns, 1);
  let denied = 0;
  await assert.rejects(fetchAdminFeed({ base: 'https://admin.example', token: TOKEN, fetchImpl: async () => { denied += 1; return json({}, 403); }, sleep: noSleep }), /authorized admin session/);
  assert.equal(denied, 2); // one call per endpoint, no retries
});
test('M7742: retries are capped at the policy limit', async () => {
  let n = 0;
  await assert.rejects(withRetry(async () => { n += 1; throw new FeedRequestError('x', { retryable: true, status: 503 }); }, { sleep: noSleep, random: () => 0 }));
  assert.equal(n, RETRY_POLICY.maxAttempts);
});
test('M7742: non-feed errors (bugs) are never retried', async () => {
  let n = 0;
  await assert.rejects(withRetry(async () => { n += 1; throw new RangeError('bug'); }, { sleep: noSleep }), /bug/);
  assert.equal(n, 1);
});

// ---- M7743 rate limit and bounded backoff
test('M7743: Retry-After seconds and dates are honoured and capped', () => {
  assert.equal(parseRetryAfter('7'), 7000);
  assert.equal(parseRetryAfter('999999'), RETRY_POLICY.maxRetryAfterMs);
  assert.equal(parseRetryAfter('Wed, 21 Oct 2026 07:28:10 GMT', Date.parse('Wed, 21 Oct 2026 07:28:00 GMT')), 10000);
  assert.equal(parseRetryAfter('Wed, 21 Oct 2026 07:28:00 GMT', Date.parse('Thu, 22 Oct 2026 07:28:00 GMT')), 0);
  for (const bad of [null, undefined, '', 'soon', '-5']) assert.equal(parseRetryAfter(bad), null);
});
test('M7743: backoff grows, has jitter, never exceeds the cap and respects Retry-After', () => {
  const lo = computeBackoffMs(1, { random: () => 0 }), hi = computeBackoffMs(1, { random: () => 1 });
  assert.ok(lo >= 500 && hi <= 1000 && lo < hi);
  assert.ok(computeBackoffMs(2, { random: () => 0 }) >= lo);
  assert.ok(computeBackoffMs(30, { random: () => 1 }) <= RETRY_POLICY.maxDelayMs);
  assert.equal(computeBackoffMs(1, { random: () => 0, retryAfterMs: 20000 }), 20000);
  assert.ok(computeBackoffMs(1, { retryAfterMs: 10 ** 9 }) <= RETRY_POLICY.maxRetryAfterMs);
});
test('M7743: a 429 with Retry-After waits at least that long before retrying', async () => {
  const waits = []; let calls = 0;
  const fetchImpl = async (url) => {
    if (String(url).includes('referral-followups')) { calls += 1; return calls === 1 ? json({}, 429, { 'retry-after': '12' }) : json({ programme: 'zeeza', kitchenHubSeparate: true, followups: [] }); }
    return json({ notifications: [] });
  };
  await fetchAdminFeed({ base: 'https://admin.example', token: TOKEN, fetchImpl, sleep: async (ms) => { waits.push(ms); }, random: () => 0 });
  assert.equal(waits.length, 1); assert.ok(waits[0] >= 12000);
});
test('M7743: the retry loop gives up instead of waiting past the run deadline', async () => {
  let t = 0, n = 0;
  await assert.rejects(withRetry(async () => { n += 1; throw new FeedRequestError('x', { retryable: true, retryAfterMs: 40000 }); }, { sleep: async (ms) => { t += ms; }, now: () => t, random: () => 0 }));
  assert.equal(n, 2); // second wait would cross 45 s, so no third attempt
});
test('M7743: watch delay stretches on failure, stays bounded and resets after success', () => {
  const base = { intervalMs: 60000, random: () => 0.5 };
  assert.equal(nextWatchDelayMs({ ...base, consecutiveFailures: 0 }), 60000);
  assert.ok(nextWatchDelayMs({ ...base, consecutiveFailures: 1 }) > 60000);
  assert.ok(nextWatchDelayMs({ ...base, consecutiveFailures: 50 }) <= RETRY_POLICY.watchMaxBackoffMs);
  assert.equal(nextWatchDelayMs({ ...base, consecutiveFailures: 1, retryAfterMs: 400000 }), 400000);
  assert.equal(nextWatchDelayMs({ ...base, consecutiveFailures: 1, retryAfterMs: 10 ** 9 }), RETRY_POLICY.watchMaxBackoffMs);
});

// ---- M7744 no overlapping polls
test('M7744: a second run request while one is in flight is skipped, never run in parallel', async () => {
  let release; const gate = new Promise((r) => { release = r; });
  const runner = createWatchRunner({ run: async () => { await gate; }, intervalMs: 10000, sleep: noSleep });
  const first = runner.runOnce();
  assert.equal(await runner.runOnce(), 'skipped_overlap');
  assert.equal(await runner.runOnce(), 'skipped_overlap');
  release(); assert.equal(await first, 'ok');
  assert.equal(runner.state.overlapAttempts, 2); assert.equal(runner.state.maxConcurrent, 1); assert.equal(runner.state.runs, 1);
});
test('M7744: the loop schedules the next run only after the previous one finished', async () => {
  const order = []; let runner; let n = 0;
  runner = createWatchRunner({
    run: async () => { order.push('start'); await Promise.resolve(); order.push('end'); n += 1; if (n === 3) runner.stop(); },
    intervalMs: 10000, sleep: async () => { order.push('sleep'); },
  });
  await runner.start();
  assert.deepEqual(order, ['start', 'end', 'sleep', 'start', 'end', 'sleep', 'start', 'end']);
  assert.equal(runner.state.maxConcurrent, 1);
});

// ---- M7745 safe shutdown
test('M7745: stop aborts the in-flight request signal and exits the loop without another run', async () => {
  let seen; let started; const startedP = new Promise((r) => { started = r; });
  const runner = createWatchRunner({ run: (signal) => { seen = signal; started(); return new Promise((_, rej) => signal.addEventListener('abort', () => rej(new FeedRequestError('aborted', { code: 'ABORTED' })))); }, intervalMs: 10000 });
  const loop = runner.start();
  await startedP; runner.stop();
  const state = await loop;
  assert.equal(seen.aborted, true); assert.equal(state.runs, 1); assert.equal(state.inFlight, false);
});
test('M7745: stop during the sleep ends the loop promptly', async () => {
  const runner = createWatchRunner({ run: async () => {}, intervalMs: 3_600_000 });
  const loop = runner.start();
  await new Promise((r) => setTimeout(r, 20)); runner.stop();
  const state = await Promise.race([loop, new Promise((r) => setTimeout(() => r('hung'), 1000))]);
  assert.notEqual(state, 'hung');
});
test('M7745: a stopped runner refuses new runs', async () => {
  const runner = createWatchRunner({ run: async () => {}, intervalMs: 10000, sleep: noSleep }); runner.stop();
  assert.equal(await runner.runOnce(), 'stopped');
});
test('M7745: an aborted signal stops retries before another request is sent', async () => {
  const c = new AbortController(); c.abort(); let n = 0;
  await assert.rejects(withRetry(async () => { n += 1; }, { signal: c.signal }), /Stopped/);
  assert.equal(n, 0);
});

// ---- M7746 freshness metrics without identifiers
test('M7746: metrics report age, stale flag and counts and carry no identifiers, text or token', () => {
  let t = 1_000_000; const tr = createFreshnessTracker(() => t);
  assert.equal(tr.metrics().stale, true);
  const payload = buildAgentInput({ followups: [campaign], notifications: [{ id: 'n1', title: 'Zeeza alert for bob@example.com', body: 'x', type: 'referral' }], generatedAt: '2026-10-11T00:00:00Z' });
  tr.success(payload); t += 120_000;
  const m = tr.metrics(900_000);
  assert.equal(m.ageSecondsSinceLastSuccess, 120); assert.equal(m.stale, false); assert.equal(m.campaigns, 1); assert.equal(m.relevantNotifications, 1);
  t += 900_000; assert.equal(tr.metrics(900_000).stale, true);
  tr.failure('rate_limited'); const f = tr.metrics();
  assert.equal(f.lastOutcome, 'rate_limited'); assert.equal(f.consecutiveFailures, 1);
  const text = JSON.stringify([m, f]);
  assert.doesNotMatch(text, /u1|c1|n1|bob|example\.com|token/i);
});
test('M7746: failure kinds are coarse labels', () => {
  assert.equal(failureKind(new FeedRequestError('x', { status: 429, retryable: true })), 'rate_limited');
  assert.equal(failureKind(new FeedRequestError('x', { status: 403 })), 'denied');
  assert.equal(failureKind(Object.assign(new Error('t'), { name: 'TimeoutError' })), 'timeout');
  assert.equal(failureKind(new Error('response was not JSON.')), 'invalid');
  assert.equal(failureKind(new RangeError('bug')), 'error');
});

// ---- M7748 schema version compatibility
test('M7748: same major is compatible; missing, newer major or bad revision is refused', () => {
  const ok = buildAgentInput({ followups: [], notifications: [] });
  assert.equal(ok.schemaVersion, 1); assert.equal(ok.schemaRevision, 1);
  assert.equal(checkFeedSchemaCompatibility(ok).compatible, true);
  assert.equal(checkFeedSchemaCompatibility({ ...ok, newField: 'ignored' }).compatible, true);
  for (const bad of [{}, { schemaVersion: 0 }, { schemaVersion: 2 }, { schemaVersion: '1' }, { schemaVersion: 1, schemaRevision: -1 }, { schemaVersion: 1, schemaRevision: 'a' }, null]) assert.equal(checkFeedSchemaCompatibility(bad).compatible, false);
});

// ---- M7749 category allowlist
test('M7749: allowlist parsing is strict and filtering keeps only listed categories', () => {
  assert.equal(parseCategoryAllowlist(undefined), null); assert.equal(parseCategoryAllowlist('  '), null);
  assert.deepEqual([...parseCategoryAllowlist('Referral, reward')], ['referral', 'reward']);
  assert.throws(() => parseCategoryAllowlist('a b'), /letters, numbers/);
  assert.throws(() => parseCategoryAllowlist(Array.from({ length: 21 }, (_, i) => `c${i}`).join(',')), /1 to 20/);
  const rows = [{ id: '1', title: 'Zeeza a', type: 'referral' }, { id: '2', title: 'Zeeza b', type: 'reward' }, { id: '3', title: 'Zeeza c', type: 'x', data: { category: 'activation' } }];
  assert.equal(sanitizeNotifications(rows).length, 3);
  assert.deepEqual(sanitizeNotifications(rows, parseCategoryAllowlist('reward,activation')).map((r) => r.notificationId), ['2', '3']);
});

// ---- M7750 output integrity
test('M7750: a clean payload passes and returns size and hash', () => {
  const p = buildAgentInput({ followups: [campaign], notifications: [] });
  const r = assertAgentInputIntegrity(p, { token: TOKEN });
  assert.equal(r.ok, true); assert.match(r.sha256, /^[0-9a-f]{64}$/);
});
test('M7750: wrong counts, duplicates, backwards dates, secret keys, secret text, token and oversize are all refused', () => {
  const p = () => buildAgentInput({ followups: [campaign], notifications: [] });
  let x = p(); x.summary.campaigns = 5; assert.throws(() => assertAgentInputIntegrity(x), /count does not match/);
  x = p(); x.campaigns.push({ ...x.campaigns[0] }); x.summary.campaigns = 2; assert.throws(() => assertAgentInputIntegrity(x), /duplicate/);
  x = p(); x.campaigns[0].campaignEndAt = '2020-01-01T00:00:00.000Z'; assert.throws(() => assertAgentInputIntegrity(x), /ends before/);
  x = p(); x.campaigns[0].token = 'abc'; assert.throws(() => assertAgentInputIntegrity(x), /secret-named/);
  x = p(); x.notifications = [{ body: 'Bearer abcdefghijklmnopqrstuv' }]; x.summary.relevantNotifications = 1; assert.throws(() => assertAgentInputIntegrity(x), /secret-looking/);
  x = p(); x.authority = `leak ${TOKEN}`; assert.throws(() => assertAgentInputIntegrity(x, { token: TOKEN }), /admin token/);
  x = p(); x.authority = 'y'.repeat(MAX_OUTPUT_BYTES); assert.throws(() => assertAgentInputIntegrity(x), /size limit/);
  x = p(); x.schemaVersion = 9; assert.throws(() => assertAgentInputIntegrity(x), /rejected/);
  assert.throws(() => assertAgentInputIntegrity([]), /object/);
});
test('M7750: writeSnapshot refuses a bad payload before creating any file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'feed-'));
  const out = path.join(dir, 'a.json'); const bad = buildAgentInput({ followups: [campaign], notifications: [] }); bad.summary.campaigns = 9;
  assert.throws(() => writeSnapshot(bad, out), /rejected/);
  assert.equal(fs.existsSync(out), false);
});

// ---- M7751 no public/static output
test('M7751: output must be a new .json outside public, static, build and asset folders', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'feedroot-'));
  for (const d of ['public', 'static', 'dist', 'web-build', 'assets', 'private']) fs.mkdirSync(path.join(root, d));
  assert.ok(assertSafeOutputPath('private/feed.json', { cwd: root }).endsWith(path.join('private', 'feed.json')));
  for (const bad of ['public/feed.json', 'static/feed.json', 'dist/feed.json', 'web-build/feed.json', 'assets/feed.json', 'PUBLIC/feed.json']) assert.throws(() => assertSafeOutputPath(bad, { cwd: root }), /public, static or build|does not exist/, bad);
  assert.throws(() => assertSafeOutputPath('private/feed.txt', { cwd: root }), /\.json/);
  assert.throws(() => assertSafeOutputPath('nope/feed.json', { cwd: root }), /does not exist/);
  assert.throws(() => assertSafeOutputPath('', { cwd: root }), /requires/);
});
test('M7751: a symlink that points into a public folder is refused', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'feedlink-'));
  fs.mkdirSync(path.join(root, 'public')); fs.mkdirSync(path.join(root, 'ok'));
  fs.symlinkSync(path.join(root, 'public'), path.join(root, 'ok', 'link'));
  assert.throws(() => assertSafeOutputPath('ok/link/feed.json', { cwd: root }), /public, static or build/);
});

// ---- M7754 timeout and connection reset (contract tests)
test('M7754: connection reset and timeout are retried, then surface a safe message with no URL or token', async () => {
  let n = 0;
  const reset = async () => { n += 1; const e = new TypeError('fetch failed'); e.cause = { code: 'ECONNRESET' }; throw e; };
  await assert.rejects(fetchAdminFeed({ base: 'https://admin.example', token: TOKEN, fetchImpl: reset, sleep: noSleep, random: () => 0 }), (err) => {
    assert.match(describeFailure(err), /Connection problem/); assert.doesNotMatch(describeFailure(err) + String(err.message), /admin\.example|a-valid-admin/); return true;
  });
  assert.ok(n >= RETRY_POLICY.maxAttempts);
  let t = 0;
  const timeoutFetch = async () => { t += 1; throw Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' }); };
  await assert.rejects(fetchAdminFeed({ base: 'https://admin.example', token: TOKEN, fetchImpl: timeoutFetch, sleep: noSleep, random: () => 0 }), /timed out/i);
  assert.ok(t >= RETRY_POLICY.maxAttempts);
  assert.equal(classifyThrown(new RangeError('bug')).message, 'bug');
});
test('M7754: describeFailure strips URLs and bounds length', () => {
  assert.equal(describeFailure(new Error('boom https://x.example/a?token=1 end')), 'boom [url] end');
  assert.ok(describeFailure(new Error('z'.repeat(1000))).length <= 180);
});
