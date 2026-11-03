const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const lum = hex => {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrastOnWhite = hex => 1.05 / (lum(hex) + 0.05);
const FILES = ['src/MarketplaceScreen.tsx', 'src/MarketplaceStorefront.tsx'];

test('B257-BADGE0 sale badge background passes 4.5:1 against its white text', () => {
  for (const f of FILES) {
    const m = /const SALE_BADGE_BG = '(#[0-9A-Fa-f]{6})'/.exec(read(f));
    assert.ok(m, `${f} must define SALE_BADGE_BG`);
    assert.ok(contrastOnWhite(m[1]) >= 4.5, `${f} badge contrast ${contrastOnWhite(m[1]).toFixed(2)} is below 4.5`);
  }
});

test('B257-BADGE1 no white-text discount badge uses theme.colors.error as its background', () => {
  for (const f of FILES) {
    const lines = read(f).split('\n').filter(l => /color:'#fff'/.test(l) && /\$\{?pct|-\{pct\}%/.test(l));
    assert.ok(lines.length > 0, `${f} must still contain a discount badge`);
    for (const l of lines) assert.ok(!/backgroundColor:theme\.colors\.error/.test(l), `${f} discount badge must not use theme.colors.error`);
  }
});

test('B257-BADGE2 Royal Dark error token is unchanged (palette protected)', () => {
  assert.match(read('src/theme.ts'), /error:\s*'#E74C3C'/);
});
