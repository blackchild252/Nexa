const test = require('node:test');
const assert = require('node:assert/strict');
const { formatMajorCurrency, SUPPORTED_CURRENCIES } = require('../src/currencyDisplay.js');

test('subscription display formats only supported currencies supplied by Main', () => {
  assert.ok(SUPPORTED_CURRENCIES.has('NGN'));
  assert.match(formatMajorCurrency(1234.5, 'USD', 'en-US'), /\$1,234\.50/);
  assert.match(formatMajorCurrency(1234, 'JPY', 'ja-JP'), /1,234|1234/);
  assert.equal(formatMajorCurrency(100, null), 'Amount unavailable');
  assert.equal(formatMajorCurrency(100, 'XXX'), 'Amount unavailable');
  assert.equal(formatMajorCurrency(Number.NaN, 'NGN'), 'Amount unavailable');
});

test('subscription UI consumes each server-supplied currency instead of hard-coded naira', () => {
  const fs = require('node:fs');
  const source = fs.readFileSync(require.resolve('../src/Subscription.tsx'), 'utf8');
  assert.match(source, /formatMajorCurrency/);
  assert.match(source, /monthlyFee\.currency/);
  assert.match(source, /monthlyTarget\.currency/);
  assert.doesNotMatch(source, /₦/);
});
