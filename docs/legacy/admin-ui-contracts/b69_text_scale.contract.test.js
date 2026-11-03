const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('B69 exposes a bounded in-app text-size preference with readable defaults', () => {
  const src = read('src/nexaTextScale.ts');
  assert.match(src, /export type NexaTextScale = 1 \| 1\.15 \| 1\.3 \| 1\.45/);
  assert.match(src, /100% Default/);
  assert.match(src, /Maximum readable/);
  assert.match(src, /activeTextScale: NexaTextScale = 1/);
});

test('B69 scales shared style font size, line height and letter spacing', () => {
  const theme = read('src/theme.ts');
  const scale = read('src/nexaTextScale.ts');
  assert.match(theme, /scaleTextStyle\(designStyle\(currentThemeMode\(\), style\)\)/);
  assert.match(theme, /return new Proxy\(styles as any/);
  assert.match(scale, /key === 'fontSize'/);
  assert.match(scale, /key === 'fontSize' \|\| key === 'lineHeight' \|\| key === 'letterSpacing'/);
});

test('B69 exposes the control from the existing Home directory without changing navigation', () => {
  const home = read('src/HomeCommandCenter.tsx');
  assert.match(home, /NexaTextSizeControl/);
  assert.match(home, /NexaTextSizeControl/);
  assert.match(home, /Close Menu/);
});

test('B69 preserves device accessibility scaling and touch-target minimums', () => {
  const accessibility = read('src/accessibility.ts');
  const html = read('src/app/+html.tsx');
  assert.match(accessibility, /minTouchTarget: 44/);
  assert.match(html, /-webkit-text-size-adjust:100%/);
  assert.doesNotMatch(html, /user-scalable=no|max(?:imum)?-scale=1/);
});

test('B69 loads and persists the preference without introducing a new dependency', () => {
  const control = read('src/NexaTextSizeControl.tsx');
  const pkg = JSON.parse(read('package.json'));
  assert.match(control, /expo-secure-store/);
  assert.match(control, /localStorage/);
  assert.equal(pkg.dependencies['expo-secure-store'], '~15.0.8');
});


test('B363 makes the enlarged typography the shared 100% default across both interfaces', () => {
  const theme = read('src/theme.ts');
  const scale = read('src/nexaTextScale.ts');
  const admin = read('admin-web/style.css');
  assert.match(theme, /key === 'fontSize' \|\| key === 'lineHeight' \|\| key === 'letterSpacing'/);
  assert.match(scale, /1: '100% Default'/);
  assert.match(admin, /html,body\{[^}]*font:18px\/1\.5/);
  assert.match(admin, /header\.top h1\{font-size:20px/);
  assert.match(admin, /h2\{font-size:22px/);
  assert.match(admin, /\.small\{font-size:15px/);
});
