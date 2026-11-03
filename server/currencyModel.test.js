const test = require('node:test');
const assert = require('node:assert/strict');
const { assertSameCurrency, convertMinorUnits, createFxProvider, currencyForCountry, formatMinorCurrency, getCurrency, majorToMinorUnits, minorToMajorUnits, normalizeCurrency, quoteIsFresh, supportedCurrencies, validateFxQuote } = require('./currencyModel.js');

test('supported currency model has unique uppercase ISO-style codes and minor-unit precision', () => {
  const currencies = supportedCurrencies();
  assert.ok(currencies.length >= 25);
  assert.equal(new Set(currencies.map((x) => x.code)).size, currencies.length);
  assert.equal(getCurrency('jpy').minorUnits, 0);
  assert.equal(getCurrency('BHD').minorUnits, 3);
});
test('currency normalization is strict and only uses an explicitly supplied supported fallback', () => {
  assert.equal(normalizeCurrency(' ngn '), 'NGN');
  assert.equal(normalizeCurrency('', 'USD'), 'USD');
  assert.throws(() => normalizeCurrency('XXX'), /supported ISO currency/);
  assert.throws(() => normalizeCurrency('XXX', 'bad'), /supported ISO currency/);
});
test('country mapping is explicit and unknown country codes do not silently become NGN', () => {
  assert.equal(currencyForCountry('ng'), 'NGN');
  assert.equal(currencyForCountry('GB'), 'GBP');
  assert.equal(currencyForCountry('ZZ'), null);
});
test('minor-unit formatting follows the selected currency and rejects unsafe amounts', () => {
  assert.match(formatMinorCurrency(12345, 'NGN', 'en-NG'), /123\.45|123,45/);
  assert.throws(() => formatMinorCurrency(1.5, 'USD'), /safe integer/);
});
test('major/minor conversion respects currency precision and fails closed on unsupported codes', () => {
  assert.equal(majorToMinorUnits(123.45, 'USD'), 12345);
  assert.equal(majorToMinorUnits(123, 'JPY'), 123);
  assert.equal(majorToMinorUnits(1.234, 'BHD'), 1234);
  assert.equal(minorToMajorUnits(1234, 'BHD'), 1.234);
  assert.throws(() => majorToMinorUnits(1.2, 'JPY'), /minor-unit precision/);
  assert.throws(() => majorToMinorUnits(1, 'XXX'), /supported ISO currency/);
  assert.throws(() => minorToMajorUnits(1.5, 'USD'), /safe integer/);
});
test('FX freshness and quote validation reject stale, future, mismatched and invalid quotes', () => {
  const now = Date.parse('2026-01-01T00:02:00Z');
  const quote = { fromCurrency: 'USD', toCurrency: 'NGN', rate: '1500.12345678', asOf: '2026-01-01T00:00:00Z', source: 'test' };
  assert.equal(quoteIsFresh(quote, { now, maxAgeMs: 180000 }), true);
  assert.equal(quoteIsFresh({ ...quote, asOf: '2025-12-31T23:00:00Z' }, { now }), false);
  assert.throws(() => validateFxQuote({ ...quote, toCurrency: 'GBP' }, { fromCurrency: 'USD', toCurrency: 'NGN', now }), /fresh FX quote/);
  assert.throws(() => validateFxQuote({ ...quote, asOf: '2026-01-01T00:03:00Z' }, { fromCurrency: 'USD', toCurrency: 'NGN', now }), /fresh FX quote/);
});
test('minor-unit conversion uses deterministic integer rounding and rejects malformed rates', () => {
  assert.equal(convertMinorUnits(100, { rate: '1.2345' }), 123);
  assert.equal(convertMinorUnits(1, { rate: '0.5' }), 1);
  assert.throws(() => convertMinorUnits(100, { rate: '0' }), /positive/);
  assert.throws(() => convertMinorUnits(-1, { rate: '2' }), /non-negative/);
});
test('cross-currency movement fails closed without policy while same-currency remains allowed', () => {
  assert.equal(assertSameCurrency('NGN', 'ngn'), 'NGN');
  assert.throws(() => assertSameCurrency('NGN', 'USD'), /Cross-currency movement is blocked/);
});
test('FX provider abstraction fails closed until a quote adapter is registered', async () => {
  const fx = createFxProvider();
  assert.equal(fx.configured, false);
  await assert.rejects(fx.quote('USD', 'NGN'), /not connected/);
  const ready = createFxProvider({ quote: async () => ({ fromCurrency: 'USD', toCurrency: 'NGN', rate: '1500', asOf: new Date().toISOString(), source: 'test' }) });
  assert.equal(ready.configured, true);
  assert.equal((await ready.quote('USD', 'NGN')).rate, '1500');
});
