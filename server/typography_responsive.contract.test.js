const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

test('B67 typography bundles modern sans-serif weights', () => {
  for (const name of ['NexaInter-Regular.otf','NexaInter-Medium.otf','NexaInter-SemiBold.otf','NexaInter-Bold.otf','NexaInter-ExtraBold.otf','NexaInter-Black.otf']) {
    assert.ok(fs.existsSync(path.join(root, 'assets', 'fonts', name)), `missing ${name}`);
  }
  const fonts = read('src/nexaFonts.ts');
  assert.match(fonts, /NexaInter-Regular/);
  assert.match(fonts, /NexaInter-Black/);
});

test('B67 readable typography baseline is not micro-sized', () => {
  const theme = read('src/theme.ts');
  assert.match(theme, /body: \{[^}]*fontSize: 18/);
  assert.match(theme, /caption: \{[^}]*fontSize: 15/);
  assert.match(theme, /label: \{[^}]*fontSize: 16/);
});

test('B67 responsive helpers use live window dimensions', () => {
  const typography = read('src/nexaTypography.ts');
  assert.match(typography, /useWindowDimensions/);
  assert.match(typography, /responsiveGutter/);
  assert.match(typography, /contentMaxWidth/);
});

test('B67 web viewport is device-width and does not disable accessibility zoom', () => {
  const html = read('src/app/+html.tsx');
  assert.match(html, /width=device-width/);
  assert.match(html, /initial-scale=1/);
  assert.doesNotMatch(html, /user-scalable=no/);
  assert.doesNotMatch(html, /maximum-scale=1/);
});

test('B67 root layout loads bundled fonts before rendering', () => {
  const layout = read('src/app/_layout.tsx');
  assert.match(layout, /useFonts/);
  assert.match(layout, /NexaInter-Regular\.otf/);
  assert.match(layout, /NexaInter-Black\.otf/);
});

test('B67 shared styles use Inter typography roles', () => {
  const styles = read('src/styles.ts');
  assert.match(styles, /NEXA_FONTS\.bold/);
  assert.match(styles, /fontSize:30/);
  assert.match(styles, /fontSize:16/);
});

test('B67 preserves accessibility font scaling', () => {
  const typography = read('src/nexaTypography.ts');
  assert.match(typography, /fontScale/);
  const html = read('src/app/+html.tsx');
  assert.match(html, /-webkit-text-size-adjust:100%/);
});

test('B67 avoids global fixed-width screen contracts', () => {
  const html = read('src/app/+html.tsx');
  assert.doesNotMatch(html, /min-width:\s*\d+px/);
  assert.doesNotMatch(html, /width:\s*\d+px/);
});
