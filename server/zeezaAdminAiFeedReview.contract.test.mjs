import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildReviewQueue, FEED_HANDLING, newCorrelationId, isCorrelationId, assertAgentInputIntegrity } from '../scripts/lib/zeezaFeedOps.mjs';
import { buildAgentInput, fetchAdminFeed, readinessReport, parseArgs } from '../scripts/zeeza-admin-ai-feed.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOKEN = 'a-valid-admin-session-token';
const NOW = '2026-10-26T12:00:00.000Z';
const good = { id: 'c1', userId: 'u1', accountType: 'user', campaignStartAt: '2026-09-27T00:00:00Z', campaignEndAt: '2026-10-27T00:00:00Z', status: 'active', qualifiedReferrals: 30, referralsInWindow: 30, target: 30, rewardStatus: 'in_progress', eligibleForReview: true };
const calm = { ...good, id: 'c2', eligibleForReview: false, qualifiedReferrals: 1, referralsInWindow: 1 };
const notes = [
  { id: 'n1', title: 'Zeeza referral for Ada Obi', body: 'Ada Obi reached her target; call 0800-SECRET-BODY', type: 'referral', readAt: null, createdAt: NOW, data: { campaignId: 'c1' } },
  { id: 'n2', title: 'Zeeza read one', body: 'already read body', type: 'referral', readAt: NOW, createdAt: NOW, data: {} },
];
const payload = () => buildAgentInput({ followups: [good, calm], notifications: notes, generatedAt: NOW, unreadCount: 1 });

// ---- M7757
test('M7757: review queue leaves out notification title and body by default', () => {
  const q = buildReviewQueue(payload());
  const text = JSON.stringify(q);
  assert.equal(q.notificationTextIncluded, false);
  for (const leak of ['Ada Obi', 'SECRET-BODY', 'already read body', 'read one']) assert.ok(!text.includes(leak), leak);
  assert.deepEqual(q.notifications.map((n) => n.notificationId), ['n1']);
  assert.deepEqual(q.campaigns.map((c) => c.campaignId), ['c1']);
  assert.deepEqual(q.counts, { campaignsToReview: 1, unreadNotifications: 1 });
});
test('M7757: text is included only when the operator asks for it', () => {
  const q = buildReviewQueue(payload(), { includeNotificationText: true });
  assert.equal(q.notificationTextIncluded, true);
  assert.match(JSON.stringify(q), /SECRET-BODY/);
  assert.throws(() => buildReviewQueue(null), /valid feed payload/);
});
test('M7757: flags are parsed safely', () => {
  assert.equal(parseArgs(['--review-queue']).reviewQueue, true);
  assert.throws(() => parseArgs(['--include-notification-text']), /only works with --review-queue/);
  assert.throws(() => parseArgs(['--review-queue', '--watch']), /single export/);
});
function fakeApi() {
  const seen = [];
  const server = http.createServer((req, res) => {
    seen.push({ method: req.method, url: req.url, cid: req.headers['x-nexa-correlation-id'] });
    res.setHeader('content-type', 'application/json');
    if (req.url.startsWith('/api/admin/zeeza/referral-followups')) return res.end(JSON.stringify({ programme: 'zeeza', kitchenHubSeparate: true, followups: [good, calm] }));
    if (req.url.startsWith('/api/notifications')) return res.end(JSON.stringify({ notifications: notes, unreadCount: 1 }));
    res.statusCode = 404; res.end('{}');
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, seen, base: `http://127.0.0.1:${server.address().port}` })));
}
function runCli(args, env) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [path.join(root, 'scripts', 'zeeza-admin-ai-feed.mjs'), ...args], { env: { ...process.env, ...env }, cwd: root });
    let out = '', err = '';
    p.stdout.on('data', (d) => { out += d; }); p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => resolve({ code, out, err }));
  });
}
test('M7757/M7761: real CLI on loopback exports a review queue without text and sends only GET with a correlation id', async () => {
  const { server, seen, base } = await fakeApi();
  try {
    const r = await runCli(['--review-queue'], { NEXA_ADMIN_API_BASE: base, NEXA_ADMIN_API_TOKEN: TOKEN });
    assert.equal(r.code, 0, r.err);
    const q = JSON.parse(r.out);
    assert.equal(q.kind, 'zeeza_human_review_queue');
    assert.ok(!r.out.includes('SECRET-BODY') && !r.out.includes(TOKEN) && !r.err.includes(TOKEN));
    assert.ok(isCorrelationId(q.correlationId));
    assert.ok(seen.length >= 2 && seen.every((s) => s.method === 'GET'));
    assert.ok(seen.every((s) => s.cid === q.correlationId));
  } finally { server.close(); }
});

