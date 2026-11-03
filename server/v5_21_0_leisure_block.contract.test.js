const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

// B57 Checkpoint 9 — L.A. (Leisure Arena) block: the L.A. hub tab only.
// Sidebar order: ... Dream Marketplace (CP7) -> Yaayz (CP8) -> L.A. (CP9) -> Ball House next.
// Ball House, Kitchen, Game House and Fitness are their own sidebar blocks and get nothing from this checkpoint.

const LA_FILES = ['src/LeisureArenaScreen.tsx', 'src/app/(tabs)/leisure.tsx'];

test('B57 CP9 L.A. is eighth in the sidebar directory, right after Yaayz; its four activities are not repeated after it', () => {
  const ids = [...read('src/homeDesign.ts').matchAll(/\['([a-z]+)','[^']+','[a-z-]+-outline'/g)].map(m => m[1]);
  assert.deepEqual(ids.slice(0, 9), ['home', 'dami', 'zeeza', 'money', 'marketplace', 'vendor', 'yaayz', 'leisure', 'notifications']);
});

test('B57 CP9 no inline style object on the L.A. screen bypasses ds() (Earth Light design layer)', () => {
  let wrapped = 0;
  for (const f of LA_FILES) {
    const src = read(f);
    assert.equal((src.match(/(?<![A-Za-z])(style|contentContainerStyle)=\{\{/g) || []).length, 0, `${f}: inline style not wrapped in ds()`);
    const w = (src.match(/(?<![A-Za-z])(style|contentContainerStyle)=\{ds\(\{/g) || []).length;
    if (w) assert.match(src, /import \{[^}]*\bds\b[^}]*\} from ['"][./]+theme['"]/, `${f} uses ds() without importing it`);
    wrapped += w;
  }
  assert.equal(wrapped, 2, 'the 2 plain inline styles found in the audit are wrapped (LeisureArenaScreen 2)');
});

test('B57 CP9 ds() is not stacked on token radius/typography in L.A. inline styles; no bare colour literals', () => {
  for (const f of LA_FILES) {
    const src = read(f);
    for (const m of src.matchAll(/=\{ds\(\{/g)) {
      let depth = 0, i = m.index + m[0].length - 1, end = -1, q = null;
      for (let k = i; k < src.length; k++) {
        const c = src[k];
        if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
        if (c === '"' || c === "'" || c === '`') { q = c; continue; }
        if (c === '{') depth++; else if (c === '}') { depth--; if (!depth) { end = k; break; } }
      }
      assert.ok(end > 0, `${f}: unbalanced ds()`);
      assert.doesNotMatch(src.slice(i, end), /theme\.radius|theme\.typography/, `${f}: token radius/typography inside ds()`);
    }
    const bare = (src.match(/(?<!tc\()['"]#[0-9a-fA-F]{3,8}['"]/g) || []).filter(x => !/^['"](#fff|#ffffff)['"]$/i.test(x));
    assert.deepEqual(bare, [], `${f}: bare colour literal ${bare.join(', ')}`);
  }
});

test('B57 CP9 regression: the wrapper-only edit kept every L.A. card, route and the discovery request guard', () => {
  const src = read('src/LeisureArenaScreen.tsx');
  for (const needle of [
    "path:'/leisure/kitchen'", "path:'/leisure/ball-house'", "path:'/leisure/game-house'", "path:'/leisure/fitness'",
    'authedFetch("/api/leisure/discovery")', 'requestId===requestRef.current', 'return()=>{requestRef.current++}',
    'Upcoming Yaayz tickets', "router.push(a.path as any)", 'accessibilityRole="link"',
  ]) assert.ok(src.includes(needle), `missing: ${needle}`);
  assert.equal((src.match(/path:'\/leisure\//g) || []).length, 4);
});

test('B57 CP9 L.A. has its own world (own scenes) but the SAME poster as before: Royal Dark looks unchanged, Ball House is not affected', () => {
  const w = read('src/nexaWorlds.ts');
  assert.match(w, /\| 'leisure'/);
  assert.match(w, /leisure: require\('\.\.\/assets\/worlds\/ball_house_world\.jpg'\)/);
  assert.match(w, /'ball-house': require\('\.\.\/assets\/worlds\/ball_house_world\.jpg'\)/);
  assert.match(w, /leisure: '[^']+'/, 'prompt entry exists (Record<NexaWorld,string> stays complete)');
  assert.match(read('src/app/(tabs)/leisure.tsx'), /<NexaWorldBackground world="leisure"><LeisureArenaScreen\/><\/NexaWorldBackground>/);
  assert.doesNotMatch(read('src/app/(tabs)/leisure.tsx'), /ball-house/);
  // Ball House route still lives in the ball-house world and never mounts an L.A. layer
  assert.match(read('src/app/leisure/ball-house/index.tsx'), /world="ball-house"/);
  const wb = read('src/NexaWorldBackground.tsx');
  // (CP10 gave Ball House its own layers; the L.A. layers still never mount for it, and vice versa)
  assert.doesNotMatch(wb, /world === 'ball-house' \? <NexaDarkLeisure/);
  assert.doesNotMatch(wb, /world === 'leisure' \? <NexaDarkBall/);
});

test('B57 CP9 Earth Light L.A. layers: native, decorative, four balloons + pier with four lamps, subscription rules', () => {
  const src = read('src/NexaEarthLeisure.tsx');
  assert.match(src, /export function EarthLeisureSky/);
  assert.match(src, /export function EarthLeisureWater/);
  assert.equal((src.match(/^import .*$/gm) || []).length, 3, 'only react, react-native and ./motion are imported');
  assert.equal((src.match(/pointerEvents="none"/g) || []).length, 2, 'both layers ignore touches');
  const balloons = eval(src.match(/const BALLOONS[^=]*= (\[[\s\S]*?\]);\n/)[1]);
  assert.equal(balloons.length, 4, 'one balloon per activity');
  for (const [l, t, , ms] of balloons) { assert.ok(l > 0.05 && l < 0.95 && t > 0.03 && t < 0.25); assert.ok(ms >= 4000); }
  assert.match(src, /const LAMPS = 4;/);
  assert.match(src, /allows\('world-ambient'\)/);
  assert.match(src, /allows\('vip-spotlight'\)/);
  assert.equal((src.match(/return \(\) => loops?\.(forEach\(l => l\.stop\(\)\)|stop\(\))/g) || []).length, 2, 'loops stop on unmount');
  assert.match(src, /animated \? bob\[i\]\.interpolate/);
  assert.match(src, /animated \? glow\.interpolate/);
  assert.match(src, /: 0\.7;/, 'Free (static) still shows the lamps');
  assert.match(src, /inputRange: \[0, Math\.max\(0\.01, peak - 0\.2\), peak, Math\.min\(0\.99, peak \+ 0\.2\), 1\]/);
  for (let i = 0; i < 4; i++) {
    const peak = (i + 0.5) / 4;
    const r = [0, Math.max(0.01, peak - 0.2), peak, Math.min(0.99, peak + 0.2), 1];
    for (let k = 1; k < r.length; k++) assert.ok(r[k] > r[k - 1], `lamp ${i}: ramp not ascending ${r}`);
  }
  assert.doesNotMatch(src, /useThemeMode|currentThemeMode/);
});

test('B57 CP9 Royal Dark L.A. layer: native, decorative, four rings + one searchlight, ramps ascending, subscription rules', () => {
  const src = read('src/NexaDarkLeisure.tsx');
  assert.match(src, /export function NexaDarkLeisure/);
  assert.equal((src.match(/^import .*$/gm) || []).length, 3);
  assert.equal((src.match(/pointerEvents="none"/g) || []).length, 1);
  const rings = eval(src.match(/const RINGS[^=]*= (\[[\s\S]*?\]);\n/)[1]);
  assert.equal(rings.length, 4, 'one ring per activity');
  for (const [l, t] of rings) assert.ok(l > 0.05 && l < 0.95 && t > 0.02 && t < 0.2);
  assert.match(src, /inputRange: \[0, Math\.max\(0\.01, peak - 0\.2\), peak, Math\.min\(0\.99, peak \+ 0\.2\), 1\]/);
  for (let i = 0; i < rings.length; i++) {
    const peak = (i + 0.5) / rings.length;
    const r = [0, Math.max(0.01, peak - 0.2), peak, Math.min(0.99, peak + 0.2), 1];
    for (let k = 1; k < r.length; k++) assert.ok(r[k] > r[k - 1], `ring ${i}: ramp not ascending ${r}`);
  }
  assert.match(src, /allows\('world-ambient'\)/);
  assert.match(src, /allows\('vip-spotlight'\)/);
  assert.match(src, /return \(\) => loops\.forEach\(l => l\.stop\(\)\)/);
  assert.match(src, /: 0\.5;/, 'Free (static) still shows the rings');
  // searchlight swings from a zero-size pivot on the bottom edge (same fix as the CP7 bunting)
  assert.match(src, /left: width \/ 2, bottom: 0, width: 0, height: 0, transform: \[\{ rotate:/);
  assert.match(src, /'-16deg', '16deg'/);
  assert.doesNotMatch(src, /useThemeMode|currentThemeMode/, 'the dark layer never branches on the theme');
});

test('B57 CP9 wiring: leisure -> leisure variant in Earth Light, dark layer only in Royal Dark, other worlds untouched', () => {
  const earth = read('src/NexaEarth.tsx');
  assert.match(earth, /export type EarthVariant = 'home' \| 'dami' \| 'zeeza' \| 'money' \| 'market' \| 'yaayz' \| 'leisure' \| (?:'ball' \| )?(?:'kitchen' \| )?(?:'game' \| )?(?:'fitness' \| )?'calm'/);
  assert.match(earth, /variant === 'leisure' \? <EarthLeisureSky/);
  assert.match(earth, /variant === 'leisure' \? <EarthLeisureWater/);
  assert.match(earth, /variant === 'home' \? 0\.62 : variant === 'dami' \? 0\.55 : 0\.68/, 'leisure keeps the calm horizon');
  const wb = read('src/NexaWorldBackground.tsx');
  assert.match(wb, /world === 'yaayz' \? 'yaayz' : world === 'leisure' \? 'leisure' : (?:world === 'ball-house' \? 'ball' : )?(?:world === 'kitchen' \? 'kitchen' : )?(?:world === 'game-house' \? 'game' : )?(?:world === 'fitness' \? 'fitness' : )?'calm'/);
  assert.match(wb, /earthVariant === 'yaayz' \|\| earthVariant === 'leisure'(?: \|\| earthVariant === 'ball')?(?: \|\| earthVariant === 'kitchen')?(?: \|\| earthVariant === 'game')?(?: \|\| earthVariant === 'fitness')? : !cosmos/, 'readability wash kept in Earth Light');
  assert.match(wb, /earthVariant === 'yaayz' \|\| earthVariant === 'leisure'(?: \|\| earthVariant === 'ball')?(?: \|\| earthVariant === 'kitchen')?(?: \|\| earthVariant === 'game')?(?: \|\| earthVariant === 'fitness')? (?:\|\| isAccess )?\? 0\.18 : 0\}/, '0.18 dim kept in Earth Light');
  assert.match(wb, /\{!light && world === 'leisure' \? <NexaDarkLeisure \/> : null\}/);
  for (const other of ['NexaDarkYaayz', 'NexaDarkMarket', 'NexaDarkMoney']) assert.match(wb, new RegExp(`<${other} />`), `${other} untouched`);
  assert.ok(wb.indexOf('<Image source') < wb.indexOf('<NexaDarkLeisure />') && wb.indexOf('<NexaDarkLeisure />') < wb.indexOf('<NexaDepthLayer'));
  assert.equal((wb.match(/<NexaDarkLeisure \/>/g) || []).length, 1);
  // scenes are used only through the world background
  const users = fs.readdirSync(path.join(root, 'src')).filter(f => /\.tsx$/.test(f) && !['NexaWorldBackground.tsx', 'NexaEarth.tsx', 'NexaEarthLeisure.tsx', 'NexaDarkLeisure.tsx'].includes(f));
  for (const f of users) assert.doesNotMatch(read('src/' + f), /NexaEarthLeisure|NexaDarkLeisure/, `${f} imports an L.A. scene outside the world background`);
});
