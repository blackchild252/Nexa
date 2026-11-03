'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { TIERS, nextEscalationTier, normalizeEscalationReason } = require('./customerCareEscalation');

test('Customer Care escalation advances one ordered tier at a time', () => {
  assert.deepEqual(TIERS, ['customer_care', 'administrative_director', 'ceo', 'founder']);
  assert.deepEqual(nextEscalationTier('customer_care'), { ok: true, from: 'customer_care', to: 'administrative_director' });
  assert.deepEqual(nextEscalationTier('administrative_director', 'ceo'), { ok: true, from: 'administrative_director', to: 'ceo' });
  assert.deepEqual(nextEscalationTier('ceo', 'founder'), { ok: true, from: 'ceo', to: 'founder' });
});

test('escalation refuses skipped tiers, unknown tiers and movement past Founder', () => {
  assert.equal(nextEscalationTier('customer_care', 'founder').code, 'invalid_transition');
  assert.equal(nextEscalationTier('bogus').code, 'invalid_current_tier');
  assert.equal(nextEscalationTier('founder').code, 'terminal_tier');
});

test('escalation reason is bounded and required', () => {
  assert.equal(normalizeEscalationReason('   ').ok, false);
  assert.equal(normalizeEscalationReason('Need senior review').ok, true);
  assert.equal(normalizeEscalationReason('x'.repeat(501)).ok, false);
});

test('Customer Care route persists tier and audit metadata without projecting the private reason', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const source = fs.readFileSync(path.join(__dirname, 'customerCare.js'), 'utf8');
  assert.match(source, /ALTER TABLE customer_care_threads ADD COLUMN escalationTier/);
  assert.match(source, /UPDATE customer_care_threads SET escalationTier=\?,escalationUpdatedAt=\?,escalationUpdatedBy=\?/);
  assert.match(source, /fromTier:transition\.from,toTier:transition\.to,reason:reason\.value/);
  assert.match(source, /escalationTier:row\.escalationTier \|\| "customer_care"/);
  assert.doesNotMatch(source.slice(source.indexOf('function safeThread'), source.indexOf('function threadForUser')), /reason\.value/);
});
