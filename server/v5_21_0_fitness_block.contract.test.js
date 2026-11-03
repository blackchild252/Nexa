const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

// B57 Checkpoint 13 — FITNESS block (Royal Dark dumbbells + heartbeat ring, Earth Light dumbbells + rowing boat, design layer).
// Sidebar order: ... Kitchen (CP11) -> Game House (CP12) -> Fitness (CP13) -> Notifications next.

const FIT_FILES = ['src/app/leisure/fitness/index.tsx'];

test('B57 CP13 Fitness is no longer a sidebar row: it lives inside L.A. and stays reachable by route', () => {
  const ids = [...read('src/homeDesign.ts').matchAll(/\['([a-z]+)','[^']+','[a-z-]+-outline'/g)].map(m => m[1]);
  assert.ok(!ids.includes('fitness'), 'Fitness must not be repeated in the sidebar');
  assert.ok(ids.includes('leisure'), 'L.A. stays in the sidebar');
  assert.match(read('src/nexaNavigation.ts'), /fitness: \{ pathname: '\/leisure\/fitness' \}/);
});

test('B57 CP13 no plain inline style object on the Fitness screen bypasses ds() (Earth Light design layer)', () => {
  let wrapped = 0;
  for (const f of FIT_FILES) {
    const src = read(f);
    assert.equal((src.match(/(?<![A-Za-z])(style|contentContainerStyle)=\{\{/g) || []).length, 0, `${f}: inline style not wrapped in ds()`);
    const w = (src.match(/(?<![A-Za-z])(style|contentContainerStyle)=\{ds\(\{/g) || []).length;
    if (w) assert.match(src, /import \{[^}]*\bds\b[^}]*\} from ['"][./]+theme['"]/, `${f} uses ds() without importing it`);
    wrapped += w;
  }
  assert.equal(wrapped, 6, 'all current plain inline styles found in the audit are wrapped');
});

test('B57 CP13 ds() is not stacked on token radius/typography; no bare colour literals in Fitness', () => {
  for (const f of FIT_FILES) {
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

test('B57 CP13 Earth Light readability: guide / gym names, button text, body text, and input text + placeholder (>= 4.5:1)', () => {
  const t = read('src/theme.ts');
  const light = t.slice(t.indexOf('const lightColors'), t.indexOf('const lightTheme'));
  const pick = k => light.match(new RegExp(`\\b${k}: '(#[0-9A-Fa-f]{6})'`))[1];
  const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(x => x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const x = lum(pick(a)), y = lum(pick(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  assert.ok(ratio('goldBright', 'card') >= 4.5, 'guide / gym name (goldBright = water blue) on card');
  assert.ok(ratio('black', 'royalGold') >= 4.5, 'button text on royalGold (forest green)');
  assert.ok(ratio('text', 'card') >= 4.5, 'section text on card');
  assert.ok(ratio('muted', 'card') >= 4.5, 'muted text on card');
  assert.ok(ratio('text', 'surfaceElevated') >= 4.5, 'typed text in inputs');
  assert.ok(ratio('muted', 'surfaceElevated') >= 4.5, 'placeholder text in inputs');
});

test('B57 CP13 regression: the wrapper-only edit kept the request guard, gym search, registration, PDF guides, marketplace link and back key', () => {
  const src = read('src/app/leisure/fitness/index.tsx');
  for (const needle of [
    'const gymSearchRequest=useRef(0)', 'requestId!==gymSearchRequest.current', 'requestId===gymSearchRequest.current',
    '/api/fitness/gyms?city=${encodeURIComponent(city.trim())}', "authedFetch('/api/fitness/gyms',{method:'POST'",
    'Enter the gym name, town/city and address.', 'Submitted for review', 'No approved gyms found for that town yet.',
    '01_Gym_Workout_Basics.pdf', '02_Equipment_Use_Guide.pdf', '03_Gym_Safety_Checklist.pdf',
    "Sharing.shareAsync(asset.localUri,{mimeType:'application/pdf'", 'Open PDF guide', 'Find gyms', 'Register gym',
    "router.push('/(tabs)/marketplace' as any)", 'Explore Dream Marketplace', 'nexaGoBack()', '← Back to L.A.', 'world="fitness"',
  ]) assert.ok(src.includes(needle), `missing: ${needle}`);
});

test('B57 CP13 Earth Light Fitness layers: native, decorative, three dumbbells lifting in turn + rowing boat with two swinging oars, subscription rules', () => {
  const src = read('src/NexaEarthFitness.tsx');
  assert.match(src, /export function EarthFitnessSky/);
  assert.match(src, /export function EarthFitnessWater/);
  assert.equal((src.match(/^import .*$/gm) || []).length, 3, 'only react, react-native and ./motion are imported');
  assert.equal((src.match(/pointerEvents="none"/g) || []).length, 2, 'both layers ignore touches');
  const bells = eval(src.match(/const BELLS[^=]*= (\[[\s\S]*?\]);/)[1]);
  assert.equal(bells.length, 3, 'three dumbbells');
  for (const [l, t] of bells) { assert.ok(l > 0.05 && l < 0.95 && t > 0.03 && t < 0.25); }
  assert.match(src, /allows\('world-ambient'\)/);
  assert.match(src, /allows\('vip-spotlight'\)/);
  assert.equal((src.match(/return \(\) => loops?\.(forEach\(l => l\.stop\(\)\)|stop\(\))/g) || []).length, 2, 'loops stop on unmount');
  assert.match(src, /: -i \* 3 \}/, 'Free (static) still shows the dumbbells');
  assert.match(src, /'-10deg'/, 'Free (static) still shows the oars');
  assert.match(src, /animated \? bob\.interpolate/);
  // lift ramps: strictly ascending for all three dumbbells
  assert.match(src, /inputRange: \[0, 0\.01 \+ i \* 0\.3, 0\.15 \+ i \* 0\.3, 0\.29 \+ i \* 0\.3, 1\]/);
  for (let i = 0; i < 3; i++) { const r = [0, 0.01 + i * 0.3, 0.15 + i * 0.3, 0.29 + i * 0.3, 1]; for (let k = 1; k < r.length; k++) assert.ok(r[k] > r[k - 1], `dumbbell ${i} ramp ${r}`); }
  // every other animated ramp is strictly ascending
  for (const m of src.matchAll(/inputRange: \[([^\]]+)\]/g)) {
    if (/\bi\b/.test(m[1])) continue;
    const r = m[1].split(',').map(x => Number(eval(x)));
    for (let k = 1; k < r.length; k++) assert.ok(r[k] > r[k - 1], `ramp not ascending: ${m[1]}`);
  }
  // oars swing from a zero-size pivot at the hull side (same fix as the bunting, searchlight and floodlight beams)
  assert.match(src, /left: side \? 66 : 48, top: 30, width: 0, height: 0/);
  assert.doesNotMatch(src, /useThemeMode|currentThemeMode/);
});

test('B57 CP13 Royal Dark Fitness layer: native, decorative, three faint dumbbells lifting in turn + one lub-dub heartbeat ring, ramps ascending, subscription rules', () => {
  const src = read('src/NexaDarkFitness.tsx');
  assert.match(src, /export function NexaDarkFitness/);
  assert.equal((src.match(/^import .*$/gm) || []).length, 3);
  assert.equal((src.match(/pointerEvents="none"/g) || []).length, 1);
  assert.match(src, /const BELLS = \[0\.25, 0\.55, 0\.85\];/);
  assert.match(src, /inputRange: \[0, 0\.01 \+ i \* 0\.3, 0\.15 \+ i \* 0\.3, 0\.29 \+ i \* 0\.3, 1\]/);
  for (let i = 0; i < 3; i++) { const r = [0, 0.01 + i * 0.3, 0.15 + i * 0.3, 0.29 + i * 0.3, 1]; for (let k = 1; k < r.length; k++) assert.ok(r[k] > r[k - 1], `dumbbell ${i} ramp ${r}`); }
  // lub-dub: two pulses (peaks) in the first third of the cycle, ramp strictly ascending, matching output length
  const beat = src.match(/beat\.interpolate\(\{ inputRange: \[([^\]]+)\], outputRange: \[([^\]]+)\] \}\)/);
  const inR = beat[1].split(',').map(Number), outR = beat[2].split(',').map(Number);
  assert.equal(inR.length, outR.length);
  for (let k = 1; k < inR.length; k++) assert.ok(inR[k] > inR[k - 1], `beat ramp not ascending ${inR}`);
  assert.equal(outR.filter((v, k) => k > 0 && k < outR.length - 1 && v > outR[k - 1] && v > outR[k + 1]).length, 2, 'two pulses per beat');
  assert.match(src, /allows\('world-ambient'\)/);
  assert.match(src, /allows\('vip-spotlight'\)/);
  assert.match(src, /return \(\) => loops\.forEach\(l => l\.stop\(\)\)/);
  assert.match(src, /: 0\.6;/, 'Free (static) still shows the heartbeat ring');
  assert.doesNotMatch(src, /useThemeMode|currentThemeMode/, 'the dark layer never branches on the theme');
});

test('B57 CP13 wiring: fitness -> fitness variant in Earth Light, dark layer only in Royal Dark, other worlds untouched', () => {
  const earth = read('src/NexaEarth.tsx');
  assert.match(earth, /export type EarthVariant = 'home' \| 'dami' \| 'zeeza' \| 'money' \| 'market' \| 'yaayz' \| 'leisure' \| 'ball' \| 'kitchen' \| 'game' \| 'fitness' \| 'calm'/);
  assert.match(earth, /variant === 'fitness' \? <EarthFitnessSky/);
  assert.match(earth, /variant === 'fitness' \? <EarthFitnessWater/);
  assert.match(earth, /variant === 'home' \? 0\.62 : variant === 'dami' \? 0\.55 : 0\.68/, 'fitness keeps the calm horizon');
  const wb = read('src/NexaWorldBackground.tsx');
  assert.match(wb, /world === 'game-house' \? 'game' : world === 'fitness' \? 'fitness' : 'calm'/);
  assert.match(wb, /earthVariant === 'game' \|\| earthVariant === 'fitness' : !cosmos/, 'readability wash kept in Earth Light');
  assert.match(wb, /earthVariant === 'game' \|\| earthVariant === 'fitness' (?:\|\| isAccess )?\? 0\.18 : 0\}/, '0.18 dim kept in Earth Light');
  assert.match(wb, /\{!light && world === 'fitness' \? <NexaDarkFitness \/> : null\}/);
  for (const other of ['NexaDarkGame', 'NexaDarkKitchen', 'NexaDarkBall', 'NexaDarkLeisure', 'NexaDarkYaayz', 'NexaDarkMarket', 'NexaDarkMoney']) assert.match(wb, new RegExp(`<${other} />`), `${other} untouched`);
  assert.ok(wb.indexOf('<Image source') < wb.indexOf('<NexaDarkFitness />') && wb.indexOf('<NexaDarkFitness />') < wb.indexOf('<NexaDepthLayer'));
  assert.equal((wb.match(/<NexaDarkFitness \/>/g) || []).length, 1);
  // Fitness keeps its own poster; other leisure blocks never mount Fitness layers
  assert.match(read('src/nexaWorlds.ts'), /fitness: require\('\.\.\/assets\/worlds\/fitness_world\.jpg'\)/);
  assert.doesNotMatch(wb, /world === 'game-house' \? <NexaDarkFitness|world === 'kitchen' \? <NexaDarkFitness|world === 'ball-house' \? <NexaDarkFitness|world === 'leisure' \? <NexaDarkFitness/);
  const users = fs.readdirSync(path.join(root, 'src')).filter(f => /\.tsx$/.test(f) && !['NexaWorldBackground.tsx', 'NexaEarth.tsx', 'NexaEarthFitness.tsx', 'NexaDarkFitness.tsx'].includes(f));
  for (const f of users) assert.doesNotMatch(read('src/' + f), /NexaEarthFitness|NexaDarkFitness/, `${f} imports a Fitness scene outside the world background`);
});
