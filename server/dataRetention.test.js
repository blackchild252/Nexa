"use strict";
const test = require('node:test');
const assert = require('node:assert/strict');
const r = require('./dataRetention');

test('retention windows are bounded and deterministic', () => {
  assert.equal(r.boundedDays(0, 90, 3650), 1);
  assert.equal(r.boundedDays(99999, 90, 3650), 3650);
  assert.equal(r.cutoffIso(1, new Date('2026-01-02T00:00:00.000Z')), '2026-01-01T00:00:00.000Z');
});

test('user notification purge is ownership-scoped', () => {
  const calls = [];
  const db = { prepare(sql) { calls.push(sql); return { run(...args) { calls.push(args); return { changes: 2 }; } }; } };
  assert.deepEqual(r.purgeUserNotifications(db, 'u1', 90, new Date('2026-01-02T00:00:00.000Z')), { deleted: 2, days: 90 });
  assert.match(calls[0], /userId=\?/);
  assert.deepEqual(calls[1][0], 'u1');
});


test('user notification purge executes child and parent deletion inside the database transaction', () => {
  const calls = [];
  const db = {
    transaction(work) {
      calls.push('transaction-created');
      return (...args) => {
        calls.push('transaction-started');
        return work(...args);
      };
    },
    prepare(sql) {
      calls.push(sql);
      return { run() { return { changes: 3 }; } };
    },
  };
  assert.deepEqual(r.purgeUserNotifications(db, 'u1', 90, new Date('2026-01-02T00:00:00.000Z')), { deleted: 3, days: 90 });
  assert.deepEqual(calls.slice(0, 2), ['transaction-created', 'transaction-started']);
  assert.match(calls[2], /DELETE FROM notification_deliveries/);
  assert.match(calls[3], /DELETE FROM notification_events/);
});

test('transaction failures propagate and do not fall back to unwrapped cleanup', () => {
  let ranWork = false;
  const db = {
    transaction() {
      return () => { throw new Error('transaction rollback'); };
    },
    prepare() {
      ranWork = true;
      return { run() { return { changes: 1 }; } };
    },
  };
  assert.throws(() => r.purgeUserNotifications(db, 'u1', 90, new Date('2026-01-02T00:00:00.000Z')), /transaction rollback/);
  assert.equal(ranWork, false);
});

test('blank retention configuration uses the documented default', () => {
  assert.equal(r.boundedDays('', 90, 3650), 90);
  assert.equal(r.boundedDays('   ', 90, 3650), 90);
  assert.equal(r.boundedDays(null, 90, 3650), 90);
});

test('retention configuration accepts scalar numbers but rejects coercible non-scalar values', () => {
  assert.equal(r.boundedDays('30', 90, 3650), 30);
  assert.equal(r.boundedDays(30.9, 90, 3650), 30);
  for (const value of [true, false, [], [30], {}, new Number(30), Symbol('30')]) {
    assert.equal(r.boundedDays(value, 90, 3650), 90);
  }
});

test('invalid reference time and invalid owner fail before database mutation', () => {
  const calls = [];
  const db = { prepare(sql) { calls.push(sql); return { run() { return { changes: 0 }; } }; } };
  assert.throws(() => r.cutoffIso(30, new Date('not-a-date')), /reference time is invalid/);
  for (const userId of ['', '   ', undefined, null, 'u'.repeat(201)]) {
    assert.throws(() => r.purgeUserNotifications(db, userId), /owner is invalid/);
  }
  assert.equal(calls.length, 0);
});

test('child cleanup failure aborts before deleting notification events', () => {
  const calls = [];
  const db = { prepare(sql) { calls.push(sql); return { run() { if (calls.length === 1) throw new Error('storage unavailable'); return { changes: 1 }; } }; } };
  assert.throws(() => r.purgeUserNotifications(db, 'u1', 90, new Date('2026-01-02T00:00:00.000Z')), /storage unavailable/);
  assert.equal(calls.length, 1);
  assert.match(calls[0], /DELETE FROM notification_deliveries/);
});


test('repeating a retention purge is idempotent when storage reports no remaining rows', () => {
  let eventRows = 2;
  const db = { prepare(sql) { return { run() {
    if (sql.includes('notification_deliveries')) return { changes: 0 };
    const deleted = eventRows;
    eventRows = 0;
    return { changes: deleted };
  } }; } };
  const now = new Date('2026-01-02T00:00:00.000Z');
  assert.deepEqual(r.purgeUserNotifications(db, 'u1', 90, now), { deleted: 2, days: 90 });
  assert.deepEqual(r.purgeUserNotifications(db, 'u1', 90, now), { deleted: 0, days: 90 });
});
