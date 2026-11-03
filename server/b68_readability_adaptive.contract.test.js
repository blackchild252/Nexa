const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const userSurfaceFiles = [
  'src/HomeCommandCenter.tsx',
  'src/YaayzHomeFeed.tsx',
  'src/NexaAI.tsx',
  'src/ZeezaChase.tsx',
  'src/socialStyles.ts',
  'src/NotificationCenter.tsx',
  'src/ThemePicker.tsx',
  'src/MarketInsights.tsx',
  'src/UnifiedSearch.tsx',
];

test('B68 shared user-facing surfaces have no explicit sub-12px text tokens', () => {
  for (const rel of userSurfaceFiles) {
    const source = read(rel);
    const tiny = [...source.matchAll(/fontSize:\s*(8|9|10|11)(?=[,}])/g)];
    assert.equal(tiny.length, 0, `${rel} still contains ${tiny.length} explicit sub-12px text token(s)`);
  }
});

test('B68 preserves the readable NEXA typography floor and roles', () => {
  const typography = read('src/nexaTypography.ts');
  assert.match(typography, /body:\s*\{[^}]*fontSize:\s*20/);
  assert.match(typography, /label:\s*\{[^}]*fontSize:\s*18/);
  assert.match(typography, /caption:\s*\{[^}]*fontSize:\s*17/);
  assert.match(typography, /micro:\s*\{[^}]*fontSize:\s*16/);
});

test('B68 keeps the web viewport adaptive without disabling zoom', () => {
  const html = read('src/app/+html.tsx');
  assert.match(html, /width=device-width/);
  assert.match(html, /initial-scale=1/);
  assert.doesNotMatch(html, /user-scalable\s*=\s*["']?no/i);
  assert.doesNotMatch(html, /maximum-scale\s*=\s*1/i);
});

test('B68 retains live window-dimension responsive helpers', () => {
  const typography = read('src/nexaTypography.ts');
  assert.match(typography, /useWindowDimensions/);
  assert.match(typography, /responsiveGutter/);
  assert.match(typography, /contentMaxWidth:\s*Math\.min\(width,\s*720\)/);
});

test('B68 keeps touch targets at or above the accessibility minimum', () => {
  const accessibility = read('src/accessibility.ts');
  assert.match(accessibility, /minTouchTarget:\s*44/);
  assert.match(accessibility, /minimumTouchTarget:\s*44/);
});

test('B68 preserves Home and Yaayz monetisation boundaries', () => {
  const yaayz = read('src/YaayzHomeFeed.tsx');
  const home = read('src/HomeCommandCenter.tsx');
  assert.match(yaayz, /YaayzNativeAd/);
  assert.doesNotMatch(home, /YaayzNativeAd/);
});

test('B68 keeps Inter as the shared app font source', () => {
  const styles = read('src/styles.ts');
  const layout = read('src/app/_layout.tsx');
  assert.match(styles, /NEXA_FONTS\.bold/);
  assert.match(layout, /NexaInter-Regular/);
  assert.match(layout, /NexaInter-Bold/);
});

test('B68 keeps the five primary bottom navigation labels readable', () => {
  const index = read('src/nexaNavKeys.ts');
  for (const label of ['Home', 'Sky Money', 'Zeeza', 'Dream Marketplace', 'Inbox']) assert.match(index, new RegExp(label));
  assert.doesNotMatch(index, /fontSize:\s*(8|9|10|11)(?=[,}])/);
});
