const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

// B57 Checkpoint 10 — BALL HOUSE block (Royal Dark floodlights + gold ball, Earth Light football + floating pitch, design layer).
// Sidebar order: ... Yaayz (CP8) -> L.A. (CP9) -> Ball House (CP10) -> Kitchen next.

const BALL_FILES = ['src/app/leisure/ball-house/index.tsx'];

test('B57 CP10 Ball House is no longer a sidebar row: it lives inside L.A. and stays reachable by route', () => {
  const ids = [...read('src/homeDesign.ts').matchAll(/\['([a-z]+)','[^']+','[a-z-]+-outline'/g)].map(m => m[1]);
  assert.ok(!ids.includes('ball'), 'Ball House must not be repeated in the sidebar');
  assert.ok(ids.includes('leisure'), 'L.A. stays in the sidebar');
  assert.match(read('src/nexaNavigation.ts'), /ball: \{ pathname: '\/leisure\/ball-house' \}/);
});

test('B57 CP10 no inline style object on the Ball House screen bypasses ds() (Earth Light design layer)', () => {
  let wrapped = 0;
  for (const f of BALL_FILES) {
    const src = read(f);
    assert.equal((src.match(/(?<![A-Za-z])(style|contentContainerStyle)=\{\{/g) || []).length, 0, `${f}: inline style not wrapped in ds()`);
    const w = (src.match(/(?<![A-Za-z])(style|contentContainerStyle)=\{ds\(\{/g) || []).length;
    if (w) assert.match(src, /import \{[^}]*\bds\b[^}]*\} from ['"][./]+theme['"]/, `${f} uses ds() without importing it`);
    wrapped += w;
  }
  assert.equal(wrapped, 15, 'all 15 plain inline styles found in the audit are wrapped');
});

test('B57 CP10 ds() is not stacked on token radius/typography; no bare colour literals in Ball House', () => {
  for (const f of BALL_FILES) {
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

test('B57 CP10 Earth Light: active filter pill text (deepBlack) on water blue (goldBright) stays readable (>= 4.5:1)', () => {
  const t = read('src/theme.ts');
  const light = t.slice(t.indexOf('lightTheme'));
  const pick = k => light.match(new RegExp(`${k}: '(#[0-9A-Fa-f]{6})'`))[1];
  const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(x => x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const a = lum(pick('deepBlack')), b = lum(pick('goldBright'));
  assert.ok((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5);
});

test('B57 CP10 regression: the wrapper-only edit kept every Ball House filter, request guard, ticket link and back key', () => {
  const src = read('src/app/leisure/ball-house/index.tsx');
  for (const needle of [
    'const loadRequest=useRef(0)', 'requestId!==loadRequest.current', 'requestId===loadRequest.current',
    'getBallHouseFootball(', 'getBallHouseTickets()', "setStateFilter(id as any)", 'setLeague(id)', "setDateFilter(dateFilter?'':serverToday(data?.generatedAt))",
    "pathname:'/(tabs)/yaayz',params:{type:'stadium',search:'Ball House',returnTo:'/leisure/ball-house'}",
    'Get Ball House arena tickets', 'nexaGoBack()', '← Back to L.A.', 'onRefresh={()=>load(true)}', 'world="ball-house"',
    'motion="live-update"', 'motion="payment"', 'motion="news"',
  ]) assert.ok(src.includes(needle), `missing: ${needle}`);
});

test('B57 CP10 Earth Light Ball House layers: native, decorative, ball + 3 trail dots, pitch + 2 floodlights, subscription rules', () => {
  const src = read('src/NexaEarthBall.tsx');
  assert.match(src, /export function EarthBallSky/);
  assert.match(src, /export function EarthBallWater/);
  assert.equal((src.match(/^import .*$/gm) || []).length, 3, 'only react, react-native and ./motion are imported');
  assert.equal((src.match(/pointerEvents="none"/g) || []).length, 2, 'both layers ignore touches');
  assert.match(src, /const TRAIL = 3;/);
  assert.match(src, /const STRIPES = 6;/);
  assert.match(src, /allows\('world-ambient'\)/);
  assert.match(src, /allows\('vip-spotlight'\)/);
  assert.equal((src.match(/return \(\) => loops?\.(forEach\(l => l\.stop\(\)\)|stop\(\))/g) || []).length, 2, 'loops stop on unmount');
  assert.match(src, /const ballX = animated \? kick\.interpolate/);
  assert.match(src, /const ballY = animated \? kick\.interpolate/);
  assert.match(src, /: width \* 0\.3;/, 'Free (static) still shows the ball');
  assert.match(src, /animated \? bob\.interpolate/);
  assert.match(src, /animated \? lamp\.interpolate/);
  assert.match(src, /: 0\.7;/, 'Free (static) still shows the lamps');
  // every animated ramp is strictly ascending
  for (const m of src.matchAll(/inputRange: \[([^\]]+)\]/g)) {
    const r = m[1].split(',').map(x => Number(eval(x.replace(/\bi\b/g, '0'))));
    for (let k = 1; k < r.length; k++) assert.ok(r[k] > r[k - 1], `ramp not ascending: ${m[1]}`);
  }
  for (const i of [0, 1]) { const r = [0, 0.25 + i * 0.5, 1]; for (let k = 1; k < r.length; k++) assert.ok(r[k] > r[k - 1]); }
  assert.doesNotMatch(src, /useThemeMode|currentThemeMode/);
});

test('B57 CP10 Royal Dark Ball House layer: native, decorative, two floodlight beams + one arcing ball, ramps ascending, subscription rules', () => {
  const src = read('src/NexaDarkBall.tsx');
  assert.match(src, /export function NexaDarkBall/);
  assert.equal((src.match(/^import .*$/gm) || []).length, 3);
  assert.equal((src.match(/pointerEvents="none"/g) || []).length, 1);
  assert.match(src, /const TRAIL = 2;/);
  assert.match(src, /inputRange: \[0, Math\.max\(0\.01, peak - 0\.25\), peak, Math\.min\(0\.99, peak \+ 0\.25\), 1\]/);
  for (const i of [0, 1]) {
    const peak = 0.25 + i * 0.5;
    const r = [0, Math.max(0.01, peak - 0.25), peak, Math.min(0.99, peak + 0.25), 1];
    for (let k = 1; k < r.length; k++) assert.ok(r[k] > r[k - 1], `beam ${i}: ramp not ascending ${r}`);
  }
  // beams are angled from a zero-size pivot on the top corner (same fix as the bunting and searchlight)
  assert.match(src, /left: i \? width : 0, top: 0, width: 0, height: 0, transform: \[\{ rotate: i \? '28deg' : '-28deg' \}\]/);
  assert.match(src, /allows\('world-ambient'\)/);
  assert.match(src, /allows\('vip-spotlight'\)/);
  assert.match(src, /return \(\) => loops\.forEach\(l => l\.stop\(\)\)/);
  assert.match(src, /: 0\.65;/, 'Free (static) still shows the beams');
  assert.match(src, /: 0\.6, transform/, 'Free (static) still shows the ball');
  assert.doesNotMatch(src, /useThemeMode|currentThemeMode/, 'the dark layer never branches on the theme');
});

test('B57 CP10 wiring: ball-house -> ball variant in Earth Light, dark layer only in Royal Dark, other worlds untouched', () => {
  const earth = read('src/NexaEarth.tsx');
  assert.match(earth, /export type EarthVariant = 'home' \| 'dami' \| 'zeeza' \| 'money' \| 'market' \| 'yaayz' \| 'leisure' \| 'ball' \| (?:'kitchen' \| )?(?:'game' \| )?(?:'fitness' \| )?'calm'/);
  assert.match(earth, /variant === 'ball' \? <EarthBallSky/);
  assert.match(earth, /variant === 'ball' \? <EarthBallWater/);
  assert.match(earth, /variant === 'home' \? 0\.62 : variant === 'dami' \? 0\.55 : 0\.68/, 'ball keeps the calm horizon');
  const wb = read('src/NexaWorldBackground.tsx');
  assert.match(wb, /world === 'leisure' \? 'leisure' : world === 'ball-house' \? 'ball' : (?:world === 'kitchen' \? 'kitchen' : )?(?:world === 'game-house' \? 'game' : )?(?:world === 'fitness' \? 'fitness' : )?'calm'/);
  assert.match(wb, /earthVariant === 'leisure' \|\| earthVariant === 'ball'(?: \|\| earthVariant === 'kitchen')?(?: \|\| earthVariant === 'game')?(?: \|\| earthVariant === 'fitness')? : !cosmos/, 'readability wash kept in Earth Light');
  assert.match(wb, /earthVariant === 'leisure' \|\| earthVariant === 'ball'(?: \|\| earthVariant === 'kitchen')?(?: \|\| earthVariant === 'game')?(?: \|\| earthVariant === 'fitness')? (?:\|\| isAccess )?\? 0\.18 : 0\}/, '0.18 dim kept in Earth Light');
  assert.match(wb, /\{!light && world === 'ball-house' \? <NexaDarkBall \/> : null\}/);
  for (const other of ['NexaDarkLeisure', 'NexaDarkYaayz', 'NexaDarkMarket', 'NexaDarkMoney']) assert.match(wb, new RegExp(`<${other} />`), `${other} untouched`);
  assert.ok(wb.indexOf('<Image source') < wb.indexOf('<NexaDarkBall />') && wb.indexOf('<NexaDarkBall />') < wb.indexOf('<NexaDepthLayer'));
  assert.equal((wb.match(/<NexaDarkBall \/>/g) || []).length, 1);
  // Ball House keeps its own poster and world; the L.A. hub (own world) and the other leisure blocks never mount Ball House layers
  assert.match(read('src/nexaWorlds.ts'), /'ball-house': require\('\.\.\/assets\/worlds\/ball_house_world\.jpg'\)/);
  assert.doesNotMatch(wb, /world === 'leisure' \? <NexaDarkBall/);
  // scenes are used only through the world background
  const users = fs.readdirSync(path.join(root, 'src')).filter(f => /\.tsx$/.test(f) && !['NexaWorldBackground.tsx', 'NexaEarth.tsx', 'NexaEarthBall.tsx', 'NexaDarkBall.tsx'].includes(f));
  for (const f of users) assert.doesNotMatch(read('src/' + f), /NexaEarthBall|NexaDarkBall/, `${f} imports a Ball House scene outside the world background`);
});
