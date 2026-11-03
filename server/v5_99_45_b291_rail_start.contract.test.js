const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const src = (rel) => fs.readFileSync(path.join(__dirname, '..', 'src', rel), 'utf8');

test('B291 moving rail starts at the right edge and ends past the left edge', () => {
  const s = src('HomeCommandCenter.tsx');
  assert.match(s, /const x = useMemo\(\(\)=>new Animated\.Value\(viewportW\),\[viewportW,contentW\]\);/);
  assert.match(s, /x\.setValue\(viewportW\);/);
  assert.match(s, /toValue:-contentW/);
  assert.match(s, /Animated\.loop\(Animated\.timing\(x,/);
  assert.match(s, /opacity:moving\?1:0/);
});

test('B291 still rail (reduced motion) also starts at the right edge', () => {
  const s = src('HomeCommandCenter.tsx');
  assert.match(s, /paddingLeft:viewportW\}\}>\{children\}<\/ScrollView>/);
});

test('B291 all three Home rails use the one Rail component', () => {
  const s = src('HomeCommandCenter.tsx');
  for (const t of ['MARKET WATCH', 'NEXA UPDATES', 'SEARCH NEXA']) {
    assert.ok(new RegExp(`<Rail title="${t}"`).test(s), `${t} uses Rail`);
  }
  assert.equal((s.match(/function Rail\(/g) || []).length, 1);
});

test('B291 no other file crawls text on its own ticker', () => {
  const dir = path.join(__dirname, '..', 'src');
  const hits = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') && f !== 'HomeCommandCenter.tsx')
    .filter(f => /TICKER_SPEED|tickerTrack/.test(fs.readFileSync(path.join(dir, f), 'utf8')));
  assert.deepEqual(hits, []);
});
