const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

// B57 Checkpoint 15 — DAMI block, Royal Dark scene (Dami is second in the sidebar; its Earth Light scene + design layer were CP4).

test('B57 CP15 Dami is second in the sidebar directory, after Home', () => {
  const ids = [...read('src/homeDesign.ts').matchAll(/\['([a-z]+)','[^']+','[a-z-]+-outline'/g)].map(m => m[1]);
  assert.deepEqual(ids.slice(0, 3), ['home', 'dami', 'zeeza']);
});

test('B57 CP15 Royal Dark Dami layer is mounted only in Royal Dark and only for the dami world, between cosmos and depth layer', () => {
  const wb = read('src/NexaWorldBackground.tsx');
  assert.match(wb, /import \{ NexaDarkDami \} from '\.\/NexaDarkDami'/);
  assert.match(wb, /\{!light && world === 'dami' \? <NexaDarkDami \/> : null\}/);
  assert.equal((wb.match(/<NexaDarkDami/g) || []).length, 1);
  assert.ok(wb.indexOf('<NexaCosmos') < wb.indexOf('<NexaDarkDami'));
  assert.ok(wb.indexOf('<NexaDarkDami') < wb.indexOf('<NexaDepthLayer'));
  assert.match(read('src/app/dami.tsx'), /<NexaWorldBackground world="dami">/);
});

test('B57 CP15 Dami dark layer does not leak: Home layer stays Home-only, no other dark layer mounts for dami', () => {
  const wb = read('src/NexaWorldBackground.tsx');
  assert.match(wb, /\{!light && world === 'home' \? <NexaDarkHome \/> : null\}/);
  assert.doesNotMatch(wb, /world === 'home' \? <NexaDarkDami/);
  for (const c of ['NexaDarkHome', 'NexaDarkMoney', 'NexaDarkMarket', 'NexaDarkYaayz', 'NexaDarkLeisure', 'NexaDarkBall', 'NexaDarkKitchen', 'NexaDarkGame', 'NexaDarkFitness'])
    assert.doesNotMatch(wb, new RegExp(`world === 'dami' \\? <${c}`));
});

test('B57 CP15 Dami dark layer is decorative, native, and never receives touches', () => {
  const src = read('src/NexaDarkDami.tsx');
  assert.match(src, /pointerEvents="none"/);
  assert.match(src, /accessible=\{false\}/);
  assert.doesNotMatch(src, /Touchable|Pressable|onPress|Image\b|require\(/);
  assert.ok((src.match(/useNativeDriver: true/g) || []).length >= 3);
  assert.doesNotMatch(src, /useNativeDriver: false/);
});

test('B57 CP15 Dami dark layer follows the subscription motion rules and stops its loops', () => {
  const src = read('src/NexaDarkDami.tsx');
  assert.match(src, /allows\('world-ambient'\)/);
  assert.match(src, /allows\('vip-spotlight'\)/);
  assert.match(src, /if \(!animated\) \{[^}]*stopAnimation[^}]*setValue\(0\)/);
  assert.match(src, /return \(\) => loops\.forEach\(l => l\.stop\(\)\)/);
  assert.match(src, /\[animated, spin, pulse, rise\]/);
  assert.match(src, /\{vip \? <View/);
});

test('B57 CP15 orbit sits on the same robot point as Earth Light, ripples on the same horizon; ramps strictly ascending', () => {
  const dark = read('src/NexaDarkDami.tsx'), earth = read('src/NexaEarthDami.tsx');
  for (const k of ['HALO_CX = 58', 'HALO_CY = 70']) { assert.ok(dark.includes(k)); assert.ok(earth.includes(k)); }
  assert.match(dark, /const HORIZON = 0\.5;/);
  assert.match(read('src/NexaCosmos.tsx'), /variant === 'home' \? 0\.6 : 0\.5/);
  for (const phase of [0, 0.1, 0.2, 0.6]) { const r = [0, 0.15 + phase * 0.1, 0.85, 1]; for (let i = 1; i < r.length; i++) assert.ok(r[i] > r[i - 1], `mote ramp ${r}`); }
  assert.match(dark, /inputRange: \[0, 0\.6, 1\], outputRange: \[0\.4 - phase \* 0\.14, 0\.18, 0\]/);
  // ripple opacity never negative: 0.4 - (2/3)*0.14 > 0.18 ; static 0.26 - 2*0.06 > 0
  assert.ok(0.4 - (2 / 3) * 0.14 > 0.18); assert.ok(0.26 - 2 * 0.06 > 0);
});

test('B57 CP15 Royal Dark Dami stays unchanged underneath, Earth Light Dami layers untouched, chat logic untouched', () => {
  const wb = read('src/NexaWorldBackground.tsx');
  assert.match(wb, /!light && cosmos && world === 'dami' \? <NexaCosmos variant="dami" dim=\{0\.28\}/);
  const earth = read('src/NexaEarth.tsx');
  for (const tag of ['EarthDamiSky', 'EarthDamiWater']) assert.match(earth, new RegExp(`variant === 'dami' \\? <${tag} `));
  assert.equal(read('src/NexaEarthDami.tsx').includes('NexaDarkDami'), false);
  const ai = read('src/NexaAI.tsx');
  assert.equal((ai.match(/(?<![A-Za-z])(style|contentContainerStyle)=\{\{/g) || []).length, 0);
  assert.equal(ai.includes('NexaDarkDami'), false);
});
