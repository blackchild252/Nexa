const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

test('B83 canonical Add navigation resolves only to existing NEXA creation surfaces', () => {
  const nav = read('src/nexaNavigation.ts');
  assert.match(nav, /export type AddNavigationAction/);
  assert.match(nav, /case 'friend': return validateNavigationTarget\({ pathname: '\/\(tabs\)\/zeeza'/);
  assert.match(nav, /case 'money': return validateNavigationTarget\(\{ pathname: '\/wallet'/);
  assert.match(nav, /case 'group': return validateNavigationTarget\({ pathname: '\/\(tabs\)\/money', params: \{ view: 'groups' \} \}/);
  assert.match(nav, /case 'product': return validateNavigationTarget\(\{ pathname: '\/marketplace\/vendor' \}/);
});

test('B83 global navigation exposes the missing Add tool', () => {
  const keys = read('src/NexaNavKeys.tsx');
  assert.match(keys, /NEXA_QUICK_ACCESS_LABELS\.add/);
  assert.match(keys, /function AddSheet/);
  for (const label of ['Add Friend', 'Add Money', 'New Sky Group', 'Add Product']) assert.match(keys, new RegExp(label));
});

test('B83 Add sheet uses existing modal accessibility and focus contracts', () => {
  const keys = read('src/NexaNavKeys.tsx');
  assert.match(keys, /useModalFocus\(open, panelRef\)/);
  assert.match(keys, /modalA11y\('NEXA Add'/);
  assert.match(keys, /modalCloseA11y\('Close Add menu'\)/);
});

test('B83 Add does not create new backend or advertising authority', () => {
  const keys = read('src/NexaNavKeys.tsx');
  assert.doesNotMatch(keys, /fetch\(|authedFetch\(|api\//);
  assert.doesNotMatch(keys, /NativeAd|YaayzAdvert|AdMob/);
});

test('B83 Add navigation preserves existing 44px interaction floor', () => {
  const keys = read('src/NexaNavKeys.tsx');
  assert.match(keys, /addIcon: \{ width: 44, height: 44/);
  assert.match(keys, /key: \{ width: theme\.accessibility\.minTouchTarget/);
});

test('B83 Add Friend enters the existing Zeeza friends context', () => {
  const nav = read('src/nexaNavigation.ts');
  assert.match(nav, /case 'friend': return validateNavigationTarget\({ pathname: '\/\(tabs\)\/zeeza', params: \{ section: 'friends' \} \}/);
});

test('B83 Add Money enters the existing Sky Wallet surface', () => {
  const nav = read('src/nexaNavigation.ts');
  assert.match(nav, /case 'money': return validateNavigationTarget\(\{ pathname: '\/wallet', params: \{ view: 'deposit' \} \}/);
});

test('B83 New Sky Group enters the existing Sky Group surface', () => {
  const nav = read('src/nexaNavigation.ts');
  assert.match(nav, /case 'group': return validateNavigationTarget\({ pathname: '\/\(tabs\)\/money', params: \{ view: 'groups' \} \}/);
});

test('B83 Add Product enters the existing Marketplace vendor boundary', () => {
  const nav = read('src/nexaNavigation.ts');
  assert.match(nav, /case 'product': return validateNavigationTarget\(\{ pathname: '\/marketplace\/vendor' \}/);
  assert.match(read('src/app/marketplace/vendor.tsx'), /VendorDashboard/);
});

test('B83 Add preserves existing motion and navigation ownership', () => {
  const keys = read('src/NexaNavKeys.tsx');
  assert.match(keys, /useMotion\(\)/);
  assert.match(keys, /navigationForDirectoryItem/);
  assert.match(keys, /nexaGoBack/);
  assert.doesNotMatch(keys, /setTab\(|setVendorMode\(|createProduct\(/);
});
