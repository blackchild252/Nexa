const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

// B57 Checkpoint 19 — PROFILE block (Royal Dark gears + shield + session dots, Earth Light gears + harbour cottage, design layer).
// Sidebar order: ... Notifications (CP17) -> Search (CP18) -> Profile (CP19) -> Extensions next.

const PROFILE_FILES = ['src/app/(tabs)/profile.tsx', 'src/ThemePicker.tsx'];

test('B57 CP19 Profile is right after Search in the sidebar directory; Extensions follows', () => {
  const ids = [...read('src/homeDesign.ts').matchAll(/\['([a-z]+)','[^']+','[a-z-]+-outline'/g)].map(m => m[1]).filter(id => id !== 'subscription'); // NEXA Membership was added later; this block's order is about the other entries
  assert.deepEqual(ids.slice(9, 12), ['search', 'profile', 'extensions']);
});

test('B57 CP19 the plain inline styles on Profile and the Appearance picker go through ds(); the theme preview swatches stay fixed', () => {
  const counts = { 'src/app/(tabs)/profile.tsx': 4, 'src/ThemePicker.tsx': 5 };
  for (const f of PROFILE_FILES) {
    const src = read(f);
    const w = (src.match(/(?<![A-Za-z])(style|contentContainerStyle)=\{ds\(\{/g) || []).length;
    assert.ok(w >= counts[f], `${f}: wrapped count`);
    assert.match(src, /import \{[^}]*\bds\b[^}]*\} from ['"][./]+theme['"]/, `${f} imports ds`);
  }
  // Profile has no plain inline style object left
  assert.equal((read(PROFILE_FILES[0]).match(/(?<![A-Za-z])(style|contentContainerStyle)=\{\{/g) || []).length, 0);
  // ThemePicker: the 8 remaining raw styles are the 7-piece mini-preview drawing (a preview must not change with the active theme)
  // plus one pure-layout `{ flex: 1 }` wrapper, where ds() would change nothing (same call as Home in CP14)
  const tp = read('src/ThemePicker.tsx');
  const raw = (tp.match(/(?<![A-Za-z])style=\{\{/g) || []).length;
  assert.equal(raw, 9); // the 8 mini-preview styles plus the half-light overlay on the Default tile (M4502)
  assert.ok(tp.includes('<View style={{ flex: 1 }}>'));
  for (const k of ['colors={o.sky}', 'backgroundColor: o.gold', 'backgroundColor: o.water', 'backgroundColor: o.land', 'backgroundColor: o.forest', "sky: ['#EAF5FF', '#FFFFFF']", "sky: ['#05020C', '#3A1436']"])
    assert.ok(tp.includes(k), `missing ${k}`);
});

test('B57 CP19 ds() is not stacked on token radius/typography; no new bare colour literals on Profile', () => {
  for (const f of PROFILE_FILES) {
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
  }
  // Profile itself: every colour literal is already in tc()
  const bare = (read(PROFILE_FILES[0]).match(/(?<!tc\()['"]#[0-9a-fA-F]{3,8}['"]/g) || []);
  assert.deepEqual(bare, []);
});

test('B57 CP19 regression: sessions, revoke-others, sign-out, navigation links and the Appearance switch are intact', () => {
  const src = read('src/app/(tabs)/profile.tsx');
  for (const k of [
    'const loadRequest=useRef(0)', 'const requestId=++loadRequest.current', 'requestId!==loadRequest.current', 'requestId===loadRequest.current',
    "authedFetch('/api/auth/sessions')", "authedFetch('/api/auth/sessions/others',{method:'DELETE'})", "authedFetch('/api/auth/logout',{method:'POST'})",
    'setNexaToken(undefined)', 'router.push(navigationForSubscription() as any)', "router.push('/extensions' as any)", "router.push('/developer' as any)",
    '<ThemePicker preference={preference} onSelect={setPreference}/>', 'Sign out other sessions', 'world="profile"', 'Privacy & discovery', 'Export my data', 'Close account',
  ]) assert.ok(src.includes(k), `missing ${k}`);
  const tp = read('src/ThemePicker.tsx');
  for (const k of ['accessibilityRole="radiogroup"', 'accessibilityRole="radio"', 'accessibilityState={{ selected: active }}', 'onPress={() => onSelect(o.id)}', 'minHeight: 48'])
    assert.ok(tp.includes(k), `ThemePicker missing ${k}`);
});

test('B57 CP19 Earth Light readability on Profile: titles, muted text, picker labels, checkmark / selected frame and the red sign-out text (>= 4.5:1)', () => {
  const t = read('src/theme.ts');
  const light = t.slice(t.indexOf('const lightColors'), t.indexOf('const lightTheme'));
  const pick = k => light.match(new RegExp(`\\b${k}: '(#[0-9A-Fa-f]{6})'`))[1];
  const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(x => x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  assert.ok(ratio(pick('text'), pick('card')) >= 4.5, 'section titles on card');
  assert.ok(ratio(pick('muted'), pick('card')) >= 4.5, 'muted copy on card');
  assert.ok(ratio(pick('text'), pick('background')) >= 4.5, 'page title');
  assert.ok(ratio(pick('textSecondary'), pick('background')) >= 4.5, 'page subtitle');
  assert.ok(ratio(pick('text'), pick('surfaceElevated')) >= 4.5, 'picker title on tile');
  assert.ok(ratio(pick('muted'), pick('surfaceElevated')) >= 4.5, 'picker sub-label on tile');
  assert.ok(ratio(pick('brightGold'), pick('surfaceElevated')) >= 3, 'selected checkmark / frame on tile (graphic, 3:1)');
  const red = t.match(/'#ef9b9b': '(#[0-9A-Fa-f]{6})'/)[1];
  assert.ok(ratio(red, pick('card')) >= 4.5, 'sign-out text on card');
});

test('B57 CP19 Profile keeps its own world; Earth Light wiring adds a profile variant without touching the older chain tails', () => {
  const earth = read('src/NexaEarth.tsx');
  assert.match(earth, /import \{ EarthProfileSky, EarthProfileWater \} from '\.\/NexaEarthProfile'/);
  assert.match(earth, /'search' \| 'profile'(?: \| 'extensions')?(?: \| 'developer')?(?: \| 'subscription')?(?: \| 'auth')?(?: \| 'staff')?(?: \| 'disputes')?;/);
  assert.match(earth, /variant === 'profile' \? <EarthProfileSky width=\{width\} height=\{height\} \/> : null/);
  assert.match(earth, /variant === 'profile' \? <EarthProfileWater width=\{width\} horizonY=\{horizonY\} \/> : null/);
  assert.match(earth, /variant === 'profile'(?: \|\| variant === 'extensions')?(?: \|\| variant === 'developer')?(?: \|\| isAccess)? \? Math\.max\(dim, 0\.18\) : dim/, 'profile keeps the 0.18 dim, applied inside NexaEarth');
  const wb = read('src/NexaWorldBackground.tsx');
  assert.match(wb, /(?:world === 'developer' \? 'developer' : )?(?:world === 'extensions' \? 'extensions' : )?world === 'profile' \? 'profile' : world === 'search' \? 'search' : world === 'notifications' \? 'notifications' : world === 'home'/);
  assert.match(wb, /world === 'fitness' \? 'fitness' : 'calm'/);
  assert.match(wb, /earthVariant === 'fitness' : !cosmos\) \|\| \(light && (?:\(earthVariant === 'profile' \|\| earthVariant === 'extensions'(?: \|\| earthVariant === 'developer')?(?: \|\| isAccess)?\)|earthVariant === 'profile')\)/, 'readability wash kept for Profile');
  assert.match(wb, /earthVariant === 'fitness' (?:\|\| isAccess )?\? 0\.18 : 0\}/);
  assert.match(read('src/nexaWorlds.ts'), /profile: require\('\.\.\/assets\/worlds\/zeeza_world\.jpg'\),/);
  assert.match(read('src/app/(tabs)/search.tsx'), /world="search"/);
});

test('B57 CP19 Royal Dark Profile layer mounts only in Royal Dark for the profile world, over the poster and under the depth layer; every dark layer still mounts for one world', () => {
  const wb = read('src/NexaWorldBackground.tsx');
  assert.match(wb, /import \{ NexaDarkProfile \} from '\.\/NexaDarkProfile'/);
  assert.match(wb, /\{!light && world === 'profile' \? <NexaDarkProfile \/> : null\}/);
  assert.equal((wb.match(/<NexaDarkProfile/g) || []).length, 1);
  assert.ok(wb.indexOf('<Image source={source}') < wb.indexOf('<NexaDarkProfile'));
  assert.ok(wb.indexOf('<NexaDarkProfile') < wb.indexOf('<NexaDepthLayer'));
  const expected = { NexaDarkHome: 'home', NexaDarkDami: 'dami', NexaDarkZeeza: 'zeeza', NexaDarkNotifications: 'notifications', NexaDarkMoney: 'sky-money', NexaDarkMarket: 'dream-marketplace', NexaDarkYaayz: 'yaayz', NexaDarkLeisure: 'leisure', NexaDarkBall: 'ball-house', NexaDarkKitchen: 'kitchen', NexaDarkGame: 'game-house', NexaDarkFitness: 'fitness', NexaDarkSearch: 'search', NexaDarkProfile: 'profile' };
  for (const [c, world] of Object.entries(expected)) {
    const mounts = [...wb.matchAll(new RegExp(`world === '([a-z-]+)' \\? <${c} />`, 'g'))].map(m => m[1]);
    assert.deepEqual(mounts, [world], c);
  }
});

test('B57 CP19 new layers are decorative, native, touch-free and follow the subscription motion rules', () => {
  for (const f of ['src/NexaDarkProfile.tsx', 'src/NexaEarthProfile.tsx']) {
    const src = read(f);
    assert.match(src, /pointerEvents="none"/, f);
    assert.match(src, /accessible=\{false\}/, f);
    assert.doesNotMatch(src, /Touchable|Pressable|onPress|Image\b|require\(/, f);
    assert.doesNotMatch(src, /useNativeDriver: false/, f);
    assert.ok((src.match(/useNativeDriver: true/g) || []).length >= 2, f);
    assert.match(src, /allows\('world-ambient'\)/, f);
    assert.match(src, /allows\('vip-spotlight'\)/, f);
    assert.match(src, /v\.stopAnimation\(\); v\.setValue\(0\)/, f);
    assert.match(src, /loops\.forEach\(l => l\.stop\(\)\)/, f);
  }
  assert.doesNotMatch(read('src/NexaEarthProfile.tsx'), /from '\.\/NexaDark/);
  assert.doesNotMatch(read('src/NexaDarkProfile.tsx'), /from '\.\/NexaEarth/);
});

test('B57 CP19 ramps are strictly ascending; the gears turn in opposite directions; the flag swings from a zero-size pivot', () => {
  const asc = (r, n) => { for (let i = 1; i < r.length; i++) assert.ok(r[i] > r[i - 1], `${n}: ${r}`); };
  for (let i = 0; i < 3; i++) asc([0, 0.02 + i * 0.3, 0.1 + i * 0.3, 0.18 + i * 0.3, 1], `dot ${i}`);
  assert.match(read('src/NexaDarkProfile.tsx'), /inputRange: \[0, 0\.02 \+ i \* 0\.3, 0\.1 \+ i \* 0\.3, 0\.18 \+ i \* 0\.3, 1\]/);
  asc([0, 0.3, 0.4, 0.5, 1], 'spark'); asc([0, 0.25, 0.5, 0.75, 1], 'flag'); asc([0, 0.5, 1], 'glow');
  const e = read('src/NexaEarthProfile.tsx');
  assert.match(e, /inputRange: \[0, 0\.3, 0\.4, 0\.5, 1\]/);
  assert.match(e, /inputRange: \[0, 0\.25, 0\.5, 0\.75, 1\], outputRange: \['-8deg', '6deg', '-8deg', '6deg', '-8deg'\]/);
  assert.match(e, /inputRange: \[0, 0\.5, 1\], outputRange: \[0\.6, 1, 0\.6\]/);
  for (const f of ['src/NexaDarkProfile.tsx', 'src/NexaEarthProfile.tsx']) {
    const src = read(f);
    assert.match(src, /outputRange: \['0deg', '360deg'\]/, `${f}: gear A turns forward`);
    assert.match(src, /outputRange: \['360deg', '0deg'\]/, `${f}: gear B turns backward`);
  }
  // flag pivot: zero-size, so it swings instead of sliding
  assert.match(e, /width: 0, height: 0, transform: \[\{ rotate: flag \}\]/);
});

test('B57 CP19 Search, Royal Dark cosmos and the other blocks are untouched', () => {
  assert.doesNotMatch(read('src/NexaEarthSearch.tsx'), /Profile/);
  assert.doesNotMatch(read('src/NexaDarkSearch.tsx'), /Profile/);
  assert.match(read('src/NexaEarth.tsx'), /variant === 'search' \? <EarthSearchSky /);
  assert.match(read('src/nexaWorlds.ts'), /NEXA_COSMOS_WORLDS: readonly NexaWorld\[\] = \['home', 'dami'\]/);
});
