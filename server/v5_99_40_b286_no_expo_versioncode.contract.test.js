const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
const agents = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
test('B286 expo.versionCode is removed and the four real build code fields agree', () => {
  assert.strictEqual(app.expo.versionCode, undefined);
  const code = app.expo.android.versionCode;
  assert.deepStrictEqual([Number(app.expo.ios.buildNumber), app.expo.extra.versionCode, app.versionCode], [code, code, code]);
});
test('B286 locked AGENTS.md no longer lists expo.versionCode as a required field', () => {
  assert.ok(!/`expo\.versionCode`, and root/.test(agents));
  assert.match(agents, /PERMANENT NEXA RULE — LOCKED/);
});
test('B286 identity script no longer reads or writes expo.versionCode', () => {
  const s = fs.readFileSync(path.join(root, 'scripts/release-identity.mjs'), 'utf8');
  assert.ok(!/e\.versionCode/.test(s) && !/expo\.versionCode'/.test(s));
});
