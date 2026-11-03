const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const market = fs.readFileSync(path.join(__dirname, 'market.js'), 'utf8');
const { buildResearchSignals } = require('./market');
const ui = fs.readFileSync(path.join(__dirname, '..', 'src', 'MarketInsights.tsx'), 'utf8');

test('Market Insights stays information-only and broker-free', () => {
  assert.match(market, /does not execute trades/);
  assert.match(market, /not investment advice/);
  assert.match(ui, /Research signals/);
  assert.match(ui, /not.*personalized investment advice/);
});

test('Market data can use the official NGX API without exposing the token to the client', () => {
  assert.match(market, /marketdataapiv3\.ngxgroup\.com/);
  assert.match(market, /MARKET_DATA_TOKEN/);
  assert.doesNotMatch(ui, /MARKET_DATA_TOKEN/);
});


test("Market Insights can use the user's logged spending only as a research-theme context", () => {
  const result = buildResearchSignals([
    { symbol: 'DANGCEM', name: 'Dangote Cement', currency: 'NGN', price: 100, change: 1.2, kind: 'equity' },
    { symbol: 'GTCO', name: 'GTCO', currency: 'NGN', price: 60, change: 0.2, kind: 'equity' }
  ], [
    { category: 'shopping', amount: 50000, date: '2026-09-20' },
    { category: 'food', amount: 10000, date: '2026-09-19' }
  ]);
  assert.equal(result.topSpendingCategory, 'shopping');
  assert.equal(result.candidates.length, 2);
  assert.match(result.disclaimer, /research prompts/);
});

test('Market Insights has no broker, order, custody, or transfer capability', () => {
  assert.doesNotMatch(market, /placeTrade|executeTrade|brokerAccount|portfolioTransfer|custody/i);
});
