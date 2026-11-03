'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const delivery = require('./notificationDelivery');

const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const s = read('notificationDelivery.js');
const db = read('db.js');
const maintenance = read('maintenance.js');

const checks = [
  ['M1400', () => assert.match(s, /RECEIPT_DELAY_MS/)],
  ['M1401', () => assert.match(s, /RECEIPT_BATCH/)],
  ['M1402', () => assert.match(s, /RECEIPT_MAX_AGE_MS/)],
  ['M1403', () => assert.match(s, /PERMANENT_RECEIPT_ERRORS/)],
  ['M1404', () => assert.equal(delivery.RECEIPT_BATCH, 50)],
  ['M1405', () => assert.equal(delivery.RECEIPT_MAX_AGE_MS, 24 * 60 * 60 * 1000)],
  ['M1406', () => assert.match(s, /providerTicketId/)],
  ['M1407', () => assert.match(s, /status='awaiting_receipt'/)],
  ['M1408', () => assert.match(s, /getReceipts/)],
  ['M1409', () => assert.match(s, /receiptStatus/)],
  ['M1410', () => assert.match(s, /receiptAt/)],
  ['M1411', () => assert.match(s, /DeviceNotRegistered/)],
  ['M1412', () => assert.match(s, /MessageTooBig/)],
  ['M1413', () => assert.match(s, /InvalidCredentials/)],
  ['M1414', () => assert.match(s, /MismatchSenderId/)],
  ['M1415', () => assert.match(s, /processReceipts/)],
  ['M1416', () => assert.match(s, /status === 'ok'/)],
  ['M1417', () => assert.match(s, /receipt expired without provider confirmation/)],
  ['M1418', () => assert.match(s, /scheduleRetry\(db/)],
  ['M1419', () => assert.match(s, /notification_deliveries.*providerTicketId/s)],
  ['M1420', () => assert.match(db, /providerTicketId TEXT/)],
  ['M1421', () => assert.match(db, /receiptStatus TEXT/)],
  ['M1422', () => assert.match(db, /receiptAt TEXT/)],
  ['M1423', () => assert.match(db, /idx_notification_deliveries_receipt/)],
  ['M1424', () => assert.match(maintenance, /expireStaleNotificationReceipts/)],
];

for (const [id, fn] of checks) test(`${id}: push receipt integrity contract`, fn);
test('B123 cumulative notification receipt module exports remain available', () => {
  for (const key of ['enqueue','deliverOne','processReceipts','deliverDue','recoverStaleSending']) assert.equal(typeof delivery[key], 'function');
});
