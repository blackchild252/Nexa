const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

// B57 Checkpoint 2 — HOME block (Earth Light scene layers, orbs, rails, Dami robot palette).

function palettes() {
  const src = read('src/NexaDamiRobot.tsx');
  const grab = name => {
    const m = src.match(new RegExp(`const ${name}[^=]*= (\\{[\\s\\S]*?\\n\\});`));
    assert.ok(m, `${name} not found`);
    return new Function(`return (${m[1].replace(/ as \[string, string, string\]/g, '')})`)();
  };
  return { dark: grab('DARK_PAL'), light: grab('LIGHT_PAL') };
}
const lum = h => { const n = parseInt(h.slice(1), 16); const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(n >> 16 & 255) + 0.7152 * f(n >> 8 & 255) + 0.0722 * f(n & 255); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test('B57 CP2 Royal Dark Dami robot palette is exactly the original gold robot', () => {
  const { dark } = palettes();
  assert.equal(dark.gold, '#FFD700'); assert.equal(dark.goldDeep, '#B8860B'); assert.equal(dark.eye, '#3aa0ff'); assert.equal(dark.hi, '#fff0a3');
  assert.equal(dark.halo, 'rgba(255,190,40,0.14)'); assert.equal(dark.ring1, 'rgba(255,215,0,0.9)'); assert.equal(dark.ring2, 'rgba(255,170,40,0.85)'); assert.equal(dark.ring3, 'rgba(255,225,140,0.7)');
  assert.deepEqual(dark.face, ['#151538', '#05050f', '#000']); assert.equal(dark.crown, '#FFD700'); assert.equal(dark.wave, '#FFD700');
});

test('B57 CP2 Earth Light Dami has its own palette with the same keys (water, forest, gold)', () => {
  const { dark, light } = palettes();
  assert.deepEqual(Object.keys(light).sort(), Object.keys(dark).sort());
  assert.notEqual(light.face[1], dark.face[1]);
  assert.equal(light.crown, '#2F7D4F');           // forest-leaf crown
  assert.equal(light.ring1, 'rgba(30,111,176,0.85)'); // water-blue ring
  assert.ok(ratio(light.eye, '#BFE0F7') >= 4.5, 'eyes must read on the pale face');
  assert.ok(ratio(light.wave, '#F2F9FF') >= 3, 'waveform must read on the sky');
});

test('B57 CP2 robot module no longer references a removed module-level constant', () => {
  const src = read('src/NexaDamiRobot.tsx');
  assert.match(src, /useThemeMode\(\)/);
  assert.doesNotMatch(src, /^const (GOLD|BLUE|GOLD_DEEP) = /m);
  assert.match(src, /backgroundColor: DARK_PAL\.gold/);
});

test('B57 CP2 orbs: Royal Dark tones unchanged, Earth Light tones cover every tone', () => {
  const src = read('src/NexaGlossyOrb.tsx');
  for (const line of [
    "red: { body: ['#ff6b6b', '#d81f2a', '#5a0710']", "blue: { body: ['#5aa8ff', '#1554e6', '#071a66']",
    "gold: { body: ['#fff0a3', '#FFD700', '#8a6a10']", "glass: { body: ['#2b2b3a', '#0d0d16', '#000000']",
  ]) assert.ok(src.includes(line), line);
  const light = src.slice(src.indexOf('const LIGHT_TONES'), src.indexOf('export function NexaGlossyOrb'));
  for (const tone of ['red', 'blue', 'gold', 'glass']) assert.match(light, new RegExp(`${tone}: \\{ body:`));
  assert.match(light, /#2F7D4F/); assert.match(light, /#1E78C2/); // forest, water
  assert.match(src, /mode === 'light' \? LIGHT_TONES : TONES/);
});

test('B57 CP2 NexaBevel keeps its Royal Dark look and gets a white-glass Earth Light look', () => {
  const src = read('src/NexaGlossyOrb.tsx');
  assert.ok(src.includes("'rgba(14,10,22,0.78)'")); assert.ok(src.includes("'rgba(255,215,0,0.4)'"));
  assert.ok(src.includes("'rgba(255,255,255,0.82)'")); assert.ok(src.includes("'rgba(201,162,39,0.55)'"));
});

test('B57 CP2 Home scene layers: decorative, motion-gated, Home-only', () => {
  const home = read('src/NexaEarthHome.tsx');
  for (const fn of ['EarthHomeSky', 'EarthHomeShore', 'EarthHomeWater']) assert.match(home, new RegExp(`export function ${fn}\\(`));
  assert.equal((home.match(/pointerEvents="none"/g) || []).length, 3);
  assert.ok((home.match(/allows\('world-ambient'\)/g) || []).length >= 3, 'every layer honours the subscription/reduced-motion gate');
  assert.doesNotMatch(home, /transformOrigin/);   // not needed, keeps older RN safe
  assert.doesNotMatch(home, /localStorage|sessionStorage|fetch\(/);
  const earth = read('src/NexaEarth.tsx');
  for (const tag of ['EarthHomeSky', 'EarthHomeShore', 'EarthHomeWater']) assert.match(earth, new RegExp(`variant === 'home' \\? <${tag} `));
});

test('B57 CP2 Home skyline has the NEXA tower with a gold beacon, and gold-lit windows', () => {
  const home = read('src/NexaEarthHome.tsx');
  assert.match(home, /index 3 is the NEXA tower/); assert.match(home, /beacon/); assert.match(home, /rgba\(255,215,120,0\.95\)/);
});

test('B57 CP2 Home screen still uses the shared world background and Home world id', () => {
  const bg = read('src/NexaWorldBackground.tsx');
  assert.match(bg, /world === 'home' \? 'home'/);
});
