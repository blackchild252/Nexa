const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('V4.7.0 canonical public names live in one branding foundation', () => {
  const brand = read('src/brand.ts');
  for (const label of ['Sky Money', 'Sky Wallet', 'Sky Savings', 'Sky Group Savings', 'Sky Store Savings', 'Sky Market Watch', 'Sky Insights', 'Dream Marketplace', 'Zeeza', 'Yaayz', 'L.A.']) {
    assert.match(brand, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(brand, /legacy IDs[\s\S]*retained internally/);
});

test('V4.7.0 Home has no module shortcut grid and bottom navigation owns module entry', () => {
  const home = read('src/app/(tabs)/index.tsx');
  const dami = read('src/NexaAI.tsx');
  const tabs = read('src/app/(tabs)/_layout.tsx');
  for (const shortcut of ['Sky Money', 'Sky Wallet', 'Sky Store Savings', 'Sky Group Savings', 'Sky Market Watch', 'Sky Insights', 'Dream Marketplace', 'Yaayz Tickets']) {
    assert.doesNotMatch(dami, new RegExp(`\\[\\['${shortcut}`));
  }
  for (const route of ['index', 'money', 'zeeza', 'marketplace', 'yaayz', 'leisure', 'profile']) assert.match(tabs, new RegExp(`name="${route}"`));
  assert.match(tabs, /name="ai" options=\{\{href:null\}\}/);
  assert.match(home, /<NexaAI[\s\S]*embedded/);
});

test('V4.7.0 Royal Dark tokens are richer than the legacy muted gold palette', () => {
  const theme = read('src/theme.ts');
  assert.match(theme, /royalGold:\s*'#D4AF37'/);
  assert.match(theme, /brightGold:\s*'#FFD700'/);
  assert.match(theme, /ivoryText:\s*'#F8F5E9'/);
  assert.match(theme, /graphite:\s*'#1A1A1A'/);
  assert.match(theme, /charcoal:\s*'#2A2A2A'/);
  assert.match(theme, /deepBlack:\s*'#000000'/);
  assert.match(theme, /shadow:\s*\{/);
});
