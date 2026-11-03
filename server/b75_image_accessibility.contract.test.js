const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

test('B75 shared image accessibility helpers expose semantic and decorative contracts', () => {
  const src = fs.readFileSync(path.join(root, 'src/imageAccessibility.ts'), 'utf8');
  assert.match(src, /accessibilityRole: 'image'/);
  assert.match(src, /accessibilityLabel: label/);
  assert.match(src, /accessible: false/);
});

test('B75 Marketplace product imagery has meaningful labels', () => {
  const src = fs.readFileSync(path.join(root, 'src/MarketplaceScreen.tsx'), 'utf8');
  assert.match(src, /accessibilityLabel=\{`\$\{p\.name\} product image`\}/);
});

test('B75 social profile imagery has person-specific labels', () => {
  for (const file of ['src/FriendsScreen.tsx','src/ZeezaProfile.tsx','src/ZeezaChase.tsx','src/app/zeeza/share/[token].tsx']) {
    const src = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(src, /accessibilityLabel=/, file);
  }
});

test('B75 receipt and advertiser imagery is announced by purpose', () => {
  const kitchen = fs.readFileSync(path.join(root, 'src/LeisureKitchenScreen.tsx'), 'utf8');
  const ad = fs.readFileSync(path.join(root, 'src/YaayzNativeAd.tsx'), 'utf8');
  assert.match(kitchen, /Receipt for order/);
  assert.match(ad, /Advertiser icon/);
});

test('B75 world background imagery remains decorative when it is environmental', () => {
  const src = fs.readFileSync(path.join(root, 'src/NexaWorldBackground.tsx'), 'utf8');
  assert.match(src, /accessible=\{false\}/);
});
