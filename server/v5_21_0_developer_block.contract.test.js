const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

// B57 Checkpoint 21 — DEVELOPER CONSOLE block (Royal Dark code window + key + request dots, Earth Light code window + workshop, design layer).
// Sidebar order: ... Profile (CP19) -> Extensions (CP20) -> Developer Console (CP21) = last sidebar block.

const SCREEN = 'src/ExtensionDeveloperScreen.tsx';

test('B57 CP21 Developer Console is the last entry of the sidebar directory', () => {
  const ids = [...read('src/homeDesign.ts').matchAll(/\['([a-z]+)','[^']+','[a-z-]+-outline'/g)].map(m => m[1]).filter(id => id !== 'subscription'); // NEXA Membership was added later; this block's order is about the other entries
  assert.deepEqual(ids.slice(11), ['extensions', 'developer']);
  assert.equal(ids.length, 13);
});

test('B57 CP21 the Developer Console sits inside its own `developer` world and all 18 plain inline styles go through ds()', () => {
  const src = read(SCREEN);
  assert.match(src, /import \{ theme, tc, ds \} from '\.\/theme'/);
  assert.match(src, /import \{NexaWorldBackground\} from '\.\/NexaWorldBackground'/);
  assert.equal((src.match(/<NexaWorldBackground world="developer">/g) || []).length, 1);
  assert.equal((src.match(/<\/NexaWorldBackground>/g) || []).length, 1);
  assert.equal((src.match(/(?<![A-Za-z])(style|contentContainerStyle)=\{ds\(\{/g) || []).length, 18);
  assert.equal((src.match(/(?<![A-Za-z])(style|contentContainerStyle)=\{\{/g) || []).length, 0);
  for (const m of src.matchAll(/=\{ds\(\{(.*?)\}\)\}/g)) assert.doesNotMatch(m[1], /theme\.radius|theme\.typography/);
  assert.deepEqual(src.match(/(?<!tc\()['"]#[0-9a-fA-F]{3,8}['"]/g) || [], []);
});

test('B57 CP21 regression: manifest validation, API key creation (shown once), identities, audit and back logic are intact', () => {
  const src = read(SCREEN);
  for (const k of [
    "Alert.alert('API key created','Copy this key now. NEXA will not show it again.",
    "Alert.alert('Developer Console'", "Alert.alert('Extension audit'", "Alert.alert('API identities'",
    'loadRequest', 'detailRequests', 'onBack',
  ]) assert.ok(src.includes(k), `missing ${k}`);
  assert.match(read('src/app/developer.tsx'), /nexaGoBack\(\)/);
  // security: the screen never stores or logs the key
  assert.doesNotMatch(src, /console\.log\([^)]*apiKey|AsyncStorage|localStorage/);
});

test('B57 CP21 Developer has its own world (no poster, own prompt); Extensions, Profile and Notifications keep theirs', () => {
  const w = read('src/nexaWorlds.ts');
  assert.match(w, /\| 'extensions'\n  \| 'developer'(?:\n  \| 'subscription')?(?:\n  \| 'auth')?(?:\n  \| 'staff')?(?:\n  \| 'disputes')?;/);
  assert.match(w, /developer: null,/);
  assert.match(w, /developer: '[^']*API key rows[^']*'/);
  assert.match(w, /extensions: null,/);
  assert.match(w, /profile: require\('\.\.\/assets\/worlds\/zeeza_world\.jpg'\),/);
  assert.match(w, /notifications: null,/);
});

test('B57 CP21 Earth Light wiring: developer variant added, older chain tails and dims kept', () => {
  const earth = read('src/NexaEarth.tsx');
  assert.match(earth, /import \{ EarthDeveloperSky, EarthDeveloperWater \} from '\.\/NexaEarthDeveloper'/);
  assert.match(earth, /'profile' \| 'extensions' \| 'developer'(?: \| 'subscription')?(?: \| 'auth')?(?: \| 'staff')?(?: \| 'disputes')?;/);
  assert.match(earth, /variant === 'developer' \? <EarthDeveloperSky width=\{width\} height=\{height\} \/> : null/);
  assert.match(earth, /variant === 'developer' \? <EarthDeveloperWater width=\{width\} horizonY=\{horizonY\} \/> : null/);
  assert.match(earth, /variant === 'profile' \|\| variant === 'extensions' \|\| variant === 'developer'(?: \|\| isAccess)? \? Math\.max\(dim, 0\.18\) : dim/);
  const wb = read('src/NexaWorldBackground.tsx');
  assert.match(wb, /world === 'developer' \? 'developer' : world === 'extensions' \? 'extensions' : world === 'profile' \? 'profile'/);
  assert.match(wb, /world === 'fitness' \? 'fitness' : 'calm'/);
  assert.match(wb, /earthVariant === 'profile' \|\| earthVariant === 'extensions' \|\| earthVariant === 'developer'(?: \|\| isAccess)?\)\)/, 'readability wash for Developer');
  assert.match(wb, /\{!light && world === 'developer' \? <NexaDarkDeveloper \/> : null\}/);
  assert.equal((wb.match(/NexaDarkDeveloper/g) || []).length, 3); // import name + import path + the one mount
  assert.equal((earth.match(/EarthDeveloperSky/g) || []).length, 2);
});

test('B57 CP21 Earth Light Developer scene: code window + workshop, native, no touches, subscription motion rules', () => {
  const src = read('src/NexaEarthDeveloper.tsx');
  for (const k of ['export function EarthDeveloperSky', 'export function EarthDeveloperWater', "allows('world-ambient')", "allows('vip-spotlight')", 'pointerEvents="none"', 'accessible={false}', 'useNativeDriver: true'])
    assert.ok(src.includes(k), `missing ${k}`);
  assert.match(src, /if \(!animated\) \{ run\.stopAnimation\(\); run\.setValue\(0\); return; \}/);
  assert.match(src, /if \(!animated\) \{ \[bob, wave\]/);
  assert.match(src, /return \(\) => loop\.stop\(\)/);
  assert.match(src, /return \(\) => loops\.forEach\(l => l\.stop\(\)\)/);
  for (const c of ['#2F7D4F', '#1A70B8', '#8B5E3C', 'rgba(230,190,69,'])
    assert.ok(src.includes(c), `earth palette colour ${c}`);
  // the key swings from a zero-size pivot (does not slide)
  assert.match(src, /left: 19, top: 22, width: 0, height: 0/);
  assert.doesNotMatch(src, /onPress|TouchableOpacity|Pressable|localStorage|fetch\(/);
});

test('B57 CP21 Royal Dark Developer scene: gold code window + key + request dots, native, no touches, subscription motion rules', () => {
  const src = read('src/NexaDarkDeveloper.tsx');
  for (const k of ['export function NexaDarkDeveloper', "allows('world-ambient')", "allows('vip-spotlight')", 'pointerEvents="none"', 'accessible={false}', 'useNativeDriver: true', 'return () => loops.forEach(l => l.stop())', 'const DOTS'])
    assert.ok(src.includes(k), `missing ${k}`);
  assert.match(src, /if \(!animated\) \{ \[run, breathe\]/);
  assert.match(src, /rgba\(255,215,0,'/);
  assert.match(src, /rgba\(212,175,55,'/);
  assert.doesNotMatch(src, /onPress|TouchableOpacity|Pressable|localStorage|fetch\(/);
});

test('B57 CP21 the code lines and cursor stay inside their window', () => {
  const earth = read('src/NexaEarthDeveloper.tsx');
  // window 76 wide: widest line left 8 + 46 = 54; cursor left 52 + 3 = 55 <= 76
  assert.match(earth, /width: 76, height: 58/);
  assert.match(earth, /const widths = \[46, 30, 40\]/);
  const dark = read('src/NexaDarkDeveloper.tsx');
  // window 70 wide: widest line 8 + 34 = 42; cursor left 42 + 3 <= 70
  assert.match(dark, /width: 70, height: 50/);
  assert.match(dark, /const widths = \[34, 22, 30\]/);
});

test('B57 CP21 nothing outside the Developer block changed shape (Extensions keeps its own world)', () => {
  assert.match(read('src/ExtensionsScreen.tsx'), /<NexaWorldBackground world="extensions">/);
  assert.doesNotMatch(read('src/ExtensionsScreen.tsx'), /world="developer"/);
  assert.doesNotMatch(read('src/app/(tabs)/profile.tsx'), /world="developer"|world="extensions"/);
});
