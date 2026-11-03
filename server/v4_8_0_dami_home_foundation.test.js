const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('V4.8.0 Home is Dami-only and does not duplicate product destinations', () => {
  const home = read('src/app/(tabs)/index.tsx');
  const dami = read('src/NexaAI.tsx');
  assert.match(home, /HomeCommandCenter/);
  for (const label of ['Sky Money', 'Sky Wallet', 'Sky Store Savings', 'Sky Group Savings', 'Sky Market Watch', 'Sky Insights', 'Dream Marketplace', 'Yaayz']) {
    assert.doesNotMatch(home, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.doesNotMatch(dami, /Open Dream Marketplace/);
  assert.doesNotMatch(dami, /Open Sky Money/);
  assert.doesNotMatch(dami, /Open Sky Wallet/);
  assert.match(dami, /Quick Scam Check/);
  assert.match(dami, /Upload/);
  assert.match(dami, /Recorded voice command/);
  assert.match(dami, /ref=\{inputRef\}/);
});

test('V4.8.0 Dami upload and ScamCheck use the existing authenticated server boundary', () => {
  const api = read('src/api.ts');
  const dami = read('src/NexaAI.tsx');
  const server = read('server/index.js');
  assert.match(api, /scamCheckImage/);
  assert.match(api, /\/api\/scamcheck-image/);
  assert.match(dami, /ImagePicker\.launchImageLibraryAsync/);
  assert.match(dami, /scamCheckImage\(/);
  assert.match(server, /app\.post\("\/api\/scamcheck-image", auth\.authMiddleware, aiLimiter/);
});

test('V4.8.0 canonical Dami route opens the Dami assistant surface', () => {
  const route = read('src/app/dami.tsx');
  assert.match(route, /<NexaAI[\s\S]*embedded/);
  assert.match(route, /router\.replace/);
});

test('V4.8.0 public Sky naming remains separated from internal compatibility IDs', () => {
  const brand = read('src/brand.ts');
  const groups = read('src/groups.ts');
  const store = read('src/StoreAjo.tsx');
  assert.match(brand, /money: 'Sky Money'/);
  assert.match(brand, /savings: 'Sky Savings'/);
  assert.match(brand, /groupSavings: 'Sky Group Savings'/);
  assert.match(brand, /storeSavings: 'Sky Store Savings'/);
  assert.match(groups, /ajo: "Sky Savings"/);
  assert.match(store, /Sky Store Savings/);
  assert.match(store, /\/api\/money\/ajo\/store/);
});

test('V4.8.0 navigation retains explicit back affordances on deep financial surfaces', () => {
  const money = read('src/MoneyDashboard.tsx');
  const store = read('src/StoreAjo.tsx');
  const wallet = read('src/Wallet.tsx');
  assert.match(money, /skyTabBar[\s\S]*\['overview', 'Overview'\]/);
  assert.match(store, /‹ Back to Sky Money/);
  assert.match(wallet, /‹ Back/);
});
