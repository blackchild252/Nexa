const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const navigation = fs.readFileSync(path.join(__dirname, '../src/nexaNavigation.ts'), 'utf8');
const home = fs.readFileSync(path.join(__dirname, '../src/app/(tabs)/index.tsx'), 'utf8');
const search = fs.readFileSync(path.join(__dirname, '../src/UnifiedSearch.tsx'), 'utf8');
const dami = fs.readFileSync(path.join(__dirname, '../src/app/dami.tsx'), 'utf8');

// B28 is intentionally contract-level here: the pure TS navigation resolver is
// shared by the active surfaces without importing React Native into node tests.
test('136 canonical navigation resolver covers current NEXA destinations', () => {
  for (const path of ['/dami','/(tabs)/zeeza','/(tabs)/money','/(tabs)/marketplace','/(tabs)/yaayz','/(tabs)/leisure','/leisure/kitchen','/extensions','/developer']) {
    assert.match(navigation, new RegExp(path.replace(/[()]/g,'\\$&').replaceAll('/','\\/')));
  }
});

test('137 notification taps resolve through the server action authority before navigation', () => {
  assert.match(home, /\/api\/notifications\/\$\{encodeURIComponent\(notificationId\)\}\/action/);
  assert.match(home, /navigationForNotification/);
});

test('138 unified search results are actionable through the canonical resolver', () => {
  assert.match(search, /navigationForSearchResult/);
  assert.match(search, /TAP TO OPEN/);
});

test('139 Dami navigation delegates to the canonical resolver', () => {
  assert.match(dami, /navigationForDamiDestination/);
  assert.match(dami, /nav==='home'.*router\.replace/s);
  assert.doesNotMatch(dami, /nav==='money'\|\|nav\.startsWith/);
});

test('140 notification and search navigation remain destination-only', () => {
  assert.match(navigation, /does not authorize[\s\S]*mutate/);
  assert.match(navigation, /case 'marketplace'/);
  assert.match(navigation, /case 'money'/);
  assert.match(navigation, /case 'people'/);
});


test('141 active Leisure route resolves the existing screen without a stale relative import', () => {
  // B57 CP18: the duplicate top-level src/app/leisure.tsx was removed with the owner's OK; /leisure is served by the tab route.
  assert.equal(fs.existsSync(path.join(__dirname, '../src/app/leisure.tsx')), false);
  const leisure = fs.readFileSync(path.join(__dirname, '../src/app/(tabs)/leisure.tsx'), 'utf8');
  assert.match(leisure, /from ['\"]\.\.\/\.\.\/LeisureArenaScreen['\"]/);
  assert.doesNotMatch(leisure, /from ['\"]\.\.\/\.\.\/\.\.\/LeisureArenaScreen['\"]/);
});
