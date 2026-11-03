const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'seedFashionVendors.js'), 'utf8');
const idx = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');

test('seed uses only valid Mall categories', () => {
  const allowed = new Set([...idx.match(/MALL_CATEGORIES = \[([\s\S]*?)\]/)[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]));
  for (const c of new Set([...src.matchAll(/", "([a-z &]+)", \d+, \d+, "/g)].map((m) => m[1]))) assert.ok(allowed.has(c), c);
});
test('Blaca Essentials covers watches, suits, hats, shoes, pants and jackets', () => {
  const blaca = src.slice(src.indexOf('const BLACA'), src.indexOf('const DEMO'));
  for (const w of ['Watch', 'Suit', 'Fedora|Cap', 'Oxford|Loafers', 'Chinos|Trousers', 'Jacket']) assert.match(blaca, new RegExp(w));
});
test('seed is idempotent by design and never hardcodes a password', () => {
  assert.match(src, /WHERE vendorId=\? AND name=\?/);
  assert.match(src, /lower\(shopName\) = lower\(\?\)/);
  assert.doesNotMatch(src, /password\s*[:=]\s*["'][^"']{6,}["']/i);
});

test('server start seeds Blaca Essentials automatically, before listen, and can be disabled', () => {
  const idx = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
  const call = idx.indexOf('require("./seedFashionVendors").ensureBlacaAtStartup(');
  assert.ok(call > 0 && call < idx.indexOf('const server = app.listen('));
  assert.match(src, /NEXA_SKIP_BLACA_SEED/);
  assert.match(src, /NEXA_SEED_DEMO_VENDORS/);
});
test('startup seed uses passed env (owner attach) and never throws', () => {
  assert.match(src, /function apply\(\{ demo, env = process\.env \}\)/);
  assert.match(src, /function ensureBlacaAtStartup[\s\S]*catch \(e\)[\s\S]*seed skipped/);
});
