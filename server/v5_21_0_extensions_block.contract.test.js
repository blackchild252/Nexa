const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

// B57 Checkpoint 20 — EXTENSIONS block (Royal Dark module links + permission switches, Earth Light module tiles + module barge, design layer).
// Sidebar order: ... Search (CP18) -> Profile (CP19) -> Extensions (CP20) -> Developer Console next.

const SCREEN = 'src/ExtensionsScreen.tsx';

test('B57 CP20 Extensions is right after Profile in the sidebar directory; Developer Console follows', () => {
  const ids = [...read('src/homeDesign.ts').matchAll(/\['([a-z]+)','[^']+','[a-z-]+-outline'/g)].map(m => m[1]).filter(id => id !== 'subscription'); // NEXA Membership was added later; this block's order is about the other entries
  assert.deepEqual(ids.slice(9, 12), ['search', 'profile', 'extensions']);
});

test('B57 CP20 the Extensions screen sits inside its own `extensions` world and all 16 plain inline styles go through ds()', () => {
  const src = read(SCREEN);
  assert.match(src, /import \{ theme, tc, ds \} from '\.\/theme'/);
  assert.match(src, /import \{NexaWorldBackground\} from '\.\/NexaWorldBackground'/);
  assert.equal((src.match(/<NexaWorldBackground world="extensions">/g) || []).length, 1);
  assert.equal((src.match(/<\/NexaWorldBackground>/g) || []).length, 1);
  assert.equal((src.match(/(?<![A-Za-z])(style|contentContainerStyle)=\{ds\(\{/g) || []).length, 16);
  assert.equal((src.match(/(?<![A-Za-z])(style|contentContainerStyle)=\{\{/g) || []).length, 0);
  // ds() is never stacked on token radius / typography
  for (const m of src.matchAll(/=\{ds\(\{(.*?)\}\)\}/g)) assert.doesNotMatch(m[1], /theme\.radius|theme\.typography/);
  // every colour literal is already in tc() (placeholder colours included)
  assert.deepEqual(src.match(/(?<!tc\()['"]#[0-9a-fA-F]{3,8}['"]/g) || [], []);
});

test('B57 CP20 regression: register, consent, enable/disable, revoke, edit, audit and back logic are intact', () => {
  const src = read(SCREEN);
  for (const k of [
    "authedFetch(`/api/extensions/${editing}`,{method:'PATCH'",
    "Alert.alert('Revoke extension','This is permanent. The extension cannot be enabled again.'",
    "act(ext.id,'revoke')", "act(ext.id,ext.status==='enabled'?'disable':'enable')",
    'toggleConsent(ext)', 'loadAudit(ext.id)', 'onPress={onBack}', 'saveEdit', 'register',
    "Only public metadata is stored. NEXA never asks extensions for server secrets here.",
  ]) assert.ok(src.includes(k), `missing ${k}`);
  assert.match(read('src/app/extensions.tsx'), /nexaGoBack\(\)/);
});

test('B57 CP20 Extensions has its own world (no poster, own prompt); Profile and Notifications keep theirs', () => {
  const w = read('src/nexaWorlds.ts');
  assert.match(w, /\| 'profile'\n  \| 'extensions'(?:\n  \| 'developer')?(?:\n  \| 'subscription')?(?:\n  \| 'auth')?(?:\n  \| 'staff')?(?:\n  \| 'disputes')?;/);
  assert.match(w, /extensions: null,/);
  assert.match(w, /extensions: '[^']*permission switches[^']*'/);
  assert.match(w, /profile: require\('\.\.\/assets\/worlds\/zeeza_world\.jpg'\),/);
  assert.match(w, /notifications: null,/);
});

test('B57 CP20 Earth Light wiring: extensions variant added, older chain tails and dims kept', () => {
  const earth = read('src/NexaEarth.tsx');
  assert.match(earth, /import \{ EarthExtensionsSky, EarthExtensionsWater \} from '\.\/NexaEarthExtensions'/);
  assert.match(earth, /'profile' \| 'extensions'(?: \| 'developer')?(?: \| 'subscription')?(?: \| 'auth')?(?: \| 'staff')?(?: \| 'disputes')?;/);
  assert.match(earth, /variant === 'extensions' \? <EarthExtensionsSky width=\{width\} height=\{height\} \/> : null/);
  assert.match(earth, /variant === 'extensions' \? <EarthExtensionsWater width=\{width\} horizonY=\{horizonY\} \/> : null/);
  assert.match(earth, /variant === 'profile' \|\| variant === 'extensions'(?: \|\| variant === 'developer')?(?: \|\| isAccess)? \? Math\.max\(dim, 0\.18\) : dim/);
  const wb = read('src/NexaWorldBackground.tsx');
  assert.match(wb, /(?:world === 'developer' \? 'developer' : )?world === 'extensions' \? 'extensions' : world === 'profile' \? 'profile' : world === 'search'/);
  assert.match(wb, /world === 'fitness' \? 'fitness' : 'calm'/);
  assert.match(wb, /\(light && \(earthVariant === 'profile' \|\| earthVariant === 'extensions'(?: \|\| earthVariant === 'developer')?(?: \|\| isAccess)?\)\)/, 'readability wash for Extensions');
  assert.match(wb, /\{!light && world === 'extensions' \? <NexaDarkExtensions \/> : null\}/);
  // the dark layer never mounts in Earth Light, and no other world gets it
  assert.equal((wb.match(/NexaDarkExtensions/g) || []).length, 3); // import name + import path + the one mount
  assert.equal((earth.match(/EarthExtensionsSky/g) || []).length, 2);
});

test('B57 CP20 Earth Light Extensions scene: module tiles + links + barge, native, no touches, subscription motion rules', () => {
  const src = read('src/NexaEarthExtensions.tsx');
  for (const k of ['export function EarthExtensionsSky', 'export function EarthExtensionsWater', "allows('world-ambient')", "allows('vip-spotlight')", 'pointerEvents="none"', 'accessible={false}', 'useNativeDriver: true', 'return () => loops.forEach(l => l.stop())'])
    assert.ok(src.includes(k), `missing ${k}`);
  assert.match(src, /if \(!animated\) \{ \[drift, travel\]/);
  assert.match(src, /if \(!animated\) \{ \[bob, lit\]/);
  for (const c of ['#2F7D4F', '#1A70B8', '#8B5E3C', 'rgba(230,190,69,'])
    assert.ok(src.includes(c), `earth palette colour ${c}`);
  assert.doesNotMatch(src, /onPress|TouchableOpacity|Pressable|localStorage|fetch\(/);
});

test('B57 CP20 Royal Dark Extensions scene: gold module links + permission switches, native, no touches, subscription motion rules', () => {
  const src = read('src/NexaDarkExtensions.tsx');
  for (const k of ['export function NexaDarkExtensions', "allows('world-ambient')", "allows('vip-spotlight')", 'pointerEvents="none"', 'accessible={false}', 'useNativeDriver: true', 'return () => loops.forEach(l => l.stop())', 'const SWITCHES'])
    assert.ok(src.includes(k), `missing ${k}`);
  assert.match(src, /if \(!animated\) \{ \[travel, flip\]/);
  assert.match(src, /rgba\(255,215,0,'/); // VIP brighter gold
  assert.match(src, /rgba\(212,175,55,'/); // royal gold
  assert.doesNotMatch(src, /onPress|TouchableOpacity|Pressable|localStorage|fetch\(/);
});

test('B57 CP20 the switch knob stays inside its switch and the link pulse stays on its link', () => {
  const dark = read('src/NexaDarkExtensions.tsx');
  // switch: width 28, knob left 2 + width 7 + travel 14 = 23 <= 28 - 2 border
  assert.match(dark, /width: 28, height: 14/);
  assert.match(dark, /outputRange: \[0, 0, 14, 14, 0\]/);
  assert.match(dark, /outputRange: \[0, len - 5\]/);
  const earth = read('src/NexaEarthExtensions.tsx');
  assert.match(earth, /outputRange: \[0, len - 6\]/);
});

test('B57 CP20 both interfaces: nothing outside the Extensions block changed shape (Developer Console is untouched)', () => {
  const dev = read('src/ExtensionDeveloperScreen.tsx');
  assert.doesNotMatch(dev, /NexaWorldBackground world="extensions"/);
  assert.doesNotMatch(read('src/app/developer.tsx'), /world="extensions"/);
  assert.match(read('src/themeMode.ts'), /export type ThemeMode/);
});
