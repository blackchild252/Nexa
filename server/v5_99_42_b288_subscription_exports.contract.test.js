const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const subscriptions = require('./subscriptions');

test('B288 subscriptions exports currentSubscription (Sky Money Overview and Activity call it)', () => {
  assert.strictEqual(typeof subscriptions.currentSubscription, 'function');
});

test('B288 every subscriptions.<name> that another server file uses is exported', () => {
  const files = fs.readdirSync(__dirname).filter((f) => f.endsWith('.js') && !f.endsWith('.test.js') && f !== 'subscriptions.js');
  const missing = [];
  for (const f of files) {
    const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
    if (!/require\(["']\.\/subscriptions["']\)/.test(src)) continue;
    for (const m of src.matchAll(/\bsubscriptions\.([A-Za-z_]+)\b/g)) {
      if (!(m[1] in subscriptions)) missing.push(`${f}: subscriptions.${m[1]}`);
    }
  }
  assert.deepStrictEqual([...new Set(missing)], []);
});

test('B288 aamiEconomy no longer fails on the export when it loads', () => {
  assert.doesNotThrow(() => require('./aamiEconomy'));
});
