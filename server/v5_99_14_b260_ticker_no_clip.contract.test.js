const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'HomeCommandCenter.tsx'), 'utf8');

test('B260-TICK0 the crawling ticker track is far wider than the viewport so text cannot wrap', () => {
  const m = /const TICKER_TRACK_WIDTH = (\d+);/.exec(src);
  assert.ok(m, 'TICKER_TRACK_WIDTH must exist');
  assert.ok(Number(m[1]) >= 4000, 'track must be at least 4000px wide');
  assert.match(src, /<Animated\.View style=\{\{width:TICKER_TRACK_WIDTH,flexDirection:'row'/);
});

test('B260-TICK1 every NEXA Updates line is a single line', () => {
  const texts = src.match(/<Text style=\{styles\.updateText\}[^>]*>/g) || [];
  assert.ok(texts.length >= 3, 'updates rail must render its lines');
  for (const t of texts) assert.match(t, /numberOfLines=\{1\}/);
});

test('B260-TICK2 the measured copy still reports its natural width and the speed is unchanged', () => {
  assert.match(src, /onLayout=\{e=>setContentW\(Math\.round\(e\.nativeEvent\.layout\.width\)\)\}/);
  assert.match(src, /const TICKER_SPEED = 38;/);
});
