// V5.54.1 cross-check fixes: lazy OpenAI client, web ad stand-in, Gemini image DI, Node pin notes.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('server startup needs no AI client and does not crash without XAI_API_KEY', () => {
  const s = read('server/index.js');
  assert.doesNotMatch(s, /require\("openai"\)/);
  assert.match(s, /grokProvider\.isConfigured/);
  assert.match(read('server/grokProvider.js'), /XAI_TIMEOUT_MS \|\| 30000/);
});

test('web build has an ads stand-in and never bundles the native ads module', () => {
  const web = read('src/YaayzNativeAd.web.tsx');
  assert.match(web, /export function YaayzNativeAd/);
  assert.doesNotMatch(web, /(from|require\()\s*['"]react-native-google-mobile-ads['"]/);
  assert.match(read('src/YaayzNativeAd.tsx'), /from 'react-native-google-mobile-ads'/); // native behaviour unchanged
});

test('Gemini image analysis accepts an injected client loader like the other Gemini entry points', async () => {
  const { analyzeImage } = require('./geminiProvider');
  let key = null;
  const loadClient = async (k) => { key = k; return { models: { generateContent: async () => ({ text: 'ok' }) } }; };
  const r = await analyzeImage({ imageBase64: 'aGVsbG8=', mimeType: 'image/jpeg', prompt: 'p', env: { GEMINI_ENABLED: 'true', GEMINI_API_KEY: 'k1' }, dependencies: { loadClient } });
  assert.equal(key, 'k1');
  assert.equal(r.text, 'ok');
  assert.match(read('server/aiProviderGateway.js'), /env,\n\s+dependencies,\n\s+\}\);\n\s+\}\n\s+if \(dependencies\.grokVisionAdapter\)/);
});

test('dev Node pin covers node:sqlite used by the test suite', () => {
  const major = Number(read('.nvmrc').trim().split('.')[0]);
  assert.ok(major >= 22, '.nvmrc must be Node 22+ for node:sqlite based tests');
});

test('native ad unit is split by platform: Android production unit, iOS Google test unit', () => {
  const ad = read('src/YaayzNativeAd.tsx');
  assert.match(ad, /ANDROID_NATIVE_AD_UNIT_ID = 'ca-app-pub-9908588255141470\/7710261131'/);
  assert.match(ad, /IOS_NATIVE_AD_UNIT_ID = 'ca-app-pub-9908588255141470\/6735627793'/);
  assert.match(ad, /Platform\.OS === 'ios' \? IOS_NATIVE_AD_UNIT_ID : ANDROID_NATIVE_AD_UNIT_ID/);
  assert.match(ad, /adUnitId: NATIVE_AD_UNIT_ID/);
  assert.doesNotMatch(ad, /adUnitId: 'ca-app-pub-/);
  const iosAppId = JSON.parse(read('app.json')).expo.plugins.find((x) => Array.isArray(x) && x[0] === 'react-native-google-mobile-ads')[1].iosAppId;
  assert.equal(iosAppId, 'ca-app-pub-9908588255141470~7557929889'); // real iOS AdMob app ID
});

