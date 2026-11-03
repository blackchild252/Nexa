const test = require('node:test');
const {atLeast,currentVersionMd}=require('./versionAtLeast');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('B40 active version is V5.8.0', () => {
  assert.ok(atLeast(require(path.join(root, 'package.json')).version,'5.8.0'),'version must be at least 5.8.0');
  assert.ok(atLeast(require(path.join(root, 'server/package.json')).version,'5.8.0'),'version must be at least 5.8.0');
  assert.ok(atLeast(require(path.join(root, 'app.json')).expo.version,'5.8.0'),'version must be at least 5.8.0');
});

test('Sky Store Savings catalog/account refresh rejects stale responses', () => {
  const s=read('src/StoreAjo.tsx'); assert.match(s,/loadRequest/); assert.match(s,/requestId !== loadRequest\.current/); assert.match(s,/requestId === loadRequest\.current/);
});
test('Sky Store Savings contribution fee preview rejects stale responses', () => {
  const s=read('src/StoreAjo.tsx'); assert.match(s,/feeRequests/); assert.match(s,/requestId !== feeRequests\.current\[account\.id\]/);
});
test('Extension Developer Console refresh rejects stale responses', () => {
  const s=read('src/ExtensionDeveloperScreen.tsx'); assert.match(s,/loadRequest/); assert.match(s,/requestId!==loadRequest\.current/); assert.match(s,/requestId===loadRequest\.current/);
});
test('Extension Developer audit and identity reads reject stale responses', () => {
  const s=read('src/ExtensionDeveloperScreen.tsx'); assert.match(s,/detailRequests/); assert.match(s,/requestId!==detailRequests\.current\[id\]/); assert.match(s,/identity:\$\{id\}/);
});
test('Sky Financial Planning composite refresh rejects stale responses', () => {
  const s=read('src/FinancialPlanning.tsx'); assert.match(s,/loadRequest/); assert.match(s,/requestId!==loadRequest\.current/); assert.match(s,/requestId===loadRequest\.current/);
});
test('Sky Market Watch refresh rejects stale responses', () => {
  const s=read('src/MarketWatch.tsx'); assert.match(s,/loadRequest/); assert.match(s,/requestId!==loadRequest\.current/);
});
test('Sky Insights refresh rejects stale responses', () => {
  const s=read('src/MarketInsights.tsx'); assert.match(s,/loadRequest/); assert.match(s,/requestId!==loadRequest\.current/);
});
test('Kitchen refresh rejects stale responses before receipt state replacement', () => {
  const s=read('src/LeisureKitchenScreen.tsx'); assert.match(s,/loadRequest/); assert.match(s,/requestId!==loadRequest\.current/); assert.match(s,/requestId===loadRequest\.current.*setReceiptImages/s);
});
test('Sky Wallet overview refresh rejects stale responses', () => {
  const s=read('src/Wallet.tsx'); assert.match(s,/loadRequest/); assert.match(s,/requestId!==loadRequest\.current/);
});
test('Sky Wallet service-fee preview rejects stale responses', () => {
  const s=read('src/Wallet.tsx'); assert.match(s,/feeRequest/); assert.match(s,/requestId!==feeRequest\.current/);
});
test('B40 keeps V5-only release line', () => {
  const roadmap=read('MASTER_ROADMAP.md'); assert.match(roadmap,/## V5\.7\.1 — B43.1/); assert.match(roadmap,/## V5\.8\.0 — Batch B44/); assert.ok(atLeast(currentVersionMd(read('VERSION.md')),'5.8.0'));
});
