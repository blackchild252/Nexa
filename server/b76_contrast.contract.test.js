const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadContrast() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'nexaContrast.ts'), 'utf8')
    .replace(/^export function /gm, 'function ');
  const ctx = { module: { exports: {} }, exports: {} };
  vm.runInNewContext(`${source}\nmodule.exports={relativeLuminance,contrastRatio,minimumContrast,meetsContrast};`, ctx);
  return ctx.module.exports;
}

test('B76: shared contrast utility exposes WCAG body, large-text and UI thresholds', () => {
  const c = loadContrast();
  assert.equal(c.minimumContrast('body'), 4.5);
  assert.equal(c.minimumContrast('large'), 3);
  assert.equal(c.minimumContrast('ui'), 3);
});

test('B76: Royal Dark core text/status pairs meet AA', () => {
  const c = loadContrast();
  for (const [fg,bg] of [['#F8F5E9','#000000'],['#A9A9A9','#000000'],['#D4AF37','#000000'],['#2ECC71','#000000'],['#E74C3C','#000000']]) {
    assert.ok(c.meetsContrast(fg,bg,'body'), `${fg} on ${bg} should meet AA`);
  }
});

test('B76: Earth Light core text/status pairs meet AA', () => {
  const c = loadContrast();
  for (const [fg,bg] of [['#2A2118','#F2F9FF'],['#6B6254','#F2F9FF'],['#1767A9','#F2F9FF'],['#1D7343','#FFFFFF'],['#1565A8','#FFFFFF'],['#8A5A1C','#FFFFFF'],['#B83629','#FFFFFF']]) {
    assert.ok(c.meetsContrast(fg,bg,'body'), `${fg} on ${bg} should meet AA`);
  }
});

test('B76: theme preserves the explicit accessibility contrast contract', () => {
  const theme = fs.readFileSync(path.join(__dirname, '..', 'src', 'theme.ts'), 'utf8');
  assert.match(theme, /contrast:\s*\{ body: 4\.5, large: 3, ui: 3 \}/);
  assert.match(theme, /success:\s*'#1D7343'/);
  assert.match(theme, /info:\s*'#1565A8'/);
  assert.match(theme, /warning:\s*'#8A5A1C'/);
});

test('B76: focus colors remain high-contrast in both interfaces', () => {
  const c = loadContrast();
  assert.ok(c.meetsContrast('#FFD700','#000000','ui'));
  assert.ok(c.meetsContrast('#1767A9','#F2F9FF','ui'));
});
