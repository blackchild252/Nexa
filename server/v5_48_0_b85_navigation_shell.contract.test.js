const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

test('B85 user-world dock exposes only the five primary worlds', () => {
  const layout = read('src/app/(tabs)/_layout.tsx');
  for (const name of ['money','zeeza','marketplace','yaayz','leisure']) assert.match(layout, new RegExp(`name=\\"${name}\\"`));
  assert.match(layout, /name=\"profile\" options=\{\{title:BRAND\.profile,href:null\}\}/);
  assert.match(layout, /name=\"search\" options=\{\{href:null\}\}/);
  assert.doesNotMatch(layout, /name=\"profile\" options=\{\{title:BRAND\.profile\}\}/);
});

test('B85 profile/settings is not part of the tab icon registry', () => {
  const layout = read('src/app/(tabs)/_layout.tsx');
  const iconBlock = layout.match(/const iconMap:[\s\S]*?= \{([\s\S]*?)\n\};/);
  assert.ok(iconBlock, 'icon registry missing');
  assert.doesNotMatch(iconBlock[1], /profile\s*:/);
});

test('B85 Home adds a dedicated quick-search rail without creating a second search authority', () => {
  const home = read('src/HomeCommandCenter.tsx');
  assert.match(home, /SEARCH NEXA/);
  assert.match(home, /router\.push\('\/\(tabs\)\/search'/);
  assert.match(home, /searchRailItem/);
});

test('B85 global inner-screen navigation keeps Search as a primary key', () => {
  const keys = (read('src/NexaNavKeys.tsx')+read('src/nexaAccessibility.ts'));
  assert.match(keys, /Search NEXA/);
  assert.match(keys, /router\.push\('\/\(tabs\)\/search'/);
});

test('B85 Search remains a real route and remains outside the world dock', () => {
  assert.equal(fs.existsSync(path.join(root, 'src/app/(tabs)/search.tsx')), true);
  const layout = read('src/app/(tabs)/_layout.tsx');
  assert.match(layout, /name=\"search\" options=\{\{href:null\}\}/);
});

test('B85 Zeeza remains the home for Inbox, Friends and Chase rather than gaining extra global tabs', () => {
  const zeeza = read('src/app/(tabs)/zeeza.tsx');
  for (const label of ['Open Zeeza Inbox','Friends','Chase']) assert.match(zeeza, new RegExp(label));
  const layout = read('src/app/(tabs)/_layout.tsx');
  assert.doesNotMatch(layout, /name=\"inbox\"/);
});

test('B85 Marketplace keeps vendor/admin entry inside its world boundary', () => {
  const market = read('src/app/(tabs)/marketplace.tsx');
  assert.match(market, /onVendor=\{\(\) => router\.push\('\/marketplace\/vendor'/);
  assert.match(market, /onAdmin=\{\(\) => router\.push\('\/marketplace\/disputes'/);
  const layout = read('src/app/(tabs)/_layout.tsx');
  assert.doesNotMatch(layout, /name=\"vendor\"|name=\"disputes\"/);
});

test('B85 Home directory still owns profile/settings and search access', () => {
  const home = read('src/homeDesign.ts');
  assert.match(home, /\['search','Search','search-outline'/);
  assert.match(home, /\['profile','Profile','person-outline'/);
});

test('B85 notification and search navigation remain centralized', () => {
  const nav = read('src/nexaNavigation.ts');
  assert.match(nav, /export function navigationForNotification/);
  assert.match(nav, /case 'search': return navigationForDirectoryItem\('search'\)/);
  assert.match(nav, /export function navigationForSearchResult/);
});

test('B85 no new business or advertising authority is introduced by shell navigation', () => {
  const files = [read('src/app/(tabs)/_layout.tsx'), read('src/HomeCommandCenter.tsx')].join('\n');
  assert.doesNotMatch(files, /Paystack|AdMob|NativeAd|paymentIntent|authorize|grantRole/);
});
