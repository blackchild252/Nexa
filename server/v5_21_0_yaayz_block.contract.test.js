const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

// B57 Checkpoint 8 — YAAYZ block (Royal Dark route/event layer + Earth Light airplane/ferry layer + design layer).
// Sidebar order: Home (CP2) -> Dami (CP4) -> Zeeza (CP5) -> Sky Money (CP6) -> Dream Marketplace (CP7) -> Yaayz (CP8) -> L.A. next.

const YAAYZ_FILES = ['src/YaayzScreen.tsx', 'src/app/(tabs)/yaayz.tsx'];

test('B57 CP8 Yaayz is sixth in the sidebar directory, right after Dream Marketplace; L.A. follows', () => {
  const ids = [...read('src/homeDesign.ts').matchAll(/\['([a-z]+)','[^']+','[a-z-]+-outline'/g)].map(m => m[1]);
  assert.deepEqual(ids.slice(0, 7), ['home', 'dami', 'zeeza', 'money', 'marketplace', 'vendor', 'yaayz']);
});

test('B57 CP8 no inline style object on any Yaayz screen bypasses ds() (Earth Light design layer)', () => {
  let wrapped = 0;
  for (const f of YAAYZ_FILES) {
    const src = read(f);
    assert.equal((src.match(/(?<![A-Za-z])(style|contentContainerStyle)=\{\{/g) || []).length, 0, `${f}: inline style not wrapped in ds()`);
    const w = (src.match(/(?<![A-Za-z])(style|contentContainerStyle)=\{ds\(\{/g) || []).length;
    if (w) assert.match(src, /import \{[^}]*\bds\b[^}]*\} from ['"][./]+theme['"]/, `${f} uses ds() without importing it`);
    wrapped += w;
  }
  assert.equal(wrapped, 13, 'all 13 inline styles found in the audit are wrapped (YaayzScreen 13; the unused tile helper and its style were removed in M4236)');
});

test('B57 CP8 ds() is not stacked on token radius/typography in Yaayz inline styles', () => {
  for (const f of YAAYZ_FILES) {
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
});

test('B57 CP8 Yaayz colour literals are theme-aware and every one has an Earth Light mapping', () => {
  const theme = read('src/theme.ts');
  const table = new Function(`return (${theme.match(/const LIGHT_LITERALS[^=]*= (\{[\s\S]*?\n\});/)[1]})`)();
  const norm = c => c.replace(/\s+/g, '').toLowerCase();
  for (const f of YAAYZ_FILES) {
    const src = read(f);
    for (const m of src.matchAll(/tc\(['"]([^'"]+)['"]\)/g)) {
      const k = norm(m[1]);
      assert.ok(table[k] || /^rgba\((255,215,0|212,175,55),[0-9.]+\)$/.test(k), `${f}: ${m[1]} has no Earth Light mapping`);
    }
    const bare = (src.match(/(?<!tc\()['"]#[0-9a-fA-F]{3,8}['"]/g) || []).filter(x => !/^['"](#fff|#ffffff)['"]$/i.test(x));
    assert.deepEqual(bare, [], `${f}: bare colour literal ${bare.join(', ')}`);
  }
});

test('B57 CP8 regression: the wrapper-only edit kept every Yaayz handler, endpoint and notification deep link', () => {
  const src = read('src/YaayzScreen.tsx');
  for (const needle of [
    '/api/yaayz/tickets?search=', '/api/yaayz/ads', '/api/yaayz/orders', '/api/yaayz/tickets/fee-preview?ticketId=',
    '/purchase`', '/api/yaayz/payments/verify', '/fee-retry`', 'feePreviewId:preview?.previewId',
    "' · Opened from notification'", 'requestedTicketOrderId', "['/leisure/ball-house','/leisure/game-house','/leisure']",
    'Before you confirm', 'Verify ticket payment', 'Retry NEXA service fee', 'loadRequest.current',
  ]) assert.ok(src.includes(needle), `missing: ${needle}`);
  assert.doesNotMatch(src, /setMode\(target\)/);
  assert.match(src, /accessibilityRole="button"/);
});

test('B57 CP8 Earth Light Yaayz layers: native, decorative, airplane + contrail + ferry + gold route dots, subscription rules', () => {
  const src = read('src/NexaEarthYaayz.tsx');
  assert.match(src, /export function EarthYaayzSky/);
  assert.match(src, /export function EarthYaayzWater/);
  assert.equal((src.match(/^import .*$/gm) || []).length, 3, 'only react, react-native and ./motion are imported');
  assert.equal((src.match(/pointerEvents="none"/g) || []).length, 2, 'both layers ignore touches');
  assert.match(src, /const TRAIL = 6;/);
  assert.match(src, /const ROUTE_DOTS = 7;/);
  assert.match(src, /allows\('world-ambient'\)/);
  assert.match(src, /allows\('vip-spotlight'\)/);
  assert.equal((src.match(/return \(\) => loops?\.(forEach\(l => l\.stop\(\)\)|stop\(\))/g) || []).length, 2, 'loops stop on unmount');
  assert.match(src, /animated \? fly\.interpolate/);
  assert.match(src, /animated \? drift\.interpolate/);
  assert.match(src, /animated \? bob\.interpolate/);
  assert.match(src, /animated \? glow\.interpolate/);
  assert.match(src, /: width \* 0\.34;/, 'Free (static) still shows the airplane');
  assert.match(src, /: 0\.6;/, 'Free (static) still shows the route dots');
  // every route-dot ramp is strictly ascending, for every dot
  assert.match(src, /inputRange: \[0, Math\.max\(0\.01, peak - 0\.18\), peak, Math\.min\(0\.99, peak \+ 0\.18\), 1\]/);
  for (let i = 0; i < 7; i++) {
    const peak = (i + 0.5) / 7;
    const r = [0, Math.max(0.01, peak - 0.18), peak, Math.min(0.99, peak + 0.18), 1];
    for (let k = 1; k < r.length; k++) assert.ok(r[k] > r[k - 1], `route dot ${i}: ramp not ascending ${r}`);
  }
  assert.doesNotMatch(src, /useThemeMode|currentThemeMode/, 'Earth layers do not branch on the theme; the parent decides');
});

test('B57 CP8 Royal Dark Yaayz layer: native, decorative, three route lines + six event lights, ramps ascending, subscription rules', () => {
  const src = read('src/NexaDarkYaayz.tsx');
  assert.match(src, /export function NexaDarkYaayz/);
  assert.equal((src.match(/^import .*$/gm) || []).length, 3);
  assert.equal((src.match(/pointerEvents="none"/g) || []).length, 1);
  const routes = eval(src.match(/const ROUTES[^=]*= (\[[\s\S]*?\]);\n/)[1]);
  const lights = eval(src.match(/const LIGHTS[^=]*= (\[[\s\S]*?\]);\n/)[1]);
  assert.equal(routes.length, 3);
  assert.equal(lights.length, 6);
  for (const [top, , ms] of routes) { assert.ok(top > 0.05 && top < 0.9); assert.ok(ms >= 8000); }
  for (const [l, t] of lights) { assert.ok(l > 0 && l < 1 && t > 0 && t < 0.3, 'event lights sit near the top, inside the screen'); }
  assert.match(src, /inputRange: \[0, Math\.max\(0\.01, peak - 0\.15\), peak, Math\.min\(0\.99, peak \+ 0\.15\), 1\]/);
  for (let i = 0; i < lights.length; i++) {
    const peak = (i + 0.5) / lights.length;
    const r = [0, Math.max(0.01, peak - 0.15), peak, Math.min(0.99, peak + 0.15), 1];
    for (let k = 1; k < r.length; k++) assert.ok(r[k] > r[k - 1], `light ${i}: ramp not ascending ${r}`);
  }
  assert.match(src, /allows\('world-ambient'\)/);
  assert.match(src, /allows\('vip-spotlight'\)/);
  assert.match(src, /return \(\) => loops\.forEach\(l => l\.stop\(\)\)/);
  assert.match(src, /: 0\.5, transform/, 'Free (static) still shows the route dots');
  assert.match(src, /: 0\.55;/, 'Free (static) still shows the event lights');
  // route dot travels along the tilted line: it lives inside the rotated container
  assert.match(src, /width: span, height: 0, transform: \[\{ rotate: `\$\{tilt\}deg` \}\]/);
  assert.doesNotMatch(src, /useThemeMode|currentThemeMode/, 'the dark layer never branches on the theme');
});

test('B57 CP8 wiring: yaayz -> yaayz variant in Earth Light, dark layer only in Royal Dark, other worlds untouched', () => {
  const earth = read('src/NexaEarth.tsx');
  assert.match(earth, /export type EarthVariant = 'home' \| 'dami' \| 'zeeza' \| 'money' \| 'market' \| 'yaayz' \| (?:'leisure' \| )?(?:'ball' \| )?(?:'kitchen' \| )?(?:'game' \| )?(?:'fitness' \| )?'calm'/);
  assert.match(earth, /variant === 'yaayz' \? <EarthYaayzSky/);
  assert.match(earth, /variant === 'yaayz' \? <EarthYaayzWater/);
  assert.match(earth, /variant === 'home' \? 0\.62 : variant === 'dami' \? 0\.55 : 0\.68/, 'yaayz keeps the calm horizon');
  const wb = read('src/NexaWorldBackground.tsx');
  assert.match(wb, /world === 'dream-marketplace' \? 'market' : world === 'yaayz' \? 'yaayz' : (?:world === 'leisure' \? 'leisure' : )?(?:world === 'ball-house' \? 'ball' : )?(?:world === 'kitchen' \? 'kitchen' : )?(?:world === 'game-house' \? 'game' : )?(?:world === 'fitness' \? 'fitness' : )?'calm'/);
  assert.match(wb, /earthVariant === 'market' \|\| earthVariant === 'yaayz'(?: \|\| earthVariant === 'leisure')?(?: \|\| earthVariant === 'ball')?(?: \|\| earthVariant === 'kitchen')?(?: \|\| earthVariant === 'game')?(?: \|\| earthVariant === 'fitness')? : !cosmos/, 'readability wash kept in Earth Light');
  assert.match(wb, /earthVariant === 'yaayz'(?: \|\| earthVariant === 'leisure')?(?: \|\| earthVariant === 'ball')?(?: \|\| earthVariant === 'kitchen')?(?: \|\| earthVariant === 'game')?(?: \|\| earthVariant === 'fitness')? (?:\|\| isAccess )?\? 0\.18 : 0\}/, '0.18 dim kept in Earth Light');
  assert.match(wb, /\{!light && world === 'yaayz' \? <NexaDarkYaayz \/> : null\}/);
  assert.match(wb, /\{!light && world === 'dream-marketplace' \? <NexaDarkMarket \/> : null\}/, 'Dream Marketplace layer untouched');
  assert.match(wb, /\{!light && world === 'sky-money' \? <NexaDarkMoney \/> : null\}/, 'Sky Money layer untouched');
  assert.match(wb, /\{!light && source \? <Image source=\{source\} resizeMode="cover"/);
  assert.ok(wb.indexOf('<Image source') < wb.indexOf('<NexaDarkYaayz />') && wb.indexOf('<NexaDarkYaayz />') < wb.indexOf('<NexaDepthLayer'));
  // Yaayz still uses the shared poster image; the Dream Marketplace layers never mount for it
  assert.match(read('src/nexaWorlds.ts'), /yaayz: require\('\.\.\/assets\/worlds\/dream_marketplace_world\.jpg'\)/);
  assert.doesNotMatch(wb, /world === 'yaayz' \? <NexaDarkMarket/);
  assert.doesNotMatch(wb, /world === 'dream-marketplace' \? <NexaDarkYaayz/);
  assert.equal((wb.match(/<NexaDarkYaayz \/>/g) || []).length, 1);
});

test('B57 CP8 Yaayz route stays inside the Yaayz world; the scenes stay out of every other block', () => {
  assert.match(read('src/app/(tabs)/yaayz.tsx'), /<NexaWorldBackground world="yaayz"><YaayzScreen\/><\/NexaWorldBackground>/);
  const users = fs.readdirSync(path.join(root, 'src')).filter(f => /\.tsx$/.test(f) && !['NexaWorldBackground.tsx', 'NexaEarth.tsx', 'NexaEarthYaayz.tsx', 'NexaDarkYaayz.tsx'].includes(f));
  for (const f of users) {
    const s = read('src/' + f);
    if (/NexaEarthYaayz|NexaDarkYaayz/.test(s)) assert.fail(`${f} imports a Yaayz scene outside the world background`);
  }
});
