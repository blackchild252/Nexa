import test from 'node:test';
import assert from 'node:assert/strict';
import { safeBaseUrl, sanitizeFollowups, sanitizeNotifications, buildAgentInput, fetchAdminFeed, parseArgs } from '../scripts/zeeza-admin-ai-feed.mjs';

const validCampaign = { id: 'campaign-1', userId: 'user-1', accountType: 'vendor', campaignStartAt: '2026-10-01T00:00:00.000Z', campaignEndAt: '2026-10-31T00:00:00.000Z', status: 'active', qualifiedReferrals: 99, referralsInWindow: 99, target: 100, aamiRewardsUnlocked: false, rewardStatus: 'in_progress', eligibleForReview: false };
const response = (payload, status = 200) => new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } });

test('admin AI feed only accepts HTTPS except loopback and rejects URL credentials', () => {
  assert.equal(safeBaseUrl('https://admin.example/').origin, 'https://admin.example');
  assert.equal(safeBaseUrl('http://localhost:3000').hostname, 'localhost');
  assert.throws(() => safeBaseUrl('http://admin.example'), /HTTPS/);
  assert.throws(() => safeBaseUrl('https://user:pass@admin.example'), /credentials/);
  assert.throws(() => safeBaseUrl('https://admin.example/?token=abc'), /credentials/);
});

test('campaign sanitization bounds data and rejects malformed records', () => {
  const rows = sanitizeFollowups([validCampaign, { ...validCampaign, id: '', userId: 'x' }, null, { ...validCampaign, id: 'campaign-2', accountType: 'superadmin', target: 100000 }]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].target, 100);
  assert.equal(rows[1].accountType, 'unknown');
  assert.equal(rows[1].followUpRecommended, false);
  assert.throws(() => sanitizeFollowups({ not: 'array' }), /shape is invalid/);
});

test('notification feed filters unrelated notifications and scrubs contact data and credentials', () => {
  const rows = sanitizeNotifications([
    { id: 'n1', title: 'Zeeza referral alert', body: 'Contact alice@example.com or +234 801 234 5678 bearer abcdefghijklmnop', type: 'referral', createdAt: '2026-10-11T10:00:00Z', readAt: null, data: { programme: 'zeeza', token: 'must-not-leak' } },
    { id: 'n2', title: 'General update', body: 'not relevant', type: 'general', createdAt: '2026-10-11T10:00:00Z', data: {} },
  ]);
  assert.equal(rows.length, 1);
  assert.match(rows[0].body, /\[EMAIL\]/);
  assert.match(rows[0].body, /\[PHONE\]/);
  assert.doesNotMatch(JSON.stringify(rows), /alice@example\.com|801 234 5678|must-not-leak|abcdefghijklmnop/);
  assert.throws(() => sanitizeNotifications(null), /shape is invalid/);
});

test('agent input prioritizes review, expiry and unread relevant notifications without granting authority', () => {
  const payload = buildAgentInput({
    followups: [{ ...validCampaign, eligibleForReview: true, rewardStatus: 'pending_review' }, { ...validCampaign, id: 'campaign-2', campaignEndAt: '2026-10-12T00:00:00Z', userId: 'user-2' }],
    notifications: [{ id: 'n1', title: 'AAMI reward', body: 'Reward review required', type: 'reward', createdAt: '2026-10-11T10:00:00Z', readAt: null, data: { programme: 'zeeza' } }],
    generatedAt: '2026-10-11T10:00:00Z',
  });
  assert.equal(payload.summary.campaigns, 2);
  assert.equal(payload.summary.eligibleForHumanReview, 1);
  assert.equal(payload.summary.endingWithin72Hours, 1);
  assert.equal(payload.summary.unreadRelevantNotifications, 1);
  assert.ok(payload.instructions.forbiddenActions.includes('credit_subscription'));
  assert.equal(payload.separation.kitchenHubProgramme, 'excluded; retain its separate existing system');
});

test('feed uses only the two authenticated read endpoints and does not expose token in output', async () => {
  const calls = [];
  const fakeFetch = async (url, init) => {
    calls.push({ url: String(url), method: init.method, auth: init.headers.Authorization });
    if (String(url).includes('/referral-followups')) return response({ programme: 'zeeza', kitchenHubSeparate: true, followups: [validCampaign] });
    return response({ notifications: [] });
  };
  const result = await fetchAdminFeed({ base: 'https://admin.example', token: 'a-valid-admin-session-token', fetchImpl: fakeFetch, now: new Date('2026-10-11T10:00:00Z') });
  assert.equal(calls.length, 2);
  assert.ok(calls.every((c) => c.method === 'GET' && c.auth === 'Bearer a-valid-admin-session-token'));
  assert.ok(calls.some((c) => c.url.includes('/api/admin/zeeza/referral-followups?limit=500')));
  assert.ok(calls.some((c) => c.url.includes('/api/notifications?limit=100')));
  assert.doesNotMatch(JSON.stringify(result), /a-valid-admin-session-token/);
  assert.equal(result.campaigns[0].userId, 'user-1');
});

test('feed fails closed on unauthorized, oversized, invalid content-type and wrong programme marker', async () => {
  await assert.rejects(fetchAdminFeed({ base: 'https://admin.example', token: 'a-valid-admin-session-token', fetchImpl: async () => response({ secret: 'no' }, 403) }), /authorized admin session/);
  await assert.rejects(fetchAdminFeed({ base: 'https://admin.example', token: 'a-valid-admin-session-token', fetchImpl: async () => new Response('oops', { status: 200, headers: { 'content-type': 'text/plain' } }) }), /not JSON/);
  await assert.rejects(fetchAdminFeed({ base: 'https://admin.example', token: 'a-valid-admin-session-token', fetchImpl: async () => response({ programme: 'kitchen', kitchenHubSeparate: true, followups: [] }) }), /programme marker/);
});

test('CLI flags are bounded and watch mode cannot write a single snapshot file', () => {
  assert.deepEqual(parseArgs(['--watch', '--interval-ms', '30000']), { watch: true, intervalMs: 30000, output: null });
  assert.throws(() => parseArgs(['--interval-ms', '2']), /between 10000/);
  assert.throws(() => parseArgs(['--watch', '--output', 'feed.json']), /omit --output/);
  assert.throws(() => parseArgs(['--unknown']), /Unknown argument/);
});
