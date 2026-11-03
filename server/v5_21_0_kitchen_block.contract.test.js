const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

// B57 Checkpoint 11 — KITCHEN block (Royal Dark heat lamps + steam, Earth Light steam wisps + kitchen boat, design layer).
// Sidebar order: ... L.A. (CP9) -> Ball House (CP10) -> Kitchen (CP11) -> Game House next.

const KITCHEN_FILES = ['src/LeisureKitchenScreen.tsx'];

test('B57 CP11 Kitchen is no longer a sidebar row: it lives inside L.A. and stays reachable by route', () => {
  const ids = [...read('src/homeDesign.ts').matchAll(/\['([a-z]+)','[^']+','[a-z-]+-outline'/g)].map(m => m[1]);
  assert.ok(!ids.includes('kitchen'), 'Kitchen must not be repeated in the sidebar');
  assert.ok(ids.includes('leisure'), 'L.A. stays in the sidebar');
  assert.match(read('src/nexaNavigation.ts'), /kitchen: \{ pathname: '\/leisure\/kitchen' \}/);
});

test('B57 CP11 no inline style object on the Kitchen screen bypasses ds() (Earth Light design layer)', () => {
  let wrapped = 0;
  for (const f of KITCHEN_FILES) {
    const src = read(f);
    assert.equal((src.match(/(?<![A-Za-z])(style|contentContainerStyle)=\{\{/g) || []).length, 0, `${f}: inline style not wrapped in ds()`);
    const w = (src.match(/(?<![A-Za-z])(style|contentContainerStyle)=\{ds\(\{/g) || []).length;
    if (w) assert.match(src, /import \{[^}]*\bds\b[^}]*\} from ['"][./]+theme['"]/, `${f} uses ds() without importing it`);
    wrapped += w;
  }
  assert.equal(wrapped, 9, 'all 9 plain inline styles found in the audit are wrapped');
});

test('B57 CP11 ds() is not stacked on token radius/typography; no bare colour literals in Kitchen', () => {
  for (const f of KITCHEN_FILES) {
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

test('B57 CP11 Earth Light readability: Kitchen button text, body text and muted text on cards (>= 4.5:1)', () => {
  const t = read('src/theme.ts');
  const light = t.slice(t.indexOf('const lightColors'), t.indexOf('const lightTheme'));
  const pick = k => light.match(new RegExp(`\\b${k}: '(#[0-9A-Fa-f]{6})'`))[1];
  const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(x => x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const x = lum(pick(a)), y = lum(pick(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  assert.ok(ratio('black', 'royalGold') >= 4.5, 'buttonText (black token = white) on royalGold (forest green)');
  assert.ok(ratio('text', 'card') >= 4.5, 'menu / order text on card');
  assert.ok(ratio('muted', 'card') >= 4.5, 'muted text on card');
});

test('B57 CP11 regression: the wrapper-only edit kept every Kitchen request guard, fee preview, payment, referral and receipt flow', () => {
  const src = read('src/LeisureKitchenScreen.tsx');
  for (const needle of [
    'const loadRequest=useRef(0)', 'requestId!==loadRequest.current', 'requestId===loadRequest.current',
    '/api/leisure/kitchen/menu', '/api/leisure/kitchen/orders', '/api/leisure/kitchen/referral',
    '/api/leisure/kitchen/orders/${x.id}/receipt-data', '/api/leisure/kitchen/fee-preview?items=', '/api/leisure/kitchen/payments/verify',
    '/api/leisure/kitchen/orders/${o.id}/fee-retry', 'feePreviewId:feePreview?.previewId',
    'Preview the NEXA service fee before confirming.', 'The service fee is charged separately from your food order.',
    'Preview NEXA service fee', 'Verify order payment', 'Retry NEXA service fee', 'Share referral',
    "o.status==='paid'&&o.providerVerified&&o.feeStatus==='pending'", "o.status==='pending_payment'&&o.paymentRef",
  ]) assert.ok(src.includes(needle), `missing: ${needle}`);
  // route: still inside the kitchen world; referral landing route untouched (no inline styles, no scene)
  assert.match(read('src/app/leisure/kitchen/index.tsx'), /world="kitchen"/);
  assert.doesNotMatch(read('src/app/leisure/kitchen/ref/[code].tsx'), /ds\(|NexaEarthKitchen|NexaDarkKitchen/);
});

test('B57 CP11 Earth Light Kitchen layers: native, decorative, four steam wisps + kitchen boat with chimney puffs and lit windows, subscription rules', () => {
  const src = read('src/NexaEarthKitchen.tsx');
  assert.match(src, /export function EarthKitchenSky/);
  assert.match(src, /export function EarthKitchenWater/);
  assert.equal((src.match(/^import .*$/gm) || []).length, 3, 'only react, react-native and ./motion are imported');
  assert.equal((src.match(/pointerEvents="none"/g) || []).length, 2, 'both layers ignore touches');
  const wisps = eval(src.match(/const WISPS[^=]*= (\[[\s\S]*?\]);/)[1]);
  assert.equal(wisps.length, 4, 'four steam wisps');
  for (const [l, d] of wisps) { assert.ok(l > 0.05 && l < 0.95); assert.ok(d >= 0 && d <= 3300); }
  assert.match(src, /const PUFFS = 3;/);
  assert.match(src, /allows\('world-ambient'\)/);
  assert.match(src, /allows\('vip-spotlight'\)/);
  assert.equal((src.match(/return \(\) => loops\.forEach\(l => l\.stop\(\)\)/g) || []).length, 2, 'loops stop on unmount');
  assert.match(src, /: 0\.45,/, 'Free (static) still shows the wisps');
  assert.match(src, /: 0\.8;/, 'Free (static) still shows the lit windows');
  assert.match(src, /animated \? bob\.interpolate/);
  assert.match(src, /animated \? glow\.interpolate/);
  // every animated ramp is strictly ascending
  for (const m of src.matchAll(/inputRange: \[([^\]]+)\]/g)) {
    const r = m[1].split(',').map(x => Number(eval(x)));
    for (let k = 1; k < r.length; k++) assert.ok(r[k] > r[k - 1], `ramp not ascending: ${m[1]}`);
  }
  // the wisp loop and the puff loop both fit inside one fixed cycle (delay before + delay after = constant)
  assert.match(src, /Animated\.delay\(3300 - WISPS\[idx\]\[1\]\)/);
  assert.match(src, /Animated\.delay\(\(PUFFS - 1 - idx\) \* 1200\)/);
  assert.doesNotMatch(src, /useThemeMode|currentThemeMode/);
});

test('B57 CP11 Royal Dark Kitchen layer: native, decorative, three heat lamps lit in turn + four faint steam wisps, ramps ascending, subscription rules', () => {
  const src = read('src/NexaDarkKitchen.tsx');
  assert.match(src, /export function NexaDarkKitchen/);
  assert.equal((src.match(/^import .*$/gm) || []).length, 3);
  assert.equal((src.match(/pointerEvents="none"/g) || []).length, 1);
  assert.match(src, /const LAMPS = \[0\.2, 0\.5, 0\.8\];/);
  assert.match(src, /inputRange: \[0, Math\.max\(0\.01, peak - 0\.17\), peak, Math\.min\(0\.99, peak \+ 0\.17\), 1\]/);
  for (const peak of [0.2, 0.5, 0.8]) {
    const r = [0, Math.max(0.01, peak - 0.17), peak, Math.min(0.99, peak + 0.17), 1];
    for (let k = 1; k < r.length; k++) assert.ok(r[k] > r[k - 1], `lamp ${peak}: ramp not ascending ${r}`);
  }
  const wisps = eval(src.match(/const WISPS[^=]*= (\[[\s\S]*?\]);/)[1]);
  assert.equal(wisps.length, 4);
  assert.match(src, /Animated\.delay\(3600 - WISPS\[idx\]\[1\]\)/);
  assert.match(src, /allows\('world-ambient'\)/);
  assert.match(src, /allows\('vip-spotlight'\)/);
  assert.match(src, /return \(\) => loops\.forEach\(l => l\.stop\(\)\)/);
  assert.match(src, /: 0\.7;/, 'Free (static) still shows the lamps');
  assert.match(src, /: 0\.5,/, 'Free (static) still shows the steam');
  assert.doesNotMatch(src, /useThemeMode|currentThemeMode/, 'the dark layer never branches on the theme');
});

test('B57 CP11 wiring: kitchen -> kitchen variant in Earth Light, dark layer only in Royal Dark, other worlds untouched', () => {
  const earth = read('src/NexaEarth.tsx');
  assert.match(earth, /export type EarthVariant = 'home' \| 'dami' \| 'zeeza' \| 'money' \| 'market' \| 'yaayz' \| 'leisure' \| 'ball' \| 'kitchen' \| (?:'game' \| )?(?:'fitness' \| )?'calm'/);
  assert.match(earth, /variant === 'kitchen' \? <EarthKitchenSky/);
  assert.match(earth, /variant === 'kitchen' \? <EarthKitchenWater/);
  assert.match(earth, /variant === 'home' \? 0\.62 : variant === 'dami' \? 0\.55 : 0\.68/, 'kitchen keeps the calm horizon');
  const wb = read('src/NexaWorldBackground.tsx');
  assert.match(wb, /world === 'ball-house' \? 'ball' : world === 'kitchen' \? 'kitchen' : (?:world === 'game-house' \? 'game' : )?(?:world === 'fitness' \? 'fitness' : )?'calm'/);
  assert.match(wb, /earthVariant === 'ball' \|\| earthVariant === 'kitchen'(?: \|\| earthVariant === 'game')?(?: \|\| earthVariant === 'fitness')? : !cosmos/, 'readability wash kept in Earth Light');
  assert.match(wb, /earthVariant === 'ball' \|\| earthVariant === 'kitchen'(?: \|\| earthVariant === 'game')?(?: \|\| earthVariant === 'fitness')? (?:\|\| isAccess )?\? 0\.18 : 0\}/, '0.18 dim kept in Earth Light');
  assert.match(wb, /\{!light && world === 'kitchen' \? <NexaDarkKitchen \/> : null\}/);
  for (const other of ['NexaDarkBall', 'NexaDarkLeisure', 'NexaDarkYaayz', 'NexaDarkMarket', 'NexaDarkMoney']) assert.match(wb, new RegExp(`<${other} />`), `${other} untouched`);
  assert.ok(wb.indexOf('<Image source') < wb.indexOf('<NexaDarkKitchen />') && wb.indexOf('<NexaDarkKitchen />') < wb.indexOf('<NexaDepthLayer'));
  assert.equal((wb.match(/<NexaDarkKitchen \/>/g) || []).length, 1);
  // Kitchen keeps its own poster and world; Ball House / L.A. never mount Kitchen layers and Game House / Fitness get nothing
  assert.match(read('src/nexaWorlds.ts'), /kitchen: require\('\.\.\/assets\/worlds\/kitchen_world\.jpg'\)/);
  assert.doesNotMatch(wb, /world === 'ball-house' \? <NexaDarkKitchen|world === 'leisure' \? <NexaDarkKitchen/);
  // scenes are used only through the world background
  const users = fs.readdirSync(path.join(root, 'src')).filter(f => /\.tsx$/.test(f) && !['NexaWorldBackground.tsx', 'NexaEarth.tsx', 'NexaEarthKitchen.tsx', 'NexaDarkKitchen.tsx'].includes(f));
  for (const f of users) assert.doesNotMatch(read('src/' + f), /NexaEarthKitchen|NexaDarkKitchen/, `${f} imports a Kitchen scene outside the world background`);
});

// B144 WIP8 — Kitchen share link must carry the friend's code through to the order screen.
test('B144 WIP8 Kitchen referral link passes the code to the Kitchen screen, which pre-fills it', () => {
  assert.match(read('src/app/leisure/kitchen/ref/[code].tsx'), /params:\{ref:String\(code/);
  assert.match(read('src/app/leisure/kitchen/index.tsx'), /initialReferral=/);
  assert.match(read('src/LeisureKitchenScreen.tsx'), /useState\(String\(initialReferral/);
});
