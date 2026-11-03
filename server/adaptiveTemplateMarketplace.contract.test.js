const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const client = fs.readFileSync(path.join(root, 'src', 'marketplace.ts'), 'utf8');
const server = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
const vendor = fs.readFileSync(path.join(root, 'src', 'VendorDashboard.tsx'), 'utf8');
const inbox = fs.readFileSync(path.join(root, 'src', 'ZeezaInbox.tsx'), 'utf8');
const theme = fs.readFileSync(path.join(root, 'src', 'theme.ts'), 'utf8');

const categories = [
  'electronics','phones & tablets','computers','fashion','jewelry & accessories',
  'beauty','home & living','groceries','health & wellness','baby & kids',
  'sports & fitness','automotive','books & media','services','other'
];

test('Dream Marketplace exposes the expanded shopping category set consistently', () => {
  for (const category of categories) {
    assert.match(client, new RegExp(category.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')));
    assert.match(server, new RegExp(category.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')));
  }
  assert.match(vendor, /categories\.map/);
  assert.match(vendor, /category\}/);
});

test('Inbox is the user-facing Zeeza messaging label', () => {
  assert.match(inbox, /Zeeza Inbox/);
  assert.match(inbox, />Inbox<\/Text>/);
  assert.doesNotMatch(inbox, /<Text[^>]*>DMs<\/Text>/);
});

test('Royal Dark template provides adaptive content layout tokens rather than a fixed five-tab shell', () => {
  assert.match(theme, /layout:\s*\{/);
  assert.match(theme, /pagePadding/);
  assert.match(theme, /cardPadding/);
  const tabs = fs.readFileSync(path.join(root, 'src', 'app', '(tabs)', '_layout.tsx'), 'utf8');
  assert.match(tabs, /name="money" options=\{\{title:BRAND\.money\}\}/);
  assert.match(tabs, /name="zeeza" options=\{\{title:BRAND\.zeeza\}\}/);
  assert.match(tabs, /name="marketplace" options=\{\{title:BRAND\.marketplace\}\}/);
  assert.match(tabs, /name="yaayz" options=\{\{title:BRAND\.yaayz\}\}/);
  assert.match(tabs, /name="leisure" options=\{\{title:BRAND\.leisure\}\}/);
});
