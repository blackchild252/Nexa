const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const notifications = require('./notifications');
const delivery = require('./notificationDelivery');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const INDEX = read('server/index.js');

function makeDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE notification_events (id TEXT PRIMARY KEY, userId TEXT NOT NULL, title TEXT, body TEXT, type TEXT, data TEXT, createdAt TEXT NOT NULL, readAt TEXT);
    CREATE TABLE notification_deliveries (id TEXT PRIMARY KEY, eventId TEXT NOT NULL, token TEXT NOT NULL, status TEXT NOT NULL, attempts INTEGER DEFAULT 0, nextAttemptAt TEXT, updatedAt TEXT, lastError TEXT);`);
  return db;
}
const ev = (db, id, userId, createdAt, type = 'system') => db.prepare('INSERT INTO notification_events(id,userId,title,body,type,data,createdAt) VALUES(?,?,?,?,?,?,?)').run(id, userId, 't', 'b', type, '{}', createdAt);
const dl = (db, id, eventId, status, updatedAt) => db.prepare('INSERT INTO notification_deliveries(id,eventId,token,status,updatedAt) VALUES(?,?,?,?,?)').run(id, eventId, 'tok' + id, status, updatedAt);
const statusOf = (db, id) => db.prepare('SELECT status FROM notification_deliveries WHERE id=?').get(id).status;

test('M7595: a user only lists, counts and reads their own notifications (real SQLite)', () => {
  const db = makeDb();
  ev(db, 'a1', 'u1', '2026-10-01T00:00:00Z'); ev(db, 'b1', 'u2', '2026-10-02T00:00:00Z');
  assert.deepEqual(notifications.list(db, 'u1').map((n) => n.id), ['a1']);
  assert.equal(notifications.unreadCount(db, 'u2'), 1);
  assert.equal(notifications.markRead(db, 'u1', 'b1'), 0, 'u1 cannot mark u2\'s notification');
  assert.equal(notifications.unreadCount(db, 'u2'), 1);
  assert.equal(notifications.markAllRead(db, 'u1'), 1);
  assert.equal(notifications.unreadCount(db, 'u2'), 1, 'read-all only touches the caller');
});

test('M7600/M7601: list limit is bounded and a bad type or before value cannot widen the result', () => {
  const db = makeDb();
  for (let i = 0; i < 120; i++) ev(db, 'n' + i, 'u1', `2026-10-01T00:00:${String(i % 60).padStart(2, '0')}.${String(i).padStart(3, '0')}Z`);
  assert.equal(notifications.list(db, 'u1', { limit: 100000 }).length, 100);
  assert.equal(notifications.list(db, 'u1', { limit: -5 }).length >= 1, true);
  assert.equal(notifications.list(db, 'u1', { type: "x' OR '1'='1" }).length, 50, 'unknown type is ignored, not injected');
  assert.equal(notifications.list(db, 'u2', { before: "' OR 1=1 --" }).length, 0);
});

test('M7596/M7597: user-triggered delivery recovery only touches that user\'s deliveries (real SQLite)', () => {
  const db = makeDb();
  ev(db, 'a1', 'u1', '2026-10-01T00:00:00Z'); ev(db, 'b1', 'u2', '2026-10-01T00:00:00Z');
  const old = '2026-10-01T00:00:00.000Z', now = new Date('2026-10-02T00:00:00.000Z');
  dl(db, 'd1', 'a1', 'sending', old); dl(db, 'd2', 'b1', 'sending', old); dl(db, 'd3', 'a1', 'sending', '2026-10-01T23:59:59.000Z');
  assert.equal(delivery.recoverStaleSending(db, now, { userId: 'u1' }).recovered, 1);
  assert.equal(statusOf(db, 'd1'), 'retry');
  assert.equal(statusOf(db, 'd2'), 'sending', 'another user\'s delivery is left alone');
  assert.equal(statusOf(db, 'd3'), 'sending', 'a fresh send is left alone');
  assert.equal(delivery.recoverStaleSending(db, now, { userId: 'u1' }).recovered, 0, 'repeat does nothing more');
  assert.equal(delivery.recoverStaleSending(db, now).recovered, 1, 'the background worker still recovers everyone');
  assert.equal(statusOf(db, 'd2'), 'retry');
});

test('M7596: the recover route passes the caller and the worker does not', () => {
  assert.match(INDEX, /notificationDelivery\.recoverStaleSending\(db, new Date\(\), \{ userId: req\.user\.id \}\)/);
  assert.match(INDEX, /try \{ notificationDelivery\.recoverStaleSending\(db\); notificationDelivery\.recoverStaleReceiptChecks/);
});

test('M7591/M7595: every notification and push route needs a login', () => {
  const R = /\bapp\.(get|post|put|patch|delete)\(\s*"(\/api\/(?:notifications|push)[^"]*)"\s*,(.*)/;
  const found = INDEX.split('\n').map((l) => l.match(R)).filter(Boolean);
  assert.ok(found.length >= 15, `found ${found.length}`);
  for (const m of found) assert.match(m[3], /auth\.authMiddleware/, `${m[1]} ${m[2]}`);
});

test('M7592/M7593: push registration and retention reject bad input', () => {
  const i = INDEX.indexOf('app.post("/api/push/register"');
  const block = INDEX.slice(i, i + 900);
  assert.match(block, /EXPO_TOKEN_RE\.test\(token\)/);
  assert.match(block, /\.slice\(0, 20\)/);
  assert.match(block, /token_owned_by_other_user/);
  assert.match(INDEX, /days must be between 1 and \$\{dataRetention\.MAX_NOTIFICATION_DAYS\}/);
  assert.match(read('server/notifications.js'), /Math\.min\(Math\.max\(Number\(limit\) \|\| 50, 1\), 100\)/);
});

test('M7597: notification action lookup is owner-scoped', () => {
  assert.match(read('server/notificationCompletion.js'), /WHERE id=\? AND userId=\?/);
});
