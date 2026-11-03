const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

// B57 Checkpoint 7 — DREAM MARKETPLACE block (Royal Dark showroom layer + Earth Light bunting/stall boat + design layer).
// Sidebar order: Home (CP2) -> Dami (CP4) -> Zeeza (CP5) -> Sky Money (CP6) -> Dream Marketplace (CP7) -> Yaayz next.

const MARKET_FILES = ['src/MarketplaceScreen.tsx', 'src/MarketplaceStorefront.tsx', 'src/VendorDashboard.tsx', 'src/app/marketplace/vendor.tsx', 'src/app/(tabs)/marketplace.tsx'];

test('B57 CP7 Dream Marketplace is fifth in the sidebar directory, right after Sky Money', () => {
  const ids = [...read('src/homeDesign.ts').matchAll(/\['([a-z]+)','[^']+','[a-z-]+-outline'/g)].map(m => m[1]);
  assert.deepEqual(ids.slice(0, 6), ['home', 'dami', 'zeeza', 'money', 'marketplace', 'vendor']);
});

test('B57 CP7 no inline style object on any Dream Marketplace screen bypasses ds() (Earth Light design layer)', () => {
  let wrapped = 0;
  for (const f of MARKET_FILES) {
    const src = read(f);
    assert.equal((src.match(/(?<![A-Za-z])(style|contentContainerStyle)=\{\{/g) || []).length, 0, `${f}: inline style not wrapped in ds()`);
    const w = (src.match(/(?<![A-Za-z])(style|contentContainerStyle)=\{ds\(\{/g) || []).length;
    if (w) assert.match(src, /import \{[^}]*\bds\b[^}]*\} from ['"][./]+theme['"]/, `${f} uses ds() without importing it`);
    wrapped += w;
  }
  assert.ok(wrapped >= 187, `wrapped inline styles should not decrease below the historical baseline: ${wrapped}`);
});

test('B57 CP7 ds() is not stacked on token radius/typography in Dream Marketplace inline styles', () => {
  for (const f of MARKET_FILES) {
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

test('B57 CP7 Dream Marketplace colour literals are theme-aware and every one has an Earth Light mapping', () => {
  const theme = read('src/theme.ts');
  const table = new Function(`return (${theme.match(/const LIGHT_LITERALS[^=]*= (\{[\s\S]*?\n\});/)[1]})`)();
  const norm = c => c.replace(/\s+/g, '').toLowerCase();
  for (const f of MARKET_FILES.concat('src/useMarketplace.ts', 'src/marketplace.ts')) {
    const src = read(f);
    for (const m of src.matchAll(/tc\(['"]([^'"]+)['"]\)/g)) {
      const k = norm(m[1]);
      assert.ok(table[k] || /^rgba\((255,215,0|212,175,55),[0-9.]+\)$/.test(k), `${f}: ${m[1]} has no Earth Light mapping`);
    }
    const bare = (src.match(/(?<!tc\()['"]#[0-9a-fA-F]{3,8}['"]/g) || []).filter(x => !/^['"](#fff|#ffffff|#b83629)['"]$/i.test(x));
    assert.deepEqual(bare, [], `${f}: bare colour literal ${bare.join(', ')}`);
  }
});

test('B57 CP7 regression: MarketplaceScreen declares targetOrderId (opening "My orders" threw a ReferenceError)', () => {
  const src = read('src/MarketplaceScreen.tsx');
  assert.match(src, /const \[targetOrderId,setTargetOrderId\]=useState<string\|null>\(null\);/);
  // declared before the effect that sets it, and only once
  assert.equal((src.match(/const \[targetOrderId,/g) || []).length, 1);
  assert.ok(src.indexOf('const [targetOrderId,') < src.indexOf('setTargetOrderId(initialOrderId)'));
  // notification deep-link behaviour intact
  assert.match(src, /if\(initialTab==='orders'\) setOrdersOpen\(true\); if\(initialOrderId\) setTargetOrderId\(initialOrderId\);/);
  assert.match(src, /' · Opened from notification'/);
});

test('B57 CP7 Earth Light market layers: native, decorative, nine pennants + stall boat, subscription rules', () => {
  const src = read('src/NexaEarthMarket.tsx');
  assert.match(src, /export function EarthMarketSky/);
  assert.match(src, /export function EarthMarketWater/);
  assert.equal((src.match(/^import .*$/gm) || []).length, 3, 'only react, react-native and ./motion are imported');
  assert.equal((src.match(/pointerEvents="none"/g) || []).length, 2, 'both layers ignore touches');
  assert.match(src, /const PENNANTS = 9;/);
  assert.match(src, /allows\('world-ambient'\)/);
  assert.match(src, /allows\('vip-spotlight'\)/);
  assert.equal((src.match(/return \(\) => loops?\.(forEach\(l => l\.stop\(\)\)|stop\(\))/g) || []).length, 2, 'loops stop on unmount');
  assert.match(src, /animated \? sway\.interpolate/);
  assert.match(src, /animated \? drift\.interpolate/);
  assert.match(src, /animated \? bob\.interpolate/);
  // pennants swing from a zero-size pivot on the string (no offset-pivot transform trick)
  assert.match(src, /left: x, top: top \+ 4 \+ sag, width: 0, height: 0/);
  assert.doesNotMatch(src, /translateY: -13/);
});

test('B57 CP7 Royal Dark showroom layer: native, decorative, three beams + one glint, ramps ascending, subscription rules', () => {
  const src = read('src/NexaDarkMarket.tsx');
  assert.match(src, /export function NexaDarkMarket/);
  assert.equal((src.match(/^import .*$/gm) || []).length, 3);
  assert.match(src, /pointerEvents="none"/);
  const beams = eval(src.match(/const BEAMS[^=]*= (\[[\s\S]*?\]);\n/)[1]);
  assert.equal(beams.length, 3);
  assert.match(src, /inputRange: \[0, Math\.max\(0\.01, peak - 0\.25\), peak, Math\.min\(0\.99, peak \+ 0\.25\), 1\]/);
  for (let i = 0; i < beams.length; i++) {
    const peak = (i + 0.5) / beams.length;
    const r = [0, Math.max(0.01, peak - 0.25), peak, Math.min(0.99, peak + 0.25), 1];
    for (let k = 1; k < r.length; k++) assert.ok(r[k] > r[k - 1], `beam ${i}: ramp not ascending ${r}`);
  }
  assert.match(src, /allows\('world-ambient'\)/);
  assert.match(src, /allows\('vip-spotlight'\)/);
  assert.match(src, /return \(\) => loops\.forEach\(l => l\.stop\(\)\)/);
  assert.match(src, /: 0\.4,/, 'Free (static) still shows the glint');
  assert.doesNotMatch(src, /useThemeMode|currentThemeMode/, 'the dark layer never branches on the theme');
});

test('B57 CP7 wiring: dream-marketplace -> market variant in Earth Light, dark layer only in Royal Dark, other worlds untouched', () => {
  const earth = read('src/NexaEarth.tsx');
  assert.match(earth, /export type EarthVariant = 'home' \| 'dami' \| 'zeeza' \| 'money' \| 'market' \| (?:'yaayz' \| )?(?:'leisure' \| )?(?:'ball' \| )?(?:'kitchen' \| )?(?:'game' \| )?(?:'fitness' \| )?'calm'/);
  assert.match(earth, /variant === 'market' \? <EarthMarketSky/);
  assert.match(earth, /variant === 'market' \? <EarthMarketWater/);
  assert.match(earth, /variant === 'home' \? 0\.62 : variant === 'dami' \? 0\.55 : 0\.68/, 'market keeps the calm horizon');
  const wb = read('src/NexaWorldBackground.tsx');
  assert.match(wb, /world === 'dream-marketplace' \? 'market'/);
  assert.match(wb, /earthVariant === 'money' \|\| earthVariant === 'market'(?: \|\| earthVariant === 'yaayz')?(?: \|\| earthVariant === 'leisure')?(?: \|\| earthVariant === 'ball')?(?: \|\| earthVariant === 'kitchen')?(?: \|\| earthVariant === 'game')?(?: \|\| earthVariant === 'fitness')? : !cosmos/);
  assert.match(wb, /\{!light && world === 'dream-marketplace' \? <NexaDarkMarket \/> : null\}/);
  assert.match(wb, /\{!light && world === 'sky-money' \? <NexaDarkMoney \/> : null\}/, 'Sky Money layer untouched');
  assert.match(wb, /\{!light && source \? <Image source=\{source\} resizeMode="cover"/);
  assert.ok(wb.indexOf('<Image source') < wb.indexOf('<NexaDarkMarket />') && wb.indexOf('<NexaDarkMarket />') < wb.indexOf('<NexaDepthLayer'));
  // Yaayz reuses the dream-marketplace poster but is its own block: it must NOT get this block's layers
  assert.match(read('src/nexaWorlds.ts'), /yaayz: require\('\.\.\/assets\/worlds\/dream_marketplace_world\.jpg'\)/);
  // (CP8 gave Yaayz its own layers; the dream-marketplace layers still never mount for it)
  assert.doesNotMatch(wb, /world === 'yaayz' \? <NexaDarkMarket/);
  assert.doesNotMatch(wb, /world === 'yaayz' \? 'market'/);
});

test('B57 CP7 Vendor dashboard route lives in the Dream Marketplace world; storefront route unchanged', () => {
  assert.match(read('src/app/marketplace/vendor.tsx'), /<NexaWorldBackground world="dream-marketplace"><VendorDashboard onBack=\{\(\)=>nexaGoBack\(\)\}( initialTab=\{tab\})?( initialOrderId=\{orderId\})?\/><\/NexaWorldBackground>/);
  const tab = read('src/app/(tabs)/marketplace.tsx');
  assert.match(tab, /<NexaWorldBackground world="dream-marketplace"><MarketplaceScreen .*?initialSearch=\{initialSearch\}/);
  assert.match(tab, /onVendor=\{\(\) => router\.push\('\/marketplace\/vendor' as any\)\}/);
});