// ---- M7758
test('M7758: every snapshot states the saved-file retention rule, and the doc matches it', () => {
  const p = payload();
  assert.deepEqual(p.handling.savedFile, { maxDays: 7, deleteWhenDone: true, containsAdminIdentifiers: true, mode: '0600' });
  const doc = fs.readFileSync(path.join(root, 'docs', 'ZEEZA_ADMIN_AI_AGENT_HANDOFF.md'), 'utf8');
  assert.match(doc, /7 days/);
  assert.match(doc, /Retention and deletion/);
});
test('M7758: the script never deletes or overwrites files by itself', () => {
  const src = fs.readFileSync(path.join(root, 'scripts', 'zeeza-admin-ai-feed.mjs'), 'utf8');
  assert.doesNotMatch(src, /unlinkSync|rmSync|rmdirSync|fs\.promises\.rm|\.unlink\(/);
  assert.match(src, /flag: 'wx'/);
});

// ---- M7759
test('M7759: external AI providers stay disabled; nothing in the adapter can call one', () => {
  const src = fs.readFileSync(path.join(root, 'scripts', 'zeeza-admin-ai-feed.mjs'), 'utf8') + fs.readFileSync(path.join(root, 'scripts', 'lib', 'zeezaFeedOps.mjs'), 'utf8');
  assert.equal(FEED_HANDLING.externalAiProvider, 'disabled');
  assert.equal(payload().handling.externalAiProvider, 'disabled');
  assert.equal(readinessReport({ NEXA_ADMIN_API_BASE: 'http://127.0.0.1:1', NEXA_ADMIN_API_TOKEN: TOKEN }).checks.externalAiProvider, 'disabled');
  assert.doesNotMatch(src, /aiProviderGateway|api\.openai\.com|api\.anthropic\.com|api\.x\.ai|generativelanguage|DAMI_AI_PROVIDER|NEXA_AI_PROVIDER|XAI_|OPENAI_|require\(/);
  const imports = [...src.matchAll(/from '([^']+)'/g)].map((m) => m[1]);
  assert.ok(imports.every((i) => i.startsWith('node:') || i.startsWith('./')), imports.join(','));
});
test('M7759: output that says a provider or a change is allowed is refused', () => {
  const bad = payload(); bad.handling = { ...bad.handling, externalAiProvider: 'enabled' };
  assert.throws(() => assertAgentInputIntegrity(bad, { token: TOKEN }), /AI provider or a change/);
  const bad2 = payload(); bad2.handling = { ...bad2.handling, mutations: 'allowed' };
  assert.throws(() => assertAgentInputIntegrity(bad2, { token: TOKEN }), /AI provider or a change/);
});

// ---- M7760
test('M7760: the adapter sends GET only, has no write endpoints and imports no server reward or billing code', () => {
  const src = fs.readFileSync(path.join(root, 'scripts', 'zeeza-admin-ai-feed.mjs'), 'utf8');
  assert.doesNotMatch(src, /method:\s*'(POST|PUT|PATCH|DELETE)'/i);
  assert.doesNotMatch(src, /\/(approve|credit|grant|charge|refund|billing|subscription)[\w/-]*'/i);
  const imports = [...src.matchAll(/from '([^']+)'/g)].map((m) => m[1]);
  assert.ok(imports.every((i) => !/server\//.test(i)), imports.join(','));
  assert.equal(payload().handling.mutations, 'none');
  assert.ok(payload().instructions.forbiddenActions.includes('approve_reward') && payload().instructions.forbiddenActions.includes('credit_subscription'));
});
test('M7760: a fake fetch sees only GET calls', async () => {
  const methods = [];
  const fetchImpl = async (url, init) => { methods.push(init.method); return { ok: true, status: 200, headers: new Map([['content-type', 'application/json']]), text: async () => JSON.stringify(String(url).includes('referral') ? { programme: 'zeeza', kitchenHubSeparate: true, followups: [] } : { notifications: [] }) }; };
  await fetchAdminFeed({ base: 'http://127.0.0.1:1', token: TOKEN, fetchImpl, now: new Date(NOW) });
  assert.ok(methods.length >= 2 && methods.every((m) => m === 'GET'));
});

// ---- M7761
test('M7761: correlation IDs are random, shaped feed-<16 hex> and hold no account data or token', () => {
  const ids = new Set(Array.from({ length: 200 }, () => newCorrelationId()));
  assert.equal(ids.size, 200);
  for (const id of ids) assert.ok(isCorrelationId(id));
  assert.ok(!isCorrelationId('feed-ZZZZ') && !isCorrelationId(`${TOKEN}`) && !isCorrelationId(undefined));
  const p = payload();
  assert.ok(isCorrelationId(p.correlationId));
  assert.ok(!JSON.stringify(p.correlationId).includes('u1'));
  p.correlationId = 'user-u1-token';
  assert.throws(() => assertAgentInputIntegrity(p, { token: TOKEN }), /correlation id/);
});
test('M7761: a failed run still reports a correlation ID and never the token', async () => {
  const server = http.createServer((req, res) => { res.statusCode = 403; res.end('{}'); });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  try {
    const r = await runCli([], { NEXA_ADMIN_API_BASE: `http://127.0.0.1:${server.address().port}`, NEXA_ADMIN_API_TOKEN: TOKEN });
    assert.equal(r.code, 1);
    assert.match(r.err, /"correlationId":"feed-[0-9a-f]{16}"/);
    assert.ok(!r.err.includes(TOKEN) && !r.out.includes(TOKEN));
  } finally { server.close(); }
});

// ---- M7762 popup burst ordering (pure rules, real source)
test('M7762: a burst is shown oldest first, one at a time, and late items are dropped only after the 3 minute freshness limit', async () => {
  const logic = await import(pathToFileURL(path.join(root, 'src', 'notificationPopupLogic.ts')).href);
  const t0 = Date.parse(NOW);
  const burst = Array.from({ length: 60 }, (_, i) => ({ id: `p${i}`, createdAt: new Date(t0 - 1000 + i).toISOString() }));
  const queue = [...burst];
  const shown = [];
  let clock = t0;
  for (;;) { const next = logic.takeNextFresh(queue, clock); if (!next) break; shown.push(next.id); clock += 5000; }
  assert.deepEqual(shown.slice(0, 5), ['p0', 'p1', 'p2', 'p3', 'p4']);
  assert.ok(shown.every((id, i) => id === `p${i}`), 'order stays oldest first');
  assert.equal(shown.length, 36, '3 minutes / 5 seconds each');
  assert.equal(queue.length, 0, 'the rest expired behind the burst');
  assert.equal(logic.POPUP_QUEUE_MAX, 100);
});
test('M7762: source facts the burst rules depend on (newest-first API, oldest-first queue, retry of overflow, no read receipt on expiry)', () => {
  const popup = fs.readFileSync(path.join(root, 'src', 'NexaInAppNotificationPopup.tsx'), 'utf8');
  const notif = fs.readFileSync(path.join(root, 'server', 'notifications.js'), 'utf8');
  assert.match(notif, /ORDER BY createdAt DESC LIMIT/);
  assert.match(popup, /\.reverse\(\)/);
  assert.match(popup, /candidates\.slice\(0,room\)/);
  assert.match(popup, /\/api\/notifications\?limit=20/);
  const timer = popup.slice(popup.indexOf('dismissTimer.current=setTimeout'), popup.indexOf('},IN_APP_POPUP_MS)'));
  assert.doesNotMatch(timer, /\/read/);
});

// ---- M7763 source-level only (device behaviour is NOT TESTED)
test('M7763 (source level only): popup announces politely, has labelled buttons, and honours reduced motion in code', () => {
  const popup = fs.readFileSync(path.join(root, 'src', 'NexaInAppNotificationPopup.tsx'), 'utf8');
  assert.match(popup, /accessibilityLiveRegion="polite"/);
  assert.match(popup, /accessibilityLabel="Open notification"/);
  assert.match(popup, /accessibilityLabel="Dismiss notification"/);
  assert.match(popup, /opacity\.setValue\(reducedMotion\?1:0\)/);
  assert.match(popup, /translateY\.setValue\(reducedMotion\?0:-18\)/);
  assert.match(popup, /if\(!reducedMotion && allows\('notification'\)\)/);
  const motion = fs.readFileSync(path.join(root, 'src', 'motion.tsx'), 'utf8');
  assert.match(motion, /isReduceMotionEnabled/);
  assert.match(motion, /reduceMotionChanged/);
});
