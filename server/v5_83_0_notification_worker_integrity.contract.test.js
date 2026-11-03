'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const delivery = require('./notificationDelivery');

const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const s = read('notificationDelivery.js');
const db = read('db.js');
const index = read('index.js');
const maintenance = read('maintenance.js');
const prior = read('v5_82_0_notification_receipt_integrity.contract.test.js');
const tests = read('notificationDelivery.test.js');

const checks = [
  ['M1425', () => assert.match(s, /RECEIPT_LEASE_MS/)],
  ['M1426', () => assert.equal(delivery.RECEIPT_LEASE_MS, 5 * 60 * 1000)],
  ['M1427', () => assert.match(db, /receiptCheckAt TEXT/)],
  ['M1428', () => assert.match(db, /ADD COLUMN receiptCheckAt TEXT/)],
  ['M1429', () => assert.match(db, /idx_notification_deliveries_receipt_lease/)],
  ['M1430', () => assert.match(s, /SET status='receipt_checking'/)],
  ['M1431', () => assert.match(s, /WHERE id=\? AND status='awaiting_receipt'/)],
  ['M1432', () => assert.match(s, /receiptCheckAt=\?, updatedAt=\?/)],
  ['M1433', () => assert.match(s, /status: 'receipt_checking'/)],
  ['M1434', () => assert.match(s, /RECEIPT_BATCH/)],
  ['M1435', () => assert.match(s, /status='awaiting_receipt', receiptCheckAt=NULL/)],
  ['M1436', () => assert.match(s, /scheduleRetry\(db, \{ \.\.\.row, status: 'retry'/)],
  ['M1437', () => assert.match(s, /receiptCheckAt=NULL, nextAttemptAt=NULL/)],
  ['M1438', () => assert.match(s, /status='dead'.*receiptCheckAt=NULL/s)],
  ['M1439', () => assert.match(s, /receiptStatus=\?, receiptAt=\?.*status='retry'/s)],
  ['M1440', () => assert.match(s, /SET status='awaiting_receipt'.*nextAttemptAt=/s)],
  ['M1441', () => assert.match(s, /receipt expired without provider confirmation/)],
  ['M1442', () => assert.match(s, /function recoverStaleReceiptChecks/)],
  ['M1443', () => assert.match(index, /recoverStaleReceiptChecks\(db\)/)],
  ['M1444', () => assert.match(s, /recoverStaleReceiptChecks\(db, now\)/)],
  ['M1445', () => assert.equal(typeof delivery.recoverStaleReceiptChecks, 'function')],
  ['M1446', () => assert.match(s, /function recoverStaleSending/)],
  ['M1447', () => assert.match(db, /Notification history remains the source of truth|source of truth/i)],
  ['M1448', () => assert.match(tests, /receipt checks are atomically claimed/)],
  ['M1449', () => assert.match(prior, /B123 cumulative notification receipt module exports remain available/)],
];

for (const [id, fn] of checks) test(`${id}: notification worker integrity contract`, fn);
