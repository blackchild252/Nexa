const test = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { saveVerifiedQuote, getFreshQuote } = require('./fxQuoteStore');

test('FX quote persistence accepts only fresh, matching, supported quotes', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE fx_rate_quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fromCurrency TEXT NOT NULL,
    toCurrency TEXT NOT NULL,
    rate TEXT NOT NULL,
    source TEXT NOT NULL,
    asOf TEXT NOT NULL,
    storedAt TEXT NOT NULL,
    CHECK (fromCurrency <> toCurrency),
    UNIQUE (fromCurrency,toCurrency,source,asOf)
  )`);
  const now = Date.parse('2026-10-09T00:00:00.000Z');
  const quote = { fromCurrency: 'USD', toCurrency: 'NGN', rate: '1500.12345678', source: 'verified-test-adapter', asOf: new Date(now - 1000).toISOString() };
  const saved = saveVerifiedQuote(db, quote, { now });
  assert.equal(saved.rate, quote.rate);
  assert.equal(getFreshQuote(db, 'USD', 'NGN', { now }).rate, quote.rate);
  assert.equal(getFreshQuote(db, 'USD', 'EUR', { now }), null);
  assert.throws(() => saveVerifiedQuote(db, { ...quote, rate: '1.123456789' }, { now }), /at most 8 fractional digits/);
  assert.throws(() => saveVerifiedQuote(db, { ...quote, asOf: new Date(now + 1000).toISOString() }, { now }), /fresh FX quote/);
  assert.throws(() => saveVerifiedQuote(db, { ...quote, toCurrency: 'XXX' }, { now }), /supported ISO currency/);
  assert.equal(getFreshQuote(db, 'USD', 'NGN', { now: now + 6 * 60 * 1000 }), null);
  db.close();
});

test('Main schema declares a persistent quote table with currency-pair lineage', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const schema = fs.readFileSync(path.join(__dirname, 'db.js'), 'utf8');
  assert.match(schema, /CREATE TABLE IF NOT EXISTS fx_rate_quotes/);
  assert.match(schema, /UNIQUE \(fromCurrency,toCurrency,source,asOf\)/);
  assert.match(schema, /idx_fx_rate_quotes_pair_freshness/);
});
