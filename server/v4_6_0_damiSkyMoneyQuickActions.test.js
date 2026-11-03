const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('Dami Home no longer duplicates module shortcuts', () => {
  const dami = read('src/NexaAI.tsx');
  for (const label of ['Sky Money','Sky Wallet','Sky Store Savings','Sky Group Savings','Sky Market Watch','Sky Insights','Dream Marketplace','Yaayz Tickets']) {
    assert.doesNotMatch(dami, new RegExp(`\\[\\['${label}`));
  }
  assert.match(dami, /Dami is your NEXA front door/);
  assert.match(dami, /Quick Scam Check/);
  assert.match(dami, /Upload/);
});

test('Primary product modules are owned by the bottom navigation', () => {
  const tabs = read('src/app/(tabs)/_layout.tsx');
  for (const route of ['money','zeeza','marketplace','yaayz','leisure','profile']) assert.match(tabs, new RegExp(`name=\"${route}\"`));
});

test('Sky Money accepts a server-independent initial view without duplicating financial flows', () => {
  const route = read('src/app/(tabs)/money.tsx');
  const dashboard = read('src/MoneyDashboard.tsx');
  assert.match(route, /useLocalSearchParams/);
  assert.match(route, /initialView/);
  assert.match(dashboard, /initialView\?/);
  assert.match(dashboard, /useState<.*initialView/s);
  assert.doesNotMatch(route, /fetch\(|authedFetch\(/);
});
