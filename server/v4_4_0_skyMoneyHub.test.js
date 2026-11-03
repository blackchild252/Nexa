const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const read = (p) => fs.readFileSync(path.resolve(__dirname, p), 'utf8');

test('V4.4.0 Sky Money exposes dedicated market surfaces', () => {
  const ui = read('../src/MoneyDashboard.tsx');
  assert.match(ui, /Sky Market Watch/);
  assert.match(ui, /Sky Insights/);
  assert.match(ui, /setView\("market"\)/);
  assert.match(ui, /setView\("insights"\)/);
});

test('V4.4.0 removes market duplication from Groups', () => {
  const ui = read('../src/GroupsTab.tsx');
  assert.doesNotMatch(ui, /<MarketWatch\s*\/>/);
  assert.doesNotMatch(ui, /<MarketInsights\s*\/>/);
  assert.match(ui, /Sky Group Savings/);
});

test('V4.4.0 preserves existing market API modules', () => {
  assert.match(read('../src/MarketWatch.tsx'), /\/api\/market\/quotes/);
  assert.match(read('../src/MarketInsights.tsx'), /\/api\/market\/insights/);
});
