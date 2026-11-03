'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const scope = require('./companyScope');

test('M7216/M7217/M7227 role titles are presentation-only and use approved wording', () => {
  assert.equal(scope.titleForRole('administrative_director'), 'Administrative Director');
  assert.equal(scope.titleForRole('general_manager'), 'General Manager');
  assert.equal(scope.titleForRole('group_director'), 'Group Director');
  assert.equal(scope.titleForRole('president'), 'President');
  assert.equal(scope.titleForRole('owner'), null);
  assert.equal(scope.canAccessCompany({ role: 'administrative_director' }, 'nexa'), false);
});

test('M7219/M7224 company membership cannot cross-grant company authority', () => {
  assert.equal(scope.canAccessCompany({ id: 'a', companyId: 'nexa', role: 'admin' }, 'nexa'), true);
  assert.equal(scope.canAccessCompany({ id: 'a', companyId: 'nexa', role: 'admin' }, 'lordgistics'), false);
  assert.equal(scope.canAccessCompany({ id: 'a', companyIds: ['nexa'] }, 'lordgistics'), false);
  assert.equal(scope.canAccessCompany({ id: 'a', companyIds: ['nexa', 'lordgistics'] }, 'lordgistics'), true);
  assert.equal(scope.canAccessCompany({ id: 'a', isAdmin: true }, 'lordgistics'), false);
});

test('M7225/M7226 company, product and industry coin identities remain distinct', () => {
  assert.deepEqual(scope.normalizeIdentity({ companyId: 'nexa', productId: 'nexa-main', industryCoinId: 'aami-coin' }), {
    ok: true, value: { companyId: 'nexa', productId: 'nexa-main', industryCoinId: 'aami-coin' },
  });
  assert.equal(scope.normalizeIdentity({ companyId: 'nexa', productId: 'lordgistics' }).error, 'company_product_mismatch');
  assert.equal(scope.normalizeIdentity({ companyId: 'nexa', productId: 'nexa-main', industryCoinId: 'live-wallet' }).error, 'invalid_industry_coin');
});

test('M7228 invalid and mismatched governance scopes fail closed', () => {
  for (const value of [null, {}, { companyId: 'nexa', productId: 'nexa-main' }]) {
    if (value === null || Object.keys(value).length === 0) assert.equal(scope.normalizeIdentity(value || {}).ok, false);
  }
  assert.equal(scope.normalizeIdentity({ companyId: 'unknown', productId: 'nexa-main' }).ok, false);
  assert.equal(scope.normalizeIdentity({ companyId: 'lordgistics', productId: 'nexa-main' }).ok, false);
});

test('M7229 correlation IDs are bounded and unsafe IDs fall back or fail closed', () => {
  assert.equal(scope.createCorrelationId('trace-1', 'fallback'), 'trace-1');
  assert.equal(scope.createCorrelationId('bad\ntrace', 'fallback'), 'fallback');
  assert.equal(scope.createCorrelationId('bad\ntrace', null), null);
  assert.equal(scope.createCorrelationId('x'.repeat(129), null), null);
});
