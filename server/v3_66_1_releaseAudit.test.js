const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

test('current release metadata remains synchronized', () => {
  const expected = JSON.parse(read('package.json')).version;
  for (const file of ['package.json','app.json']) assert.equal(JSON.parse(read(file)).version, expected, file);
  assert.equal(JSON.parse(read('server/package.json')).version, expected, 'server/package.json');
  assert.match(read('VERSION.md'), new RegExp('Current (?:release|Version):(?:\\s*\\*\\*|\\*\\*\\s*)V?' + expected.replace(/\./g, '\\.') + '(?!\\d)'));
});

test('search scalability safeguards are bounded and cursor ordering is fully deterministic', () => {
  const s = read('server/search.js');
  assert.match(s, /MAX_QUERY_TOKENS = 8/);
  assert.match(s, /MAX_CANDIDATES = 200/);
  assert.match(s, /String\(a\.id\)\.localeCompare/);
  assert.match(s, /typeof parsed\.type !== "string"/);
});

test('notification delivery lifecycle has durable deduplication, retry, and terminal states', () => {
  const db = read('server/db.js');
  const delivery = read('server/notificationDelivery.js');
  assert.match(db, /CREATE TABLE IF NOT EXISTS notification_deliveries/);
  assert.match(db, /UNIQUE\(eventId, token\)/);
  assert.match(delivery, /MAX_ATTEMPTS = 5/);
  assert.match(delivery, /DeviceNotRegistered/);
  assert.match(delivery, /status IN \('pending','retry'\)/);
});

test('account closure and maintenance cover the new notification delivery state', () => {
  assert.match(read('server/accountLifecycle.js'), /DELETE FROM notification_deliveries/);
  assert.match(read('server/maintenance.js'), /purgeOldNotificationDeliveries/);
  assert.match(read('server/index.js'), /notificationDelivery\.deliverDue/);
});
