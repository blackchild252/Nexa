'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const __r=(p)=>JSON.parse(require('fs').readFileSync(require('path').join(__dirname,'..',p),'utf8'));
const CUR=__r('package.json').version, CODE=__r('app.json').expo.android.versionCode, CURB=__r('PROJECT_MEMORY.json').currentBatch;

const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

test('current launch environment contract is explicit and secret-safe', async () => {
  const c = await import(pathToFileURL(path.join(root, 'scripts/production-env-contract.mjs')).href);
  assert.deepEqual(c.PUBLIC_KEYS, ['EXPO_PUBLIC_API_URL','EXPO_PUBLIC_PRIVACY_POLICY_URL','EXPO_PUBLIC_TERMS_URL']);
  const missing = c.inspectProductionEnvironment({NODE_ENV:'production'});
  assert.equal(missing.ok, false);
  assert.deepEqual(missing.blockers, c.PUBLIC_KEYS);
  const valid = c.inspectProductionEnvironment({NODE_ENV:'production', EXPO_PUBLIC_API_URL:'https://api.example.com', EXPO_PUBLIC_PRIVACY_POLICY_URL:'https://example.com/privacy', EXPO_PUBLIC_TERMS_URL:'https://example.com/terms', XAI_API_KEY:'secret-value'});
  assert.equal(valid.ok, true);
  assert.doesNotMatch(c.renderSafeSummary(valid), /secret-value|api\.example\.com|privacy|terms/);
});

test('current launch preflight delegates to the shared environment contract', () => {
  const s = read('scripts/launch-preflight.mjs');
  assert.match(s, /production-env-contract/);
  assert.match(s, /inspectProductionEnvironment/);
  assert.doesNotMatch(s, /console\.log\([^\n]*(EXPO_PUBLIC_API_URL|EXPO_PUBLIC_PRIVACY_POLICY_URL|EXPO_PUBLIC_TERMS_URL)/);
});

test('current version/build identity is aligned', () => {
  const pkg=JSON.parse(read('package.json')); const server=JSON.parse(read('server/package.json')); const app=JSON.parse(read('app.json')); const lock=JSON.parse(read('package-lock.json'));
  assert.equal(pkg.version,CUR); assert.equal(server.version,pkg.version); assert.equal(lock.packages[''].version,pkg.version);
  assert.equal(app.expo.version,pkg.version); assert.equal(app.expo.extra.nexaVersion,pkg.version); assert.equal(app.expo.android.version,pkg.version); assert.equal(app.expo.android.versionCode,CODE); assert.equal(app.expo.ios.version,pkg.version); assert.equal(app.expo.ios.version,pkg.version); assert.equal(app.expo.ios.buildNumber,String(CODE));
});
