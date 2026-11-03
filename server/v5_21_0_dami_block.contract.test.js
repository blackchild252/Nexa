const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

// B57 Checkpoint 4 — DAMI block (Earth Light scene layers + design layer on the Dami screen).
// Sidebar order: Home (CP2) -> Dami (CP4) -> Zeeza next.

const damiSrc = () => read('src/NexaAI.tsx');
const layerSrc = () => read('src/NexaEarthDami.tsx');
const earthSrc = () => read('src/NexaEarth.tsx');

test('B57 CP4 Dami is the block after Home in the sidebar directory', () => {
  const src = read('src/homeDesign.ts');
  const ids = [...src.matchAll(/\['([a-z]+)','[^']+','[a-z-]+-outline'/g)].map(m => m[1]);
  assert.equal(ids[0], 'home');
  assert.equal(ids[1], 'dami');
  assert.equal(ids[2], 'zeeza');
});

test('B57 CP4 every inline style on the Dami screen goes through ds() (Earth Light design layer)', () => {
  const src = damiSrc();
  assert.match(src, /import \{ theme, tc, ds \} from '\.\/theme';/);
  const plain = src.match(/(?<![A-Za-z])(style|contentContainerStyle)=\{\{/g) || [];
  assert.equal(plain.length, 0, 'no inline style object may bypass ds()');
  const wrapped = src.match(/(?<![A-Za-z])(style|contentContainerStyle)=\{ds\(\{/g) || [];
  assert.ok(wrapped.length >= 100, `expected the ~117 inline styles to be wrapped, found ${wrapped.length}`);
});

test('B57 CP4 ds() is not stacked on token radius/typography (would scale twice)', () => {
  assert.equal((damiSrc().match(/theme\.radius|theme\.typography/g) || []).length, 0);
});

test('B57 CP4 every colour literal on the Dami screen is theme-aware', () => {
  const src = damiSrc();
  const bare = (src.match(/['"]#[0-9a-fA-F]{3,8}['"]|(?<!tc\()['"]rgba?\([^'"]*\)['"]/g) || [])
    .filter(lit => !new RegExp(`tc\\(${lit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`).test(src));
  assert.deepEqual(bare, [], 'colour literal not wrapped in tc(): ' + bare.join(', '));
});

test('B57 CP4 all Dami tc() literals resolve to an Earth Light colour (none left dark)', () => {
  const theme = read('src/theme.ts');
  const map = theme.match(/const LIGHT_LITERALS[^=]*= (\{[\s\S]*?\n\});/);
  assert.ok(map);
  const table = new Function(`return (${map[1]})`)();
  const norm = c => c.replace(/\s+/g, '').toLowerCase();
  const literals = [...damiSrc().matchAll(/tc\(['"]([^'"]+)['"]\)/g)].map(m => m[1]);
  assert.ok(literals.length >= 10);
  for (const lit of literals) {
    const k = norm(lit);
    const viaRegex = /^rgba\(255,215,0,[0-9.]+\)$/.test(k) || /^rgba\(212,175,55,[0-9.]+\)$/.test(k);
    assert.ok(table[k] || viaRegex, `${lit} has no Earth Light mapping`);
  }
});

test('B57 CP4 Earth Light Dami layers are decorative, non-interactive and motion-gated', () => {
  const src = layerSrc();
  assert.match(src, /export function EarthDamiSky/);
  assert.match(src, /export function EarthDamiWater/);
  assert.equal((src.match(/pointerEvents="none"/g) || []).length, 2);
  assert.equal((src.match(/accessible=\{false\}/g) || []).length, 2);
  assert.match(src, /allows\('world-ambient'\)/);
  assert.match(src, /allows\('vip-spotlight'\)/);
  assert.doesNotMatch(src, /onPress|TouchableOpacity|Pressable|onTouch/);
  // no Royal Dark colours leak into the light scene
  assert.doesNotMatch(src, /#FFD700|#D4AF37|rgba\(255,215,0/i);
});

test('B57 CP4 motion rules: animation is off when the tier or reduced motion says so, and loops are cleaned up', () => {
  const src = layerSrc();
  assert.ok((src.match(/if \(!animated\)/g) || []).length >= 2, 'both layers reset to static');
  assert.ok((src.match(/return \(\) => /g) || []).length >= 2, 'both layers stop their loops on unmount');
  assert.ok((src.match(/useNativeDriver: true/g) || []).length >= 5);
});

test('B57 CP4 the Dami layers mount only for the dami variant, Home and calm worlds are unchanged', () => {
  const src = earthSrc();
  assert.match(src, /variant === 'dami' \? <EarthDamiSky/);
  assert.match(src, /variant === 'dami' \? <EarthDamiWater/);
  assert.match(src, /variant === 'home' \? <EarthHomeSky/);
  assert.match(src, /variant === 'home' \? <EarthHomeShore/);
  assert.match(src, /variant === 'home' \? <EarthHomeWater/);
  assert.doesNotMatch(src, /variant === 'calm' \? <EarthDami/);
});

test('B57 CP4 Royal Dark Dami path is untouched: cosmos still drawn for dami in dark mode', () => {
  const bg = read('src/NexaWorldBackground.tsx');
  assert.match(bg, /!light && cosmos && world === 'dami' \? <NexaCosmos variant="dami" dim=\{0\.28\}/);
  assert.match(bg, /world === 'home' \? <Image source=\{HOME_CINEMATIC_BACKGROUND\}/);
  assert.match(bg, /world === 'dami' \? 'dami' : /);  // CP5 added the zeeza variant after it; dami still maps to 'dami'
});

test('B57 CP4 Dami behaviour is preserved: same handlers, same api calls, security-relevant confirm flow intact', () => {
  const src = damiSrc();
  for (const needle of ['confirmNexaAction(pendingAction.id)', 'askNexa(text,messages)', 'scamCheckImage(', 'updateDamiVoicePreferences', 'updateDamiPersonalization', 'resetDamiPersonalization', 'onNavigate(r.navigation)', 'accessibilityLabel="Search NEXA"', 'accessibilityLabel="Open NEXA notifications"']) {
    assert.ok(src.includes(needle), `missing: ${needle}`);
  }
  assert.match(src, /if\(!pendingAction\|\|actionBusy\)return/);
});

test('B57 CP4 Earth Light Dami halo sits on the header robot and uses Earth Light colours only', () => {
  const src = layerSrc();
  assert.match(src, /HALO_CX = 58/);
  assert.match(src, /rgba\(255,215,120,0\.16\)/);
  assert.match(src, /rgba\(201,162,39,0\.45\)/);
  assert.match(src, /#1A70B8/);
});
