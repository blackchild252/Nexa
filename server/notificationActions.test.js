"use strict";
const test = require('node:test');
const assert = require('node:assert/strict');
const n = require('./notifications');

test('notification actions are allowlisted and identifiers are bounded', () => {
  assert.deepEqual(n.normalizeAction({ screen: 'money_group', id: 'g_123' }), { action: 'money_group', id: 'g_123' });
  assert.equal(n.normalizeAction({ screen: 'https://evil.example' }), null);
});

test('created notifications cannot carry arbitrary navigation targets', () => {
  const event = n.createEvent('u1', 'Test', 'Body', { screen: 'dm_thread', id: 't1', url: 'https://evil.example', secret: 'x' }, '2026-01-01T00:00:00.000Z');
  assert.equal(event.data.action, 'dm_thread');
  assert.equal(event.data.id, 't1');
  assert.equal(event.data.url, undefined);
  assert.equal(event.data.secret, undefined);
});
