const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const market = fs.readFileSync(path.join(__dirname, 'market.js'), 'utf8');
const dbSource = fs.readFileSync(path.join(__dirname, 'db.js'), 'utf8');
const lifecycle = fs.readFileSync(path.join(__dirname, 'accountLifecycle.js'), 'utf8');
const portability = fs.readFileSync(path.join(__dirname, 'accountPortability.js'), 'utf8');
const ui = fs.readFileSync(path.join(__dirname, '..', 'src', 'MarketInsights.tsx'), 'utf8');
const { historyStats, marketSummary, providerMeta, getPreferences } = require('./market');

test('Market Intelligence exposes source/timestamp/data-status metadata', () => {
  const meta = providerMeta('ngx', 'Nigerian Exchange Group market-data API', '2026-09-26T00:00:00.000Z');
  assert.equal(meta.dataStatus, 'provider');
  assert.equal(meta.source, 'Nigerian Exchange Group market-data API');
  assert.equal(meta.fetchedAt, '2026-09-26T00:00:00.000Z');
  assert.match(market, /dataStatus/);
  assert.match(market, /fetchedAt/);
});

test('Historical statistics calculate 30-point change and volatility context', () => {
  const stats = historyStats([{price:100},{price:105},{price:102},{price:110}]);
  assert.equal(stats.change, 10);
  assert.equal(stats.high, 110);
  assert.equal(stats.low, 100);
  assert.equal(stats.points, 4);
  assert.equal(typeof stats.volatility, 'number');
});

test('Market summary produces separate gainers and losers without trade execution', () => {
  const summary = marketSummary([
    {symbol:'A',name:'A',kind:'equity',price:10,change:3},
    {symbol:'B',name:'B',kind:'equity',price:10,change:-4},
    {symbol:'C',name:'C',kind:'index',price:100,change:8}
  ]);
  assert.equal(summary.gainers[0].symbol, 'A');
  assert.equal(summary.losers[0].symbol, 'B');
  assert.equal(summary.equityCount, 2);
  assert.doesNotMatch(market, /placeTrade|executeTrade|brokerAccount|portfolioTransfer|custody/i);
});

test('Market Intelligence has user-controlled privacy/display preferences and account cleanup', () => {
  assert.match(dbSource, /market_insight_preferences/);
  assert.match(market, /\/api\/market\/preferences/);
  assert.match(ui, /Your market settings/);
  assert.match(ui, /spendingContextEnabled/);
  assert.ok(require("./v5_77_0_account_closure_integrity").DELETE_USER_TABLES.includes("market_insight_preferences"));
  assert.ok(require("./v5_77_0_account_closure_integrity").PORTABLE_TABLES?.includes("market_insight_preferences") || portability.includes("market_insight_preferences"));
});

test('Default market preferences are conservative and do not expose provider secrets', () => {
  const fakeDb = { prepare: () => ({ get: () => undefined }) };
  const prefs = getPreferences(fakeDb, 'u1');
  assert.deepEqual(prefs, {insightsEnabled:1, spendingContextEnabled:1, showFx:1, showGold:1, showEquities:1, updatedAt:null});
  assert.doesNotMatch(ui, /MARKET_DATA_TOKEN|CBN_FX_TOKEN|GOLD_DATA_TOKEN/);
});
