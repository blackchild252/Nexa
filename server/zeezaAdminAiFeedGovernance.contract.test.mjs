import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  normalizeReadState, checkUnreadConsistency, deniedStopDecision, assessSnapshotFreshness, assertAgentInputIntegrity,
  SNAPSHOT_STALE_AFTER_SECONDS, DENIED_STOP_AFTER,
} from '../scripts/lib/zeezaFeedOps.mjs';
import { buildAgentInput, sanitizeFollowupsWithReport, sanitizeNotifications, readinessReport, parseArgs } from '../scripts/zeeza-admin-ai-feed.mjs';

const good = { id: 'c1', userId: 'u1', accountType: 'user', campaignStartAt: '2026-10-01T00:00:00Z', campaignEndAt: '2026-10-31T00:00:00Z', status: 'active', qualifiedReferrals: 3, referralsInWindow: 3, target: 30, rewardStatus: 'in_progress', eligibleForReview: false };
const TOKEN = 'a-valid-admin-session-token';

// ---- M7747 read-state normalization
test('M7747: readAt from the server maps to read, unread or unknown; unknown is shown as unread', () => {
  assert.deepEqual(normalizeReadState(null), { read: false, state: 'unread' });
  assert.deepEqual(normalizeReadState(undefined), { read: false, state: 'unread' });
  assert.deepEqual(normalizeReadState(''), { read: false, state: 'unread' });
  assert.deepEqual(normalizeReadState('2026-10-11T10:00:00.000Z'), { read: true, state: 'read' });
  for (const odd of [true, 1, {}, [], 'yesterday', 'x'.repeat(100)]) assert.deepEqual(normalizeReadState(odd), { read: false, state: 'unknown' }, String(odd));
});
test('M7747: notifications carry read and readState; a truthy non-date no longer counts as read', () => {
  const rows = sanitizeNotifications([
    { id: 'a', title: 'Zeeza a', type: 'referral', readAt: '2026-10-11T10:00:00Z' },
    { id: 'b', title: 'Zeeza b', type: 'referral', readAt: null },
    { id: 'c', title: 'Zeeza c', type: 'referral', readAt: 'garbage' },
  ]);
  assert.deepEqual(rows.map((r) => [r.read, r.readState]), [[true, 'read'], [false, 'unread'], [false, 'unknown']]);
});
test('M7747: the server unread count must not be smaller than the unread rows listed', () => {
  const list = [{ readAt: null }, { readAt: null }, { readAt: '2026-10-11T10:00:00Z' }];
  assert.equal(checkUnreadConsistency(list, 2).consistent, true);
  assert.equal(checkUnreadConsistency(list, 5).consistent, true);
  assert.equal(checkUnreadConsistency(list, 1).consistent, false);
  assert.equal(checkUnreadConsistency(list, undefined).serverUnreadCountPresent, false);
  assert.equal(checkUnreadConsistency(list, -3).serverUnreadCountPresent, false);
  assert.equal(checkUnreadConsistency([{ readAt: 'bad' }], 1).consistent, false);
  assert.equal(checkUnreadConsistency(null, 0).consistent, true);
});
test('M7747: the payload reports read-state consistency', () => {
  const p = buildAgentInput({ followups: [good], notifications: [{ id: 'n', title: 'Zeeza', type: 'referral', readAt: null }], unreadCount: 0 });
  assert.equal(p.notificationReadState.consistent, false);
  const q = buildAgentInput({ followups: [good], notifications: [{ id: 'n', title: 'Zeeza', type: 'referral', readAt: null }], unreadCount: 1 });
  assert.equal(q.notificationReadState.consistent, true);
});

// ---- M7752 token rotation and revocation
test('M7752: three refusals in a row stop the watch; any other outcome resets the count', () => {
  let n = 0;
  for (let i = 1; i < DENIED_STOP_AFTER; i++) { const d = deniedStopDecision('denied', n); n = d.consecutiveDenied; assert.equal(d.stop, false); }
  assert.equal(deniedStopDecision('denied', n).stop, true);
  assert.deepEqual(deniedStopDecision('transient', 2), { consecutiveDenied: 0, stop: false });
});

// ---- M7753 readiness command
test('M7753: readiness never shows the token, its length or its prefix, and makes no network call', () => {
  const secret = 'SECRETTOKENVALUE-1234567890';
  const r = readinessReport({ NEXA_ADMIN_API_BASE: 'https://admin.example', NEXA_ADMIN_API_TOKEN: secret });
  assert.equal(r.ready, true); assert.equal(r.networkCalled, false);
  const text = JSON.stringify(r);
  assert.doesNotMatch(text, /SECRET|1234567890|"length"|admin\.example/);
});
test('M7753: readiness names each problem without echoing values', () => {
  assert.equal(readinessReport({}).ready, false);
  assert.equal(readinessReport({}).checks.token, 'missing');
  assert.equal(readinessReport({ NEXA_ADMIN_API_BASE: 'http://admin.example', NEXA_ADMIN_API_TOKEN: 'short' }).checks.token, 'present_but_invalid_shape');
  assert.match(readinessReport({ NEXA_ADMIN_API_BASE: 'http://admin.example', NEXA_ADMIN_API_TOKEN: TOKEN }).checks.apiBase, /HTTPS/);
  assert.equal(readinessReport({ NEXA_ADMIN_API_BASE: 'https://a.example', NEXA_ADMIN_API_TOKEN: TOKEN, NEXA_FEED_NOTIFICATION_CATEGORIES: 'bad cat' }).ready, false);
  assert.equal(readinessReport({ NEXA_ADMIN_API_BASE: 'https://a.example', NEXA_ADMIN_API_TOKEN: TOKEN, NEXA_FEED_NOTIFICATION_CATEGORIES: 'referral' }).ready, true);
});
test('M7753: --check runs alone and the real CLI exits 1 when not ready, printing no secret', () => {
  assert.equal(parseArgs(['--check']).check, true);
  assert.throws(() => parseArgs(['--check', '--watch']), /runs alone/);
  assert.throws(() => parseArgs(['--check', '--output', 'a.json']), /runs alone/);
  const r = spawnSync(process.execPath, ['scripts/zeeza-admin-ai-feed.mjs', '--check'], { encoding: 'utf8', env: { PATH: process.env.PATH, NEXA_ADMIN_API_TOKEN: 'SECRETTOKENVALUE-1234567890' } });
  assert.equal(r.status, 1);
  assert.doesNotMatch(r.stdout + r.stderr, /SECRETTOKENVALUE/);
  assert.match(r.stdout, /"ready": false/);
});

