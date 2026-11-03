'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateProductPrice } = require('./productPrice');
const { majorToMinorUnits } = require('./currencyModel');

test('product price validation respects each currency minor-unit precision', () => {
  assert.deepEqual(validateProductPrice(12.34, 'NGN'), { ok: true, amount: 12.34, minor: 1234, currency: 'NGN' });
  assert.equal(validateProductPrice(12.345, 'NGN').ok, false);
  assert.equal(validateProductPrice(12.345, 'BHD').ok, true);
  assert.equal(validateProductPrice(12.5, 'JPY').ok, false);
});

test('product price validation rejects booleans, blanks, non-finite values and negatives', () => {
  for (const value of [true, false, '', '   ', null, undefined, NaN, Infinity, -0.01, 'not-money']) {
    assert.equal(validateProductPrice(value, 'NGN').ok, false, `reject ${String(value)}`);
  }
  assert.equal(validateProductPrice(0, 'NGN', { allowZero: true }).ok, true);
  assert.equal(validateProductPrice(0, 'NGN', { allowZero: false }).ok, false);
});

test('major-to-minor conversion never treats booleans or empty input as monetary amounts', () => {
  assert.throws(() => majorToMinorUnits(true, 'NGN'), /finite major-unit number/);
  assert.throws(() => majorToMinorUnits('', 'NGN'), /finite major-unit number/);
});

test('weight validation rejects booleans even though true numerically coerces to one', () => {
  const { parseWeightKg } = require('./productWeight');
  assert.equal(parseWeightKg(true, { required: true }).ok, false);
  assert.equal(parseWeightKg(false, { required: true }).ok, false);
});

test('market quote source explicitly labels mock mode as preview and synthetic history is preview-only', () => {
  const market = require('./market');
  const meta = market.providerMeta('mock');
  assert.equal(meta.dataStatus, 'preview');
  assert.equal(meta.freshness, 'preview');
  assert.match(meta.disclaimer, /not live market prices/i);
  const src = require('node:fs').readFileSync(require.resolve('./market'), 'utf8');
  assert.match(src, /const history = mode === "mock" \? series\(x, 30\) : \[\]/);
});
