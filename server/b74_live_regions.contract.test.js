const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

test('B74 shared live region supports native and web polite announcements', () => {
  const src = read('src/NexaLiveRegion.tsx');
  assert.match(src, /accessibilityLiveRegion=\{politeness\}/);
  assert.match(src, /'aria-live': politeness/);
  assert.match(src, /role: 'status'/);
});

test('B74 async data state announces its current status', () => {
  const src = read('src/NexaDataState.tsx');
  assert.match(src, /<NexaLiveRegion message=\{`\$\{title\}\. \$\{message\}`\}/);
});

test('B74 market and insights surfaces expose dynamic status announcements', () => {
  for (const f of ['src/MarketWatch.tsx','src/MarketInsights.tsx']) {
    const src = read(f);
    assert.match(src, /NexaLiveRegion/);
    assert.match(src, /liveMessage/);
  }
});

test('B74 notification, marketplace and Yaayz states expose dynamic announcements', () => {
  for (const f of ['src/NotificationCenter.tsx','src/MarketplaceScreen.tsx','src/YaayzHomeFeed.tsx']) {
    const src = read(f);
    assert.match(src, /NexaLiveRegion/);
    assert.match(src, /liveMessage/);
  }
});

test('B74 announcement primitive is visually hidden without display-none or layout mutation', () => {
  const src = read('src/NexaLiveRegion.tsx');
  assert.match(src, /opacity: 0/);
  assert.match(src, /width: 1/);
  assert.match(src, /height: 1/);
  assert.doesNotMatch(src, /display:\s*['"]none['"]/);
});
