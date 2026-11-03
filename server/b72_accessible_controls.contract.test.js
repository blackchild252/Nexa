const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

test('B72 primary tabs expose explicit accessibility labels without changing the seven-section shell', () => {
  const src = read('src/app/(tabs)/_layout.tsx');
  for (const [name, label] of [['money','Sky Money'],['zeeza','Zeeza social'],['marketplace','Dream Marketplace'],['yaayz','Yaayz discovery and tickets'],['leisure','Leisure Arena']]) {
    assert.match(src, new RegExp(`name=\"${name}\" options=\{\{title:BRAND\.${name}\}\}`));
    assert.match(src, new RegExp(`(?:${name}:'${label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`));
  }
  assert.match(src, /name=\"profile\" options=\{\{title:BRAND\.profile,href:null\}\}/);
  assert.match(src, /tabBarAccessibilityLabel:/);
});

test('B72 auth entry controls and fields are screen-reader labeled', () => {
  const login = read('src/app/auth/login.tsx');
  const signup = read('src/app/auth/signup.tsx');
  for (const needle of ['accessibilityLabel="Email address"','accessibilityLabel="Password"','accessibilityLabel={busy?"Signing in":"Sign in"','accessibilityLabel="Create a NEXA account"']) assert.match(login, new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  for (const needle of ['accessibilityLabel="Username"','accessibilityLabel="Email address"','accessibilityLabel="Password"','accessibilityLabel={busy?"Creating account":"Create account"','accessibilityLabel="Sign in to an existing account"']) assert.match(signup, new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
});

test('B72 profile and Zeeza section actions expose semantic roles and selected state', () => {
  const profile = read('src/app/(tabs)/profile.tsx');
  const zeeza = read('src/app/(tabs)/zeeza.tsx');
  for (const label of ['Open NEXA Membership','Open Extensions','Open Developer Console','Sign out other sessions','Sign out of NEXA']) assert.match(profile, new RegExp(`accessibilityLabel="${label}"`));
  for (const label of ['Open Zeeza Inbox','Open Zeeza Friends','Open Zeeza Chase']) assert.match(zeeza, new RegExp(`accessibilityRole="tab"[^>]*accessibilityLabel="${label}"`));
  assert.match(zeeza, /accessibilityState=\{\{selected:section==='inbox'\}\}/);
});

test('B72 Dami consequence and voice controls are explicitly labeled', () => {
  const src = read('src/NexaAI.tsx');
  for (const label of ['Confirm Dami action','Cancel Dami action','Send message to Dami','Record a voice command']) assert.match(src, new RegExp(`accessibilityLabel(?:=|\})[^\n]*${label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`));
  assert.match(src, /accessibilityRole="switch" accessibilityLabel="Dami proactive suggestions"/);
  assert.match(src, /accessibilityRole="radio" accessibilityLabel=\{`Dami voice \$\{v\}`\}/);
});

test('B72 Marketplace commerce actions remain the same actions with explicit labels', () => {
  const src = read('src/MarketplaceScreen.tsx');
  for (const label of ['Open cart','Open orders and payments','Open seller dashboard','Refresh order and payment history','Request refund','Open payment dispute','Confirm dispute resolution','Cancel order']) { if (label === 'Open cart') assert.match(src, /accessibilityLabel=\{`Open cart,/); else if (label === 'Open orders and payments') assert.match(src, /accessibilityLabel=\{ordersOpen\?/); else assert.match(src, new RegExp(`accessibilityLabel=\"${label}`)); }
  assert.match(src, /m\.place\(/);
  assert.match(src, /requestOrderRefund\(/);
  assert.match(src, /openOrderDispute\(/);
  assert.match(src, /confirmOrderDispute\(/);
});
