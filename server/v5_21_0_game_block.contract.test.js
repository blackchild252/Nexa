const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

// B57 Checkpoint 12 — GAME HOUSE block (Royal Dark puzzle pieces + button glows, Earth Light puzzle pieces + game raft, design layer).
// Sidebar order: ... Ball House (CP10) -> Kitchen (CP11) -> Game House (CP12) -> Fitness next.

const GAME_FILES = ['src/app/leisure/game-house/index.tsx'];

test('B57 CP12 Game House is no longer a sidebar row: it lives inside L.A. and stays reachable by route', () => {
  const ids = [...read('src/homeDesign.ts').matchAll(/\['([a-z]+)','[^']+','[a-z-]+-outline'/g)].map(m => m[1]);
  assert.ok(!ids.includes('game'), 'Game House must not be repeated in the sidebar');
  assert.ok(ids.includes('leisure'), 'L.A. stays in the sidebar');
  assert.match(read('src/nexaNavigation.ts'), /game: \{ pathname: '\/leisure\/game-house' \}/);
});

test('B57 CP12 no plain inline style object on the Game House screen bypasses ds() (Earth Light design layer)', () => {
  let wrapped = 0;
  for (const f of GAME_FILES) {
    const src = read(f);
    assert.equal((src.match(/(?<![A-Za-z])(style|contentContainerStyle)=\{\{/g) || []).length, 0, `${f}: inline style not wrapped in ds()`);
    const w = (src.match(/(?<![A-Za-z])(style|contentContainerStyle)=\{ds\(\{/g) || []).length;
    if (w) assert.match(src, /import \{[^}]*\bds\b[^}]*\} from ['"][./]+theme['"]/, `${f} uses ds() without importing it`);
    wrapped += w;
  }
  assert.equal(wrapped, 2, 'both plain inline styles found in the audit are wrapped');
});

test('B57 CP12 ds() is not stacked on token radius/typography; no bare colour literals in Game House', () => {
  for (const f of GAME_FILES) {
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

test('B57 CP12 Earth Light readability: game titles (goldBright), button text and body text on cards (>= 4.5:1)', () => {
  const t = read('src/theme.ts');
  const light = t.slice(t.indexOf('const lightColors'), t.indexOf('const lightTheme'));
  const pick = k => light.match(new RegExp(`\\b${k}: '(#[0-9A-Fa-f]{6})'`))[1];
  const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(x => x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const x = lum(pick(a)), y = lum(pick(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  assert.ok(ratio('goldBright', 'card') >= 4.5, 'featured game name (goldBright = water blue) on card');
  assert.ok(ratio('black', 'royalGold') >= 4.5, 'ticket button text on royalGold (forest green)');
  assert.ok(ratio('text', 'card') >= 4.5, 'section text on card');
  assert.ok(ratio('muted', 'card') >= 4.5, 'muted text on card');
});

test('B57 CP12 regression: the wrapper-only edit kept the Yaayz ticket link, featured games, honest notes and back key', () => {
  const src = read('src/app/leisure/game-house/index.tsx');
  for (const needle of [
    "pathname:'/(tabs)/yaayz',params:{type:'event',search:'Game House',returnTo:'/leisure/game-house'}",
    'Find Game House tickets in Yaayz', 'PUBG Mobile', 'Call of Duty: Mobile', 'Fortnite',
    'No fabricated player scores are shown.', 'It does not broadcast gameplay like Twitch.',
    'nexaGoBack()', '← Back to L.A.', 'world="game-house"',
  ]) assert.ok(src.includes(needle), `missing: ${needle}`);
});

test('B57 CP12 Earth Light Game House layers: native, decorative, three puzzle pieces + game raft with four buttons lit in turn, subscription rules', () => {
  const src = read('src/NexaEarthGame.tsx');
  assert.match(src, /export function EarthGameSky/);
  assert.match(src, /export function EarthGameWater/);
  assert.equal((src.match(/^import .*$/gm) || []).length, 3, 'only react, react-native and ./motion are imported');
  assert.equal((src.match(/pointerEvents="none"/g) || []).length, 2, 'both layers ignore touches');
  const pieces = eval(src.match(/const PIECES[^=]*= (\[[\s\S]*?\]);/)[1]);
  assert.equal(pieces.length, 3, 'three puzzle pieces');
  for (const [l, t, d] of pieces) { assert.ok(l > 0.05 && l < 0.95 && t > 0.03 && t < 0.25); assert.ok(d >= 0 && d <= 6000); }
  assert.match(src, /const CYCLE = 6000;/);
  assert.match(src, /Animated\.delay\(CYCLE - PIECES\[idx\]\[2\]\)/);
  assert.equal(eval(src.match(/const BLOCKS[^=]*= (\[[\s\S]*?\]);/)[1]).length, 4, 'four blocks per piece');
  assert.equal(eval(src.match(/const BUTTONS[^=]*= (\[[\s\S]*?\]);/)[1]).length, 4, 'four buttons');
  assert.match(src, /allows\('world-ambient'\)/);
  assert.match(src, /allows\('vip-spotlight'\)/);
  assert.equal((src.match(/return \(\) => loops\.forEach\(l => l\.stop\(\)\)/g) || []).length, 2, 'loops stop on unmount');
  assert.match(src, /: 0\.5,/, 'Free (static) still shows the pieces');
  assert.match(src, /: 0\.7;/, 'Free (static) still shows the buttons');
  assert.match(src, /animated \? bob\.interpolate/);
  // every animated ramp is strictly ascending (button ramps checked for all four buttons)
  for (const m of src.matchAll(/inputRange: \[([^\]]+)\]/g)) {
    if (/\bi\b/.test(m[1])) continue;
    const r = m[1].split(',').map(x => Number(eval(x)));
    for (let k = 1; k < r.length; k++) assert.ok(r[k] > r[k - 1], `ramp not ascending: ${m[1]}`);
  }
  for (let i = 0; i < 4; i++) { const r = [0, 0.01 + i * 0.24, 0.12 + i * 0.24, 0.23 + i * 0.24, 1]; for (let k = 1; k < r.length; k++) assert.ok(r[k] > r[k - 1], `button ${i} ramp ${r}`); }
  assert.match(src, /inputRange: \[0, 0\.01 \+ i \* 0\.24, 0\.12 \+ i \* 0\.24, 0\.23 \+ i \* 0\.24, 1\]/);
  assert.doesNotMatch(src, /useThemeMode|currentThemeMode/);
});

test('B57 CP12 Royal Dark Game House layer: native, decorative, three faint gold pieces + four button glows lit in turn, ramps ascending, subscription rules', () => {
  const src = read('src/NexaDarkGame.tsx');
  assert.match(src, /export function NexaDarkGame/);
  assert.equal((src.match(/^import .*$/gm) || []).length, 3);
  assert.equal((src.match(/pointerEvents="none"/g) || []).length, 1);
  const pieces = eval(src.match(/const PIECES[^=]*= (\[[\s\S]*?\]);/)[1]);
  assert.equal(pieces.length, 3);
  assert.match(src, /const CYCLE = 6000;/);
  assert.match(src, /Animated\.delay\(CYCLE - PIECES\[idx\]\[1\]\)/);
  assert.match(src, /inputRange: \[0, 0\.01 \+ i \* 0\.24, 0\.12 \+ i \* 0\.24, 0\.23 \+ i \* 0\.24, 1\]/);
  for (let i = 0; i < 4; i++) { const r = [0, 0.01 + i * 0.24, 0.12 + i * 0.24, 0.23 + i * 0.24, 1]; for (let k = 1; k < r.length; k++) assert.ok(r[k] > r[k - 1], `button ${i} ramp ${r}`); }
  assert.match(src, /allows\('world-ambient'\)/);
  assert.match(src, /allows\('vip-spotlight'\)/);
  assert.match(src, /return \(\) => loops\.forEach\(l => l\.stop\(\)\)/);
  assert.match(src, /: 0\.6;/, 'Free (static) still shows the button glows');
  assert.match(src, /: 0\.5,/, 'Free (static) still shows the pieces');
  assert.doesNotMatch(src, /useThemeMode|currentThemeMode/, 'the dark layer never branches on the theme');
});

test('B57 CP12 wiring: game-house -> game variant in Earth Light, dark layer only in Royal Dark, other worlds untouched', () => {
  const earth = read('src/NexaEarth.tsx');
  assert.match(earth, /export type EarthVariant = 'home' \| 'dami' \| 'zeeza' \| 'money' \| 'market' \| 'yaayz' \| 'leisure' \| 'ball' \| 'kitchen' \| 'game' \| (?:'fitness' \| )?'calm'/);
  assert.match(earth, /variant === 'game' \? <EarthGameSky/);
  assert.match(earth, /variant === 'game' \? <EarthGameWater/);
  assert.match(earth, /variant === 'home' \? 0\.62 : variant === 'dami' \? 0\.55 : 0\.68/, 'game keeps the calm horizon');
  const wb = read('src/NexaWorldBackground.tsx');
  assert.match(wb, /world === 'kitchen' \? 'kitchen' : world === 'game-house' \? 'game' : (?:world === 'fitness' \? 'fitness' : )?'calm'/);
  assert.match(wb, /earthVariant === 'kitchen' \|\| earthVariant === 'game'(?: \|\| earthVariant === 'fitness')? : !cosmos/, 'readability wash kept in Earth Light');
  assert.match(wb, /earthVariant === 'kitchen' \|\| earthVariant === 'game'(?: \|\| earthVariant === 'fitness')? (?:\|\| isAccess )?\? 0\.18 : 0\}/, '0.18 dim kept in Earth Light');
  assert.match(wb, /\{!light && world === 'game-house' \? <NexaDarkGame \/> : null\}/);
  for (const other of ['NexaDarkKitchen', 'NexaDarkBall', 'NexaDarkLeisure', 'NexaDarkYaayz', 'NexaDarkMarket', 'NexaDarkMoney']) assert.match(wb, new RegExp(`<${other} />`), `${other} untouched`);
  assert.ok(wb.indexOf('<Image source') < wb.indexOf('<NexaDarkGame />') && wb.indexOf('<NexaDarkGame />') < wb.indexOf('<NexaDepthLayer'));
  assert.equal((wb.match(/<NexaDarkGame \/>/g) || []).length, 1);
  // Game House keeps its own poster; other leisure blocks never mount Game House layers and Fitness gets nothing
  assert.match(read('src/nexaWorlds.ts'), /'game-house': require\('\.\.\/assets\/worlds\/game_house_world\.jpg'\)/);
  assert.doesNotMatch(wb, /world === 'kitchen' \? <NexaDarkGame|world === 'ball-house' \? <NexaDarkGame|world === 'leisure' \? <NexaDarkGame/);
  const users = fs.readdirSync(path.join(root, 'src')).filter(f => /\.tsx$/.test(f) && !['NexaWorldBackground.tsx', 'NexaEarth.tsx', 'NexaEarthGame.tsx', 'NexaDarkGame.tsx'].includes(f));
  for (const f of users) assert.doesNotMatch(read('src/' + f), /NexaEarthGame|NexaDarkGame/, `${f} imports a Game House scene outside the world background`);
});
