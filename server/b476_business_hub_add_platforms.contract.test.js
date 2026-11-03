const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('adding YouTube later keeps the shop (businessType is appended, not replaced)', () => {
  const s = read('server/youtubeContent.js');
  assert.doesNotMatch(s, /currentType!=="marketplace"/);
  assert.equal((s.match(/currentType\.split\(","\)\.includes\(type\)/g) || []).length, 2);
  assert.match(s, /businessType \|\| ""\)\.split\(","\)\.includes\("youtube_narrativia"\)/);
});

test('vendor state reports platforms, business type and a received / not received launch benefit', () => {
  const s = read('server/vendorSubscriptions.js');
  assert.match(s, /platforms: \{ shop: hasShop\(db, vendor\)/);
  assert.match(s, /launchBenefit: db\.prepare\("SELECT 1 FROM vendor_launch_allocations WHERE userId=\?"\)/);
  assert.match(s, /"received" : "not_received"/);
  assert.match(s, /businessType: String\(vendor\.businessType/);
});

test('a YouTube-only account does not get free legacy shop access', () => {
  const s = read('server/vendorSubscriptions.js');
  assert.match(s, /!hasHistory && hasShop\(db, vendor\)/);
});

test('launch benefit is only ever granted by the first sign-up path', () => {
  const s = read('server/index.js');
  assert.equal((s.match(/createFreeVendor\(/g) || []).length, 1);
  const add = s.slice(s.indexOf('Shop added after sign-up'));
  assert.match(add, /status = 'pending_payment'/);
  assert.match(add, /PERIOD_TYPES\.PAID_ENTRY/);
  assert.doesNotMatch(add.slice(0, add.indexOf('const state = vendorSubscriptions.getVendorState')), /createFreeVendor/);
});

test('Business Hub screen can add the missing platform later', () => {
  const card = read('src/BusinessPlatformsCard.tsx');
  assert.match(card, /accessibilityLabel="Add YouTube to Business Hub"/);
  assert.match(card, /accessibilityLabel="Add shop to Business Hub"/);
  assert.match(card, /Launch benefit: received at sign-up/);
  assert.match(card, /Launch benefits are given once, at sign-up/);
  const dash = read('src/VendorDashboard.tsx');
  assert.match(dash, /<BusinessPlatformsCard /);
  assert.match(dash, /shopAdded/);
  assert.match(dash, /shownTab/);
});
