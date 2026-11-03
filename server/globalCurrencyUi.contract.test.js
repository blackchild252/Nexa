const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('critical money-facing Main screens use strict currency formatting, not hard-coded symbols', () => {
  const files = [
    'src/MoneyDashboard.tsx', 'src/FinancialPlanning.tsx', 'src/Wallet.tsx',
    'src/KitchenHub.tsx', 'src/LeisureKitchenScreen.tsx', 'src/StoreAjo.tsx',
    'src/YaayzScreen.tsx', 'src/YaayzHomeFeed.tsx', 'src/VendorDashboard.tsx',
    'src/YouTubeBusinessPanel.tsx', 'src/MarketplaceStorefront.tsx',
    'src/MarketplaceScreen.tsx', 'src/NexaAI.tsx', 'src/Subscription.tsx',
  ];
  for (const file of files) {
    const source = read(file);
    assert.doesNotMatch(source, /₦/, `${file} must not hard-code a currency symbol`);
    assert.match(source, /formatMajorCurrency|formatMinorCurrency|currencyDisplay|currency\.currency|\.currency\)/, `${file} must preserve currency-aware display`);
  }
});

test('Marketplace price ranges and price sorting require a supported selected currency', () => {
  const api = read('server/index.js');
  const ui = read('src/MarketplaceStorefront.tsx');
  const state = read('src/useMarketplace.ts');
  const client = read('src/marketplace.ts');
  assert.match(api, /A currency is required before filtering or sorting by price/);
  assert.match(api, /UPPER\(COALESCE\(p\.currency, ''\)\) = \?/);
  assert.match(ui, /Currency for price filtering and sorting/);
  assert.match(ui, /Prices are compared only within the selected currency/);
  assert.match(ui, /priceText=\(price:number,currency\?:string\)=>formatMajorCurrency/);
  assert.match(state, /currency\?:string/);
  assert.match(client, /params\.set\('currency', options\.currency\.toUpperCase\(\)\)/);
});

test('Marketplace Aami checkout rejects unknown currency rather than assuming NGN', () => {
  const source = read('src/MarketplaceScreen.tsx');
  assert.match(source, /String\(i\.product\.currency\|\|''\)\.toUpperCase\(\)!=='NGN'/);
});
