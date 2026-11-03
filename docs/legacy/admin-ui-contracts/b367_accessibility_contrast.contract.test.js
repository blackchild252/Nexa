const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

function luminance(hex) {
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const linear = rgb.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}
function contrast(a, b) {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

test('B367: canonical dark and Earth Light body-text tokens meet WCAG AA', () => {
  const pairs = [
    ['#F8F5E9', '#000000'],
    ['#A9A9A9', '#000000'],
    ['#2A2118', '#F2F9FF'],
    ['#4A3B2C', '#FFFFFF'],
    ['#6B6254', '#FFFFFF'],
    ['#1767A9', '#FFFFFF'],
    ['#2A7147', '#FFFFFF'],
  ];
  for (const [fg, bg] of pairs) assert.ok(contrast(fg, bg) >= 4.5, `${fg} on ${bg} is ${contrast(fg, bg).toFixed(2)}:1`);
});

test('B367: Earth Light theme maps common legacy text literals to AA-safe equivalents', () => {
  const theme = read('src/theme.ts');
  for (const literal of ['#a9a9a9', '#756e61', '#9b907a', '#ef8d8d', '#ef9b9b', '#9bd8ff', '#ffd27a', '#6f7785']) {
    assert.match(theme, new RegExp(`['"]${literal.replace('#', '\\#')}['"]\\s*:`));
  }
  assert.match(theme, /'#a9a9a9': '#6B6254'/);
  assert.match(theme, /'#ef9b9b': '#B3382C'/);
  assert.match(theme, /'#9bd8ff': '#1565A8'/);
});

test('B367: Admin keyboard entry surfaces keep the shared 44px interaction floor', () => {
  const css = read('admin-web/style.css');
  assert.match(css, /\.skip:focus\{[^}]*min-height:44px[^}]*display:inline-flex/s);
  assert.match(css, /\.page-search\{min-height:44px/);
  assert.match(css, /input,select,textarea\{[^}]*min-height:44px/s);
  assert.match(css, /button\{[^}]*min-height:44px/s);
  assert.match(css, /nav\.tabs a\{[^}]*min-height:44px/s);
});