// ---- M7755 malformed dates and impossible targets
test('M7755: malformed, missing, backwards and equal dates are rejected with a reason, not guessed', () => {
  const bad = [
    { ...good, id: 'a', campaignStartAt: 'not a date' },
    { ...good, id: 'b', campaignEndAt: undefined },
    { ...good, id: 'c', campaignStartAt: 12345 },
    { ...good, id: 'd', campaignStartAt: '2026-10-31T00:00:00Z', campaignEndAt: '2026-10-01T00:00:00Z' },
    { ...good, id: 'e', campaignStartAt: '2026-10-01T00:00:00Z', campaignEndAt: '2026-10-01T00:00:00Z' },
    { ...good, id: 'f', campaignStartAt: 'x'.repeat(200) },
  ];
  const { rows, rejected } = sanitizeFollowupsWithReport([good, ...bad]);
  assert.equal(rows.length, 1);
  assert.equal(rejected.total, 6);
  assert.deepEqual(rejected.reasons, { malformed_dates: 4, backwards_dates: 2 });
});
test('M7755: impossible targets are corrected to the account default and flagged', () => {
  for (const t of [0, -5, 1.5, 101, 100000, NaN, '30', null, undefined]) {
    const { rows } = sanitizeFollowupsWithReport([{ ...good, target: t }]);
    assert.equal(rows[0].target, 30, String(t));
    assert.ok(rows[0].flags.includes('target_corrected'), String(t));
  }
  const v = sanitizeFollowupsWithReport([{ ...good, accountType: 'vendor', target: 0 }]).rows[0];
  assert.equal(v.target, 100);
  const ok = sanitizeFollowupsWithReport([{ ...good, target: 100 }]).rows[0];
  assert.equal(ok.target, 100); assert.deepEqual(ok.flags, []);
});
test('M7755: impossible counts become zero and are flagged; odd window lengths are flagged', () => {
  for (const c of [-1, 2.5, '7', Infinity]) {
    const r = sanitizeFollowupsWithReport([{ ...good, qualifiedReferrals: c }]).rows[0];
    assert.equal(r.qualifiedReferrals, 0); assert.ok(r.flags.includes('count_invalid'));
  }
  const w = sanitizeFollowupsWithReport([{ ...good, campaignEndAt: '2027-03-01T00:00:00Z' }]).rows[0];
  assert.ok(w.flags.includes('window_not_30_days'));
});
test('M7755: duplicate campaign ids drop the later copy and one bad record does not block the snapshot', () => {
  const p = buildAgentInput({ followups: [good, { ...good }, { ...good, id: 'z', campaignStartAt: 'bad' }], notifications: [] });
  assert.equal(p.summary.campaigns, 1);
  assert.equal(p.dataQuality.rejectedCampaigns, 2);
  assert.deepEqual(p.dataQuality.rejectedReasons, { duplicate_id: 1, malformed_dates: 1 });
  assert.equal(assertAgentInputIntegrity(p).ok, true);
});

// ---- M7756 stale snapshot warning
test('M7756: fresh, stale, future-dated and undated snapshots are told apart', () => {
  const p = buildAgentInput({ followups: [good], notifications: [], generatedAt: '2026-10-26T10:00:00Z' });
  assert.equal(p.freshness.staleAfterSeconds, SNAPSHOT_STALE_AFTER_SECONDS);
  const at = Date.parse('2026-10-26T10:00:00Z');
  assert.equal(assessSnapshotFreshness(p, { now: at + 60_000 }).status, 'fresh');
  const stale = assessSnapshotFreshness(p, { now: at + 3_600_000 });
  assert.equal(stale.status, 'stale'); assert.match(stale.warning, /not current/);
  assert.equal(assessSnapshotFreshness(p, { now: at - 3_600_000 }).status, 'invalid');
  assert.equal(assessSnapshotFreshness({}, { now: at }).status, 'invalid');
  assert.equal(assessSnapshotFreshness(null).status, 'invalid');
});
test('M7756: the agent instructions require a stale warning and a future-dated snapshot is refused for writing', () => {
  const p = buildAgentInput({ followups: [good], notifications: [] });
  assert.ok(p.instructions.rules.some((r) => /stale/.test(r)));
  p.generatedAt = new Date(Date.now() + 3_600_000).toISOString();
  assert.throws(() => assertAgentInputIntegrity(p), /future/);
});
