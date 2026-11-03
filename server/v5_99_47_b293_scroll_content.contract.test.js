const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const dir = path.join(__dirname, '..', 'src');
const read = (rel) => fs.readFileSync(path.join(dir, rel), 'utf8');

test('B293 scrollWrap grows with content and never pins itself to the screen height', () => {
  const s = read('styles.ts');
  const wrap = s.match(/scrollWrap:\{([^}]*)\}/);
  assert.ok(wrap, 'scrollWrap exists');
  assert.match(wrap[1], /flexGrow:1/);
  assert.ok(!/(^|,)flex:1/.test(wrap[1]), 'scrollWrap must not use flex:1');
});

test('B293 no ScrollView content container uses the flex:1 wrap style (it blocks vertical scrolling)', () => {
  const bad = [];
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) return walk(p);
    if (!/\.tsx$/.test(e.name)) return;
    const t = fs.readFileSync(p, 'utf8');
    if (/contentContainerStyle=\{\[?s\.wrap[\],}]/.test(t)) bad.push(path.relative(dir, p));
  });
  walk(dir);
  assert.deepEqual(bad, []);
});

test('B293 Sky Money screens that scroll use scrollWrap', () => {
  assert.equal((read('MoneyDashboard.tsx').match(/contentContainerStyle=\{s\.scrollWrap\}/g) || []).length, 2);
  assert.match(read('StoreAjo.tsx'), /<ScrollView contentContainerStyle=\{s\.scrollWrap\}/);
  assert.ok((read('GroupsTab.tsx').match(/contentContainerStyle=\{s\.scrollWrap\}/g) || []).length >= 3);
});
