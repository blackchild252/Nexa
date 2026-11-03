"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");

test('notification delivery verifies token ownership at send time to prevent account-switch leakage', () => {
  const s = fs.readFileSync(path.join(__dirname, 'notificationDelivery.js'), 'utf8');
  assert.match(s, /SELECT 1 FROM push_tokens WHERE token=\? AND userId=\?/);
  assert.match(s, /token_owner_changed/);
});

test('Paystack provider calls have an abortable timeout', () => {
  const s = fs.readFileSync(path.join(__dirname, 'payments.js'), 'utf8');
  assert.match(s, /PROVIDER_TIMEOUT_MS\s*=\s*15_000/);
  assert.match(s, /controller\.abort\(\)/);
  assert.match(s, /Paystack request timed out/);
});

test('Grok calls stay time-bounded and realtime voice is disabled in local-only mode', () => {
  const s = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
  assert.match(fs.readFileSync(path.join(__dirname, 'grokProvider.js'), 'utf8'), /XAI_TIMEOUT_MS \|\| 30000/);
  assert.match(s, /Realtime voice is disabled in local-only mode/);
  assert.doesNotMatch(s, /Realtime voice provider timed out/);
});

test('voice upload temp filenames use cryptographic randomness instead of millisecond timestamps', () => {
  const s = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
  assert.match(s, /nexa-voice-\$\{crypto\.randomBytes\(16\)/);
  assert.doesNotMatch(s, /nexa-voice-\$\{Date\.now\(\)\}/);
});
