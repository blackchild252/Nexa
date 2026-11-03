const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('B71 shared data-state primitive is readable and retryable', () => {
  const s = read('src/NexaDataState.tsx');
  assert.match(s, /loading\?: boolean/);
  assert.match(s, /onAction\?: \(\) => void/);
  assert.match(s, /minHeight: 44/);
  assert.match(s, /accessibilityLiveRegion="polite"/);
});

test('B71 Market Watch preserves successful quotes during refresh failures', () => {
  const s = read('src/MarketWatch.tsx');
  assert.match(s, /lastSuccessfulAt/);
  assert.match(s, /Showing the last successful market snapshot/);
  assert.match(s, /No synthetic replacement prices are being shown/);
});

test('B71 primary data surfaces expose explicit retry states', () => {
  for (const [file, label] of [
    ['src/MarketInsights.tsx', 'Retry insights'],
    ['src/NotificationCenter.tsx', 'Retry notifications'],
    ['src/MarketplaceScreen.tsx', 'Retry Marketplace'],
    ['src/YaayzScreen.tsx', 'Retry Yaayz'],
  ]) {
    const s = read(file);
    assert.match(s, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(s, /NexaDataState/);
  }
});

test('B71 marketplace load failures are stateful instead of alert-only', () => {
  const s = read('src/useMarketplace.ts');
  assert.match(s, /const \[error,setError\]=useState/);
  assert.match(s, /setError\(e\?\.message/);
  assert.match(s, /return \{products,discovery,error,setError/);
});

test('B71 does not create new data, payment, navigation or advertising authorities', () => {
  const files = ['src/NexaDataState.tsx','src/MarketWatch.tsx','src/MarketInsights.tsx','src/NotificationCenter.tsx','src/MarketplaceScreen.tsx','src/useMarketplace.ts','src/YaayzScreen.tsx'];
  const combined = files.map(read).join('\n');
  assert.doesNotMatch(combined, /AdMob|react-native-google-mobile-ads/);
  assert.doesNotMatch(combined, /CREATE TABLE|ALTER TABLE|paymentAuthority|ticketAuthority/);
});
