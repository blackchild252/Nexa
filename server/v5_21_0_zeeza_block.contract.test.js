const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

// B57 Checkpoint 5 — ZEEZA block (Earth Light scene layers + design layer on every Zeeza screen).
// Sidebar order: Home (CP2) -> Dami (CP4) -> Zeeza (CP5) -> Sky Money next.

const ZEEZA_FILES = [
  'src/app/(tabs)/zeeza.tsx', 'src/ZeezaInbox.tsx', 'src/FriendsScreen.tsx', 'src/ZeezaChase.tsx', 'src/ZeezaProfile.tsx',
  'src/ZeezaThreadScreen.tsx', 'src/RoomScreen.tsx', 'src/GroupCallScreen.tsx', 'src/CallScreen.tsx',
  'src/app/zeeza/share/[token].tsx', 'src/app/zeeza/inbox.tsx',
];
const lum = h => { const n = parseInt(h.slice(1), 16); const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(n >> 16 & 255) + 0.7152 * f(n >> 8 & 255) + 0.0722 * f(n & 255); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test('B57 CP5 Zeeza is third in the sidebar directory, right after Dami', () => {
  const ids = [...read('src/homeDesign.ts').matchAll(/\['([a-z]+)','[^']+','[a-z-]+-outline'/g)].map(m => m[1]);
  assert.deepEqual(ids.slice(0, 4), ['home', 'dami', 'zeeza', 'money']);
});

test('B57 CP5 no inline style object on any Zeeza screen bypasses ds() (Earth Light design layer)', () => {
  let wrapped = 0;
  for (const f of ZEEZA_FILES) {
    const src = read(f);
    const plain = src.match(/(?<![A-Za-z])(style|contentContainerStyle)=\{\{/g) || [];
    assert.equal(plain.length, 0, `${f}: ${plain.length} inline style(s) not wrapped in ds()`);
    const w = (src.match(/(?<![A-Za-z])(style|contentContainerStyle)=\{ds\(\{/g) || []).length;
    if (w) assert.match(src, /import \{[^}]*\bds\b[^}]*\} from ['"][./]+theme['"]/, `${f} uses ds() without importing it`);
    wrapped += w;
  }
  assert.ok(wrapped >= 46, `all audited inline styles are wrapped; found ${wrapped}`);
});

test('B57 CP5 ds() is not stacked on token radius/typography in the Zeeza inline styles', () => {
  for (const f of ZEEZA_FILES) {
    const src = read(f);
    const inline = src.match(/=\{ds\(\{[^]*?\}\)\}/g) || [];
    for (const chunk of inline) assert.doesNotMatch(chunk, /theme\.radius|theme\.typography/, `${f}: token radius inside ds()`);
  }
});

test('B57 CP5 Zeeza colour literals are theme-aware (only #fff on solid buttons and the light-only accept green stay literal)', () => {
  const theme = read('src/theme.ts');
  const table = new Function(`return (${theme.match(/const LIGHT_LITERALS[^=]*= (\{[\s\S]*?\n\});/)[1]})`)();
  const norm = c => c.replace(/\s+/g, '').toLowerCase();
  for (const f of ZEEZA_FILES.concat('src/socialStyles.ts')) {
    const src = read(f);
    for (const m of src.matchAll(/tc\(['"]([^'"]+)['"]\)/g)) {
      const k = norm(m[1]);
      assert.ok(table[k] || /^rgba\((255,215,0|212,175,55),[0-9.]+\)$/.test(k), `${f}: ${m[1]} has no Earth Light mapping`);
    }
    const bare = (src.match(/(?<!tc\()['"]#[0-9a-fA-F]{3,8}['"]/g) || []).filter(x => !/^['"](#fff|#237A48)['"]$/i.test(x));
    assert.deepEqual(bare, [], `${f}: bare colour literal ${bare.join(', ')}`);
  }
  // white text only ever sits on the error (red) token: 5.4:1 in Earth Light, and it is the original dark look
  assert.ok(ratio('#FFFFFF', '#C0392B') >= 4.5);
});

test('B57 CP5 call screen: Decline/Accept text is readable in Earth Light and unchanged in Royal Dark', () => {
  const src = read('src/CallScreen.tsx');
  assert.match(src, /onSolid:\{color:theme\.colors\.black,fontWeight:'900'\}/);
  assert.match(src, /<Text style=\{styles\.onSolid\}>Decline<\/Text>/);
  assert.match(src, /<Text style=\{styles\.onSolid\}>Accept<\/Text>/);
  assert.match(src, /dark:\{color:tc\('#000'\),fontWeight:'900'\}/, 'the original text style is kept for the neutral controls');
  assert.match(src, /accept:\{backgroundColor:currentThemeMode\(\)==='light'\?'#237A48':theme\.colors\.success,/);
  const th = read('src/theme.ts');
  assert.match(th, /^\s*black: '#000000',/m);          // Royal Dark: on-solid text is the original black
  assert.match(th, /^\s*black: '#FFFFFF',/m);          // Earth Light: white
  assert.ok(ratio('#FFFFFF', '#C0392B') >= 4.5, 'white on Earth Light red');
  assert.ok(ratio('#FFFFFF', '#237A48') >= 4.5, 'white on Earth Light accept green');
  assert.ok(ratio('#2A2118', '#C0392B') < 3, 'documents the bug the old text style had on red');
  assert.match(src, /import \{ currentThemeMode \} from '\.\/themeMode';/);
});

test('B57 CP5 the call actions themselves are unchanged (accept, decline, end, mute, camera, flip)', () => {
  const src = read('src/CallScreen.tsx');
  for (const n of ['onPress={decline}', 'onPress={accept}', 'onPress={close}', 'onPress={toggleMute}', 'onPress={toggleCamera}', 'onPress={flipCamera}']) assert.ok(src.includes(n), n);
});

test('B57 CP5 Zeeza section keys use the design-layer icons (filled when active in Earth Light)', () => {
  const src = read('src/app/(tabs)/zeeza.tsx');
  assert.match(src, /import \{[^}]*\bdi\b[^}]*\} from '\.\.\/\.\.\/theme'/);
  for (const n of ["di('chatbubbles-outline', section==='inbox')", "di('people-outline', section==='friends')", "di('compass-outline', section==='chase')", "di('person-outline')"]) assert.ok(src.includes(n), n);
  assert.match(src, /<ProfilePhotoIcon size=\{22\} icon="person-circle-outline"/, 'the unfocused Profile key keeps the outline icon as its fallback and shows the photo when there is one');
  const dsrc = read('src/themeDesign.ts');
  assert.match(dsrc, /'chatbubbles', 'compass'/);
});

test('B57 CP5 Earth Light Zeeza layers are decorative, non-interactive and motion-gated', () => {
  const src = read('src/NexaEarthZeeza.tsx');
  assert.match(src, /export function EarthZeezaSky/);
  assert.match(src, /export function EarthZeezaWater/);
  assert.equal((src.match(/pointerEvents="none"/g) || []).length, 2);
  assert.equal((src.match(/accessible=\{false\}/g) || []).length, 2);
  assert.match(src, /allows\('world-ambient'\)/);
  assert.match(src, /allows\('vip-spotlight'\)/);
  assert.doesNotMatch(src, /onPress|TouchableOpacity|Pressable|onTouch/);
  assert.doesNotMatch(src, /#FFD700|#D4AF37|rgba\(255,215,0/i, 'no Royal Dark colours in the light scene');
  assert.ok((src.match(/if \(!animated\)/g) || []).length >= 2, 'both layers reset to static');
  assert.ok((src.match(/return \(\) => /g) || []).length >= 2, 'both layers stop their loops on unmount');
});

test('B57 CP5 typing-dot animation ranges always ascend (a descending inputRange crashes at runtime)', () => {
  for (const k of [0, 1, 2]) {
    const a = k * 0.22;
    const range = [0, a, a + 0.18, a + 0.36, 1];
    for (let i = 1; i < range.length; i++) assert.ok(range[i] >= range[i - 1], `dot ${k}: ${range}`);
  }
  assert.match(read('src/NexaEarthZeeza.tsx'), /const a = k \* 0\.22;/);
});

test('B57 CP5 Zeeza layers mount only for the zeeza variant; Home, Dami and calm worlds are unchanged', () => {
  const earth = read('src/NexaEarth.tsx');
  assert.match(earth, /export type EarthVariant = 'home' \| 'dami' \| 'zeeza' \| (?:'money' \| )?(?:'market' \| )?(?:'yaayz' \| )?(?:'leisure' \| )?(?:'ball' \| )?(?:'kitchen' \| )?(?:'game' \| )?(?:'fitness' \| )?'calm'(?: \| 'notifications')?(?: \| 'search')?(?: \| 'profile')?(?: \| 'extensions')?(?: \| 'developer')?(?: \| 'subscription')?(?: \| 'auth')?(?: \| 'staff')?(?: \| 'disputes')?;/);
  assert.match(earth, /variant === 'zeeza' \? <EarthZeezaSky/);
  assert.match(earth, /variant === 'zeeza' \? <EarthZeezaWater/);
  for (const n of ["variant === 'home' ? <EarthHomeSky", "variant === 'home' ? <EarthHomeShore", "variant === 'home' ? <EarthHomeWater", "variant === 'dami' ? <EarthDamiSky", "variant === 'dami' ? <EarthDamiWater"]) assert.ok(earth.includes(n), n);
  assert.match(earth, /variant === 'home' \? 0\.62 : variant === 'dami' \? 0\.55 : 0\.68/, 'Zeeza keeps the calm, list-friendly horizon');
});

test('B57 CP5 Zeeza keeps the readability wash in Earth Light; Royal Dark still uses the Zeeza poster', () => {
  const bg = read('src/NexaWorldBackground.tsx');
  assert.match(bg, /world === 'zeeza' \? 'zeeza' : (?:world === 'sky-money' \? 'money' : )?(?:world === 'dream-marketplace' \? 'market' : )?(?:world === 'yaayz' \? 'yaayz' : )?(?:world === 'leisure' \? 'leisure' : )?(?:world === 'ball-house' \? 'ball' : )?(?:world === 'kitchen' \? 'kitchen' : )?(?:world === 'game-house' \? 'game' : )?(?:world === 'fitness' \? 'fitness' : )?'calm'/);
  assert.match(bg, /earthVariant === 'calm'(?: \|\| earthVariant === 'search')? \|\| earthVariant === 'zeeza'/);
  assert.match(bg, /!light && source \? <Image source=\{source\}/);
  assert.match(read('src/nexaWorlds.ts'), /zeeza: require\('\.\.\/assets\/worlds\/zeeza_world\.jpg'\)/);
});

test('B57 CP5 Zeeza behaviour is preserved: sections, deep links, messaging and friend-request calls intact', () => {
  const tab = read('src/app/(tabs)/zeeza.tsx');
  for (const n of ["requestedSectionKey === 'friends' ? 'friends' : requestedSectionKey === 'lifestyle' ? 'lifestyle' : requestedSectionKey === 'chase' || requestedSectionKey === 'explore' ? 'chase' : 'inbox'", 'zeeza.openThreadById(String(requestedThreadId))', 'zeeza.openRoomById(String(requestedRoomId))', "router.push('/zeeza/profile' as any)", 'zeeza.openDm(f)', 'accessibilityLabel="Open Zeeza profile"']) assert.ok(tab.includes(n), n);
  assert.match(tab, /requestedSectionKey === 'explore' \? 'chase'/);
  assert.match(read('src/app/zeeza/share/[token].tsx'), /apiFriendRequestByZeezaShare/);
});
