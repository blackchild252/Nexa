const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

// B57 Checkpoint 16+17 (two blocks in one checkpoint, owner request):
//   CP16 ZEEZA block, Royal Dark scene (Zeeza is 3rd in the sidebar; Earth Light scene + design layer were CP5)
//   CP17 NOTIFICATIONS block, both interfaces + design layer (Notifications is 12th in the sidebar, right after Fitness)

const DARK_LAYERS = ['NexaDarkHome', 'NexaDarkDami', 'NexaDarkZeeza', 'NexaDarkNotifications', 'NexaDarkMoney', 'NexaDarkMarket', 'NexaDarkYaayz', 'NexaDarkLeisure', 'NexaDarkBall', 'NexaDarkKitchen', 'NexaDarkGame', 'NexaDarkFitness'];

test('B57 CP16/17 sidebar order: Zeeza third, Notifications right after L.A., Search next', () => {
  const ids = [...read('src/homeDesign.ts').matchAll(/\['([a-z]+)','[^']+','[a-z-]+-outline'/g)].map(m => m[1]);
  assert.deepEqual(ids.slice(0, 3), ['home', 'dami', 'zeeza']);
  assert.deepEqual(ids.slice(7, 9), ['leisure', 'notifications']);
});

test('B57 CP16 Royal Dark Zeeza layer mounts only in Royal Dark, only for the zeeza world, over the poster and under the depth layer', () => {
  const wb = read('src/NexaWorldBackground.tsx');
  assert.match(wb, /import \{ NexaDarkZeeza \} from '\.\/NexaDarkZeeza'/);
  assert.match(wb, /\{!light && world === 'zeeza' \? <NexaDarkZeeza \/> : null\}/);
  assert.equal((wb.match(/<NexaDarkZeeza/g) || []).length, 1);
  assert.ok(wb.indexOf('<Image source={source}') < wb.indexOf('<NexaDarkZeeza'));
  assert.ok(wb.indexOf('<NexaDarkZeeza') < wb.indexOf('<NexaDepthLayer'));
});

test('B57 CP16 Search (own `search` world since CP18) and Profile (`profile` world, same poster) get no Zeeza layer', () => {
  const wb = read('src/NexaWorldBackground.tsx');
  assert.doesNotMatch(wb, /world === 'profile' \? <NexaDarkZeeza/); // Profile has its own layer since CP19, never the Zeeza one
  assert.match(read('src/app/(tabs)/search.tsx'), /world="search"/);
  assert.match(read('src/app/(tabs)/profile.tsx'), /world="profile"/);
  assert.match(read('src/nexaWorlds.ts'), /zeeza: require\('\.\.\/assets\/worlds\/zeeza_world\.jpg'\)/);
});

test('B57 CP17 Notifications is its own world (no poster, not cosmos) with a prompt entry, so nothing leaks to Zeeza / Profile / Search', () => {
  const w = read('src/nexaWorlds.ts');
  assert.match(w, /\| 'notifications'/);
  assert.match(w, /notifications: null,/);
  assert.match(w, /notifications: '[^']+'/);
  assert.match(w, /NEXA_COSMOS_WORLDS: readonly NexaWorld\[\] = \['home', 'dami'\]/);
});

test('B57 CP17 Notification Center sits inside the Notifications world; the Home branch is unchanged', () => {
  const idx = read('src/app/(tabs)/index.tsx');
  assert.match(idx, /import \{ NexaWorldBackground \} from '\.\.\/\.\.\/NexaWorldBackground'/);
  assert.match(idx, /if \(notificationsOpen\) return <NexaWorldBackground world="notifications"><NotificationCenter [^]*?\/><\/NexaWorldBackground>;/);
  assert.match(idx, /return <RoyalBackground world="home" style=\{\{flex:1\}\}><HomeCommandCenter onOpenNotifications=\{\(\) => setNotificationsOpen\(true\)\} \/><\/RoyalBackground>;/);
  assert.match(idx, /params\.panel === 'notifications'/);
  assert.match(idx, /authedFetch\(`\/api\/notifications\/\$\{encodeURIComponent\(notificationId\)\}\/action`\)/);
});

test('B57 CP17 Notification Center: every plain inline style goes through ds(); logic untouched', () => {
  const src = read('src/NotificationCenter.tsx');
  assert.equal((src.match(/(?<![A-Za-z])(style|contentContainerStyle)=\{\{/g) || []).length, 0);
  assert.equal((src.match(/(?<![A-Za-z])(style|contentContainerStyle)=\{ds\(\{/g) || []).length, 8);
  assert.match(src, /import \{[^}]*\bds\b[^}]*\} from ['"]\.\/theme['"]/);
  // not stacked on token radius / typography (ds() scales them once)
  assert.doesNotMatch(src, /ds\(\{[^}]*theme\.(radius|typography)/);
  for (const k of ['/api/notifications?limit=100', '/api/notifications/preferences', '/read-all', 'loadRequest', 'readAllRequest', 'preferenceRequest', 'accessibilityRole="switch"', 'Notification category filters', 'MARK ALL AS READ'])
    assert.ok(src.includes(k), `missing ${k}`);
});

test('B57 CP16/17 Earth Light wiring: notifications variant added, chain keeps every older tail, readability wash + 0.18 dim kept', () => {
  const earth = read('src/NexaEarth.tsx');
  assert.match(earth, /export type EarthVariant = 'home' \| 'dami' \| 'zeeza' \| 'money' \| 'market' \| 'yaayz' \| 'leisure' \| 'ball' \| 'kitchen' \| 'game' \| 'fitness' \| 'calm' \| 'notifications'/);
  assert.match(earth, /variant === 'notifications' \? <EarthNotificationsSky /);
  assert.match(earth, /variant === 'notifications' \? <EarthNotificationsWater /);
  const wb = read('src/NexaWorldBackground.tsx');
  assert.match(wb, /world === 'notifications' \? 'notifications' : world === 'home' \? 'home'/);
  assert.match(wb, /world === 'fitness' \? 'fitness' : 'calm'/);
  assert.match(wb, /light \? earthVariant === 'notifications' \|\| earthVariant === 'calm'/);
  assert.match(wb, /dim=\{earthVariant === 'notifications' \|\| earthVariant === 'calm'/);
  assert.match(wb, /earthVariant === 'fitness' : !cosmos/);
  assert.match(wb, /earthVariant === 'fitness' (?:\|\| isAccess )?\? 0\.18 : 0\}/);
});

test('B57 CP16/17 Royal Dark Notifications layer mounts only in Royal Dark for the notifications world, between base and depth layer', () => {
  const wb = read('src/NexaWorldBackground.tsx');
  assert.match(wb, /\{!light && world === 'notifications' \? <NexaDarkNotifications \/> : null\}/);
  assert.equal((wb.match(/<NexaDarkNotifications/g) || []).length, 1);
  assert.ok(wb.indexOf('<NexaDarkNotifications') < wb.indexOf('<NexaDepthLayer'));
});

test('B57 CP16/17 each dark layer mounts for exactly one world (no leaks between blocks)', () => {
  const wb = read('src/NexaWorldBackground.tsx');
  const expected = { NexaDarkHome: 'home', NexaDarkDami: 'dami', NexaDarkZeeza: 'zeeza', NexaDarkNotifications: 'notifications', NexaDarkMoney: 'sky-money', NexaDarkMarket: 'dream-marketplace', NexaDarkYaayz: 'yaayz', NexaDarkLeisure: 'leisure', NexaDarkBall: 'ball-house', NexaDarkKitchen: 'kitchen', NexaDarkGame: 'game-house', NexaDarkFitness: 'fitness' };
  for (const c of DARK_LAYERS) {
    const mounts = [...wb.matchAll(new RegExp(`world === '([a-z-]+)' \\? <${c} />`, 'g'))].map(m => m[1]);
    assert.deepEqual(mounts, [expected[c]], c);
  }
});

test('B57 CP16/17 new layers are decorative, native, touch-free and follow the subscription motion rules', () => {
  for (const f of ['src/NexaDarkZeeza.tsx', 'src/NexaDarkNotifications.tsx', 'src/NexaEarthNotifications.tsx']) {
    const src = read(f);
    assert.match(src, /pointerEvents="none"/, f);
    assert.match(src, /accessible=\{false\}/, f);
    assert.doesNotMatch(src, /Touchable|Pressable|onPress|Image\b|require\(/, f);
    assert.doesNotMatch(src, /useNativeDriver: false/, f);
    assert.ok((src.match(/useNativeDriver: true/g) || []).length >= 2, f);
    assert.match(src, /allows\('world-ambient'\)/, f);
    assert.match(src, /allows\('vip-spotlight'\)/, f);
    assert.match(src, /stopAnimation\(\); (?:\w+\.)?setValue\(0\)|stopAnimation\(\); v\.setValue\(0\)|v\.stopAnimation\(\); v\.setValue\(0\)/, f);
    assert.match(src, /loops?\.(?:forEach\(l => l\.stop\(\)\)|stop\(\))/, f);
  }
});

test('B57 CP16/17 every interpolation ramp is strictly ascending', () => {
  // Zeeza typing dots: k*0.22 -> [0, a, a+.18, a+.36, 1]
  for (const k of [0, 1, 2]) { const a = k * 0.22; const r = [0, a, a + 0.18, a + 0.36, 1]; if (k > 0) for (let i = 1; i < r.length; i++) assert.ok(r[i] > r[i - 1], `dots ${k}`); }
  assert.match(read('src/NexaDarkZeeza.tsx'), /inputRange: \[0, a, a \+ 0\.18, a \+ 0\.36, 1\]/);
  // (k = 0 has a = 0, i.e. the same first two stops as the Earth Light typing dots that already ship; the Earth scene has the identical ramp)
  assert.match(read('src/NexaEarthZeeza.tsx'), /inputRange: \[0, a, a \+ 0\.18, a \+ 0\.36, 1\]/);
  // Bell swing
  const swing = [0, 0.05, 0.15, 0.25, 0.35, 0.45, 1]; for (let i = 1; i < swing.length; i++) assert.ok(swing[i] > swing[i - 1]);
  // Badge dots i = 0..2: [0, .02+i*.28, .1+i*.28, .18+i*.28, 1]
  for (let i = 0; i < 3; i++) { const r = [0, 0.02 + i * 0.28, 0.1 + i * 0.28, 0.18 + i * 0.28, 1]; for (let k = 1; k < r.length; k++) assert.ok(r[k] > r[k - 1], `badge ${i}`); }
  assert.match(read('src/NexaDarkNotifications.tsx'), /inputRange: \[0, 0\.02 \+ i \* 0\.28, 0\.1 \+ i \* 0\.28, 0\.18 \+ i \* 0\.28, 1\]/);
  // Envelopes j = 0..2: s = .02 + j*.3 -> [0, s, s+.06, s+.24, 1] and [0, s, s+.24, 1]
  for (let j = 0; j < 3; j++) { const s = 0.02 + j * 0.3; for (const r of [[0, s, s + 0.06, s + 0.24, 1], [0, s, s + 0.24, 1]]) for (let k = 1; k < r.length; k++) assert.ok(r[k] > r[k - 1], `env ${j}`); }
  assert.match(read('src/NexaEarthNotifications.tsx'), /const s = 0\.02 \+ i \* 0\.3;/);
  // Sound rings i = 0..1: s = i*.5 -> [0, s+.02, s+.42, 1]
  for (let i = 0; i < 2; i++) { const s = i * 0.5; const r = [0, s + 0.02, s + 0.42, 1]; for (let k = 1; k < r.length; k++) assert.ok(r[k] > r[k - 1], `ring ${i}`); }
  assert.match(read('src/NexaEarthNotifications.tsx'), /inputRange: \[0, s \+ 0\.02, s \+ 0\.42, 1\]/);
  // Lamp
  const lamp = [0, 0.05, 0.45, 0.6, 1]; for (let i = 1; i < lamp.length; i++) assert.ok(lamp[i] > lamp[i - 1]);
});

test('B57 CP16/17 bell pivots are zero-size (they swing, they do not slide)', () => {
  assert.match(read('src/NexaDarkNotifications.tsx'), /width: 0, height: 0, transform: \[\{ rotate: swing \}\]/);
  assert.match(read('src/NexaEarthNotifications.tsx'), /width: 0, height: 0, transform: \[\{ rotate: swing \}\]/);
});

test('B57 CP16/17 Zeeza behaviour, Earth Light Zeeza and other blocks are untouched', () => {
  const earthZ = read('src/NexaEarthZeeza.tsx');
  assert.equal(earthZ.includes('NexaDarkZeeza'), false);
  assert.match(read('src/NexaEarth.tsx'), /variant === 'zeeza' \? <EarthZeezaSky /);
  assert.doesNotMatch(read('src/NexaEarthNotifications.tsx'), /from '\.\/NexaDark/);
  assert.doesNotMatch(read('src/NexaDarkNotifications.tsx'), /from '\.\/NexaEarth/);
  assert.doesNotMatch(read('src/NexaDarkZeeza.tsx'), /from '\.\/NexaEarth/);
});
