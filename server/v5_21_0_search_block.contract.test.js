const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

// B57 Checkpoint 18 — SEARCH block (Royal Dark magnifier + result dots, Earth Light magnifier + lighthouse, design layer, contrast fix).
// Sidebar order: ... Fitness (CP13) -> Notifications (CP17) -> Search (CP18) -> Profile next.

const SEARCH_FILES = ['src/UnifiedSearch.tsx'];

test('B57 CP18 Search is right after Notifications in the sidebar directory; Profile follows', () => {
  const ids = [...read('src/homeDesign.ts').matchAll(/\['([a-z]+)','[^']+','[a-z-]+-outline'/g)].map(m => m[1]).filter(id => id !== 'subscription'); // NEXA Membership was added later; this block's order is about the other entries
  assert.deepEqual(ids.slice(8, 11), ['notifications', 'search', 'profile']);
});

test('B57 CP18 no plain inline style object on the Search screen bypasses ds() (Earth Light design layer)', () => {
  let wrapped = 0;
  for (const f of SEARCH_FILES) {
    const src = read(f);
    assert.equal((src.match(/(?<![A-Za-z])(style|contentContainerStyle)=\{\{/g) || []).length, 0, `${f}: inline style not wrapped in ds()`);
    const w = (src.match(/(?<![A-Za-z])(style|contentContainerStyle)=\{ds\(\{/g) || []).length;
    if (w) assert.match(src, /import \{[^}]*\bds\b[^}]*\} from ['"][./]+theme['"]/, `${f} uses ds() without importing it`);
    wrapped += w;
  }
  assert.equal(wrapped, 22, 'all 22 plain inline styles found in the audit are wrapped');
});

test('B57 CP18 ds() is not stacked on token radius/typography; no bare colour literals on the Search screen', () => {
  for (const f of SEARCH_FILES) {
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

test('B57 CP18 regression: the wrapper-only edit kept the stale-response guard, filters, labels, navigation and authorization copy', () => {
  const src = read('src/UnifiedSearch.tsx');
  for (const k of [
    'const searchRequest=useRef(0)', 'const requestId=++searchRequest.current', 'requestId!==searchRequest.current',
    "authedFetch(`/api/search?q=${encodeURIComponent(term)}", '&limit=30', 'term.length<2',
    "['people','Zeeza']", "people:'ZEEZA'", "['yaayz','Yaayz']", "['money','Sky Money']",
    'Search Zeeza, groups, Dream Marketplace, Yaayz, Sky Money', 'Only information you are authorized to see is searchable.',
    'navigationForSearchResult(r)', 'router.push(target as any)', 'disabled={!navigationForSearchResult(r)}',
    'accessibilityRole="button"', 'accessibilityLabel={`Open ${r.title}`}', 'TAP TO OPEN', 'No authorized results found.', 'onPress={onClose}',
  ]) assert.ok(src.includes(k), `missing ${k}`);
  // the scene must show through: the root no longer paints a solid background, so the poster / Earth scene is visible
  assert.match(src, /<View style=\{ds\(\{flex:1,paddingTop:24\}\)\}>/);
  assert.doesNotMatch(src, /flex:1,backgroundColor:theme\.colors\.background/);
});

test('B57 CP18 Earth Light readability on Search: gold-role text, active pill, body, muted, typed text and placeholder (>= 4.5:1); Royal Dark gold is unchanged', () => {
  const t = read('src/theme.ts');
  const dark = t.slice(0, t.indexOf('const lightColors')); // the Royal Dark palette sits above the Earth Light one
  const light = t.slice(t.indexOf('const lightColors'), t.indexOf('const lightTheme'));
  const pick = (blk, k) => blk.match(new RegExp(`\\b${k}: '(#[0-9A-Fa-f]{6})'`))[1];
  const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(x => x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratioHex = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const L = k => pick(light, k);
  // Royal Dark: the new token is exactly the old gold, so nothing changes there
  assert.equal(pick(dark, 'goldText'), pick(dark, 'gold'));
  // Earth Light: the old gold text was 2.4:1 (unreadable); the new token is water blue
  assert.ok(ratioHex(L('gold'), L('surface')) < 3, 'documents why the token exists');
  assert.ok(ratioHex(L('goldText'), L('surface')) >= 4.5, 'section labels / TAP TO OPEN on card');
  assert.ok(ratioHex(L('goldText'), L('background')) >= 4.5, 'Close key and section labels on the page');
  assert.ok(ratioHex(L('black'), L('goldText')) >= 4.5, 'active filter pill text on the pill');
  assert.ok(ratioHex(L('textSecondary'), L('surfacePressed')) >= 4.5, 'inactive filter pill text');
  assert.ok(ratioHex(L('text'), L('surface')) >= 4.5, 'result title / typed text on input');
  assert.ok(ratioHex(L('muted'), L('surface')) >= 4.5, 'snippet text on card');
  const ph = t.match(/'#687180': '(#[0-9A-Fa-f]{6})'/)[1];
  assert.ok(ratioHex(ph, L('surface')) >= 4.5, 'placeholder text on the search input');
  const err = t.match(/'#ef8d8d': '(#[0-9A-Fa-f]{6})'/)[1];
  assert.ok(ratioHex(err, L('background')) >= 4.5, 'error text on the page');
  // Search uses the token in exactly its four gold-role places and no raw gold text/fill any more
  const src = read('src/UnifiedSearch.tsx');
  assert.equal((src.match(/theme\.colors\.goldText/g) || []).length, 4);
  assert.doesNotMatch(src, /theme\.colors\.gold(?![A-Za-z])/);
});

test('B57 CP18 Search is its own world (same poster as before, own prompt); Profile keeps `profile` (its own scene since CP19)', () => {
  const w = read('src/nexaWorlds.ts');
  assert.match(w, /\| 'search'\n  \| 'profile'(?:\n  \| 'extensions')?(?:\n  \| 'developer')?(?:\n  \| 'subscription')?(?:\n  \| 'auth')?(?:\n  \| 'staff')?(?:\n  \| 'disputes')?;/);
  assert.match(w, /search: require\('\.\.\/assets\/worlds\/zeeza_world\.jpg'\),/);
  assert.match(w, /profile: require\('\.\.\/assets\/worlds\/zeeza_world\.jpg'\),/);
  assert.match(w, /search: '[^']+'/);
  assert.match(w, /NEXA_COSMOS_WORLDS: readonly NexaWorld\[\] = \['home', 'dami'\]/);
  assert.match(read('src/app/(tabs)/search.tsx'), /<NexaWorldBackground world="search"><UnifiedSearch onClose=\{nexaGoBack\} \/><\/NexaWorldBackground>/);
  assert.match(read('src/app/(tabs)/profile.tsx'), /world="profile"/);
  const wb = read('src/NexaWorldBackground.tsx');
  assert.doesNotMatch(wb, /world === 'search' \? <NexaDarkProfile/);
  assert.match(wb, /world === 'fitness' \? 'fitness' : 'calm'/);
});

test('B57 CP18 Earth Light wiring: search variant added, older chain tails kept, readability wash + 0.18 dim kept', () => {
  const earth = read('src/NexaEarth.tsx');
  assert.match(earth, /import \{ EarthSearchSky, EarthSearchWater \} from '\.\/NexaEarthSearch'/);
  assert.match(earth, /'calm' \| 'notifications' \| 'search'(?: \| 'profile')?(?: \| 'extensions')?(?: \| 'developer')?(?: \| 'subscription')?(?: \| 'auth')?(?: \| 'staff')?(?: \| 'disputes')?;/);
  assert.match(earth, /variant === 'search' \? <EarthSearchSky width=\{width\} height=\{height\} \/> : null/);
  assert.match(earth, /variant === 'search' \? <EarthSearchWater width=\{width\} horizonY=\{horizonY\} \/> : null/);
  const wb = read('src/NexaWorldBackground.tsx');
  assert.match(wb, /world === 'search' \? 'search' : world === 'notifications' \? 'notifications' : world === 'home' \? 'home'/);
  assert.match(wb, /earthVariant === 'calm' \|\| earthVariant === 'search' \|\| earthVariant === 'zeeza'/);
  assert.equal((wb.match(/earthVariant === 'search'/g) || []).length, 2, 'once in the readability wash, once in the dim');
  assert.match(wb, /earthVariant === 'fitness' : !cosmos/);
  assert.match(wb, /earthVariant === 'fitness' (?:\|\| isAccess )?\? 0\.18 : 0\}/);
});

test('B57 CP18 Royal Dark Search layer mounts only in Royal Dark for the search world, over the poster and under the depth layer; every dark layer still mounts for one world', () => {
  const wb = read('src/NexaWorldBackground.tsx');
  assert.match(wb, /import \{ NexaDarkSearch \} from '\.\/NexaDarkSearch'/);
  assert.match(wb, /\{!light && world === 'search' \? <NexaDarkSearch \/> : null\}/);
  assert.equal((wb.match(/<NexaDarkSearch/g) || []).length, 1);
  assert.ok(wb.indexOf('<Image source={source}') < wb.indexOf('<NexaDarkSearch'));
  assert.ok(wb.indexOf('<NexaDarkSearch') < wb.indexOf('<NexaDepthLayer'));
  const expected = { NexaDarkHome: 'home', NexaDarkDami: 'dami', NexaDarkZeeza: 'zeeza', NexaDarkNotifications: 'notifications', NexaDarkMoney: 'sky-money', NexaDarkMarket: 'dream-marketplace', NexaDarkYaayz: 'yaayz', NexaDarkLeisure: 'leisure', NexaDarkBall: 'ball-house', NexaDarkKitchen: 'kitchen', NexaDarkGame: 'game-house', NexaDarkFitness: 'fitness', NexaDarkSearch: 'search' };
  for (const [c, world] of Object.entries(expected)) {
    const mounts = [...wb.matchAll(new RegExp(`world === '([a-z-]+)' \\? <${c} />`, 'g'))].map(m => m[1]);
    assert.deepEqual(mounts, [world], c);
  }
});

test('B57 CP18 new layers are decorative, native, touch-free and follow the subscription motion rules', () => {
  for (const f of ['src/NexaDarkSearch.tsx', 'src/NexaEarthSearch.tsx']) {
    const src = read(f);
    assert.match(src, /pointerEvents="none"/, f);
    assert.match(src, /accessible=\{false\}/, f);
    assert.doesNotMatch(src, /Touchable|Pressable|onPress|Image\b|require\(/, f);
    assert.doesNotMatch(src, /useNativeDriver: false/, f);
    assert.ok((src.match(/useNativeDriver: true/g) || []).length >= 2, f);
    assert.match(src, /allows\('world-ambient'\)/, f);
    assert.match(src, /allows\('vip-spotlight'\)/, f);
    assert.match(src, /stopAnimation\(\); (?:\w+\.)?setValue\(0\)|v\.stopAnimation\(\); v\.setValue\(0\)/, f);
    assert.match(src, /loops?\.(?:forEach\(l => l\.stop\(\)\)|stop\(\))/, f);
  }
  assert.doesNotMatch(read('src/NexaEarthSearch.tsx'), /from '\.\/NexaDark/);
  assert.doesNotMatch(read('src/NexaDarkSearch.tsx'), /from '\.\/NexaEarth/);
});

test('B57 CP18 every interpolation ramp is strictly ascending and the beam swings from a zero-size pivot', () => {
  const asc = (r, n) => { for (let i = 1; i < r.length; i++) assert.ok(r[i] > r[i - 1], `${n}: ${r}`); };
  // Royal Dark result dots i = 0..2: [0, .02+i*.3, .1+i*.3, .18+i*.3, 1]
  for (let i = 0; i < 3; i++) asc([0, 0.02 + i * 0.3, 0.1 + i * 0.3, 0.18 + i * 0.3, 1], `hit ${i}`);
  assert.match(read('src/NexaDarkSearch.tsx'), /inputRange: \[0, 0\.02 \+ i \* 0\.3, 0\.1 \+ i \* 0\.3, 0\.18 \+ i \* 0\.3, 1\]/);
  // magnifier drift bob and both glints / beam / lamp
  asc([0, 0.5, 1], 'bob'); asc([0, 0.3, 0.4, 0.5, 1], 'glint'); asc([0, 0.25, 0.5, 0.75, 1], 'lamp');
  assert.match(read('src/NexaDarkSearch.tsx'), /inputRange: \[0, 0\.5, 1\], outputRange: \[0, 10, 0\]/);
  assert.match(read('src/NexaEarthSearch.tsx'), /inputRange: \[0, 0\.3, 0\.4, 0\.5, 1\]/);
  assert.match(read('src/NexaEarthSearch.tsx'), /inputRange: \[0, 0\.25, 0\.5, 0\.75, 1\]/);
  assert.match(read('src/NexaEarthSearch.tsx'), /inputRange: \[0, 0\.5, 1\], outputRange: \['-16deg', '16deg', '-16deg'\]/);
  // beam pivot: zero-size, so it sweeps instead of sliding
  assert.match(read('src/NexaEarthSearch.tsx'), /width: 0, height: 0, transform: \[\{ rotate: angle \}\]/);
});
