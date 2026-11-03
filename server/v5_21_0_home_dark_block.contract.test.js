const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

// B57 Checkpoint 14 — HOME block, Royal Dark scene (Home is first in the sidebar; its Earth Light scene was CP2).

test('B57 CP14 Home is first in the sidebar directory', () => {
  const ids = [...read('src/homeDesign.ts').matchAll(/\['([a-z]+)','[^']+','[a-z-]+-outline'/g)].map(m => m[1]);
  assert.equal(ids[0], 'home');
});

test('B57 CP14 Royal Dark Home layer is mounted only in Royal Dark and only for the home world', () => {
  const wb = read('src/NexaWorldBackground.tsx');
  assert.match(wb, /import \{ NexaDarkHome \} from '\.\/NexaDarkHome'/);
  assert.match(wb, /\{!light && world === 'home' \? <NexaDarkHome \/> : null\}/);
  assert.equal((wb.match(/<NexaDarkHome/g) || []).length, 1);
  // Home now uses the cinematic image base; the animated Home layer still sits before depth.
  assert.ok(wb.indexOf('HOME_CINEMATIC_BACKGROUND') < wb.indexOf('<NexaDarkHome'));
  assert.ok(wb.indexOf('<NexaDarkHome') < wb.indexOf('<NexaDepthLayer'));
});

test('B57 CP14 the Home dark layer does not leak into other worlds and other dark layers do not mount for home', () => {
  const wb = read('src/NexaWorldBackground.tsx');
  for (const w of ['dami', 'zeeza', 'sky-money', 'dream-marketplace', 'yaayz', 'leisure', 'ball-house', 'kitchen', 'game-house', 'fitness'])
    assert.doesNotMatch(wb, new RegExp(`world === '${w}' \\? <NexaDarkHome`));
  for (const c of ['NexaDarkMoney', 'NexaDarkMarket', 'NexaDarkYaayz', 'NexaDarkLeisure', 'NexaDarkBall', 'NexaDarkKitchen', 'NexaDarkGame', 'NexaDarkFitness'])
    assert.doesNotMatch(wb, new RegExp(`world === 'home' \\? <${c}`));
});

test('B57 CP14 Home dark layer is decorative, native, and never receives touches', () => {
  const src = read('src/NexaDarkHome.tsx');
  assert.match(src, /pointerEvents="none"/);
  assert.match(src, /accessible=\{false\}/);
  assert.doesNotMatch(src, /Touchable|Pressable|onPress|Image\b|require\(/);
  assert.ok((src.match(/useNativeDriver: true/g) || []).length >= 3);
  assert.doesNotMatch(src, /useNativeDriver: false/);
});

test('B57 CP14 Home dark layer follows the subscription motion rules and stops its loops', () => {
  const src = read('src/NexaDarkHome.tsx');
  assert.match(src, /allows\('world-ambient'\)/);
  assert.match(src, /allows\('vip-spotlight'\)/);
  assert.match(src, /if \(!animated\) \{[^}]*stopAnimation[^}]*setValue\(0\)/);
  assert.match(src, /return \(\) => loops\.forEach\(l => l\.stop\(\)\)/);
  assert.match(src, /\[animated, streak, node, beacon\]/);
});

test('B57 CP14 every interpolation ramp in the Home dark layer is strictly ascending', () => {
  // streak k (start 0.02 or 0.5): [0, s, s+0.03, s+0.18, 1] and [0, s, s+0.18, 1]
  for (const s of [0.02, 0.5]) {
    for (const r of [[0, s, s + 0.03, s + 0.18, 1], [0, s, s + 0.18, 1]])
      for (let i = 1; i < r.length; i++) assert.ok(r[i] > r[i - 1], `streak ramp ${r}`);
  }
  // nodes i = 0..4: [0, .02+i*.18, .11+i*.18, .2+i*.18, 1]
  const src = read('src/NexaDarkHome.tsx');
  assert.match(src, /inputRange: \[0, 0\.02 \+ i \* 0\.18, 0\.11 \+ i \* 0\.18, 0\.2 \+ i \* 0\.18, 1\]/);
  for (let i = 0; i < 5; i++) {
    const r = [0, 0.02 + i * 0.18, 0.11 + i * 0.18, 0.2 + i * 0.18, 1];
    for (let k = 1; k < r.length; k++) assert.ok(r[k] > r[k - 1], `node ${i} ramp ${r}`);
  }
});

test('B57 CP14 Royal Dark Home stays unchanged underneath: cosmos still drawn for home, Earth Light Home layers untouched', () => {
  const wb = read('src/NexaWorldBackground.tsx');
  assert.match(wb, /!light && world === 'home' \? <Image source=\{HOME_CINEMATIC_BACKGROUND\}/);
  assert.match(wb, /!light && cosmos && world === 'dami' \? <NexaCosmos variant="dami"/);
  const earth = read('src/NexaEarth.tsx');
  for (const tag of ['EarthHomeSky', 'EarthHomeShore', 'EarthHomeWater']) assert.match(earth, new RegExp(`variant === 'home' \\? <${tag} `));
  assert.equal(read('src/NexaEarthHome.tsx').includes('NexaDarkHome'), false);
});

test('B57 CP14 Home screen: the 3 remaining inline style objects are layout/animation only (nothing for ds() to scale)', () => {
  const src = read('src/HomeCommandCenter.tsx');
  const inline = [...src.matchAll(/(?<![A-Za-z])style=\{\{([^}]*)\}/g)].map(m => m[1]);
  assert.equal(inline.length, 3);
  for (const body of inline) assert.doesNotMatch(body, /borderRadius|fontWeight|letterSpacing|shadow|elevation|borderWidth|Color|color|padding/);
});
