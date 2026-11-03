const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

// B57 Checkpoint 6 — SKY MONEY block (Royal Dark vault layer + Earth Light coins/growth bars + design layer).
// Sidebar order: Home (CP2) -> Dami (CP4) -> Zeeza (CP5) -> Sky Money (CP6) -> Dream Marketplace next.

const MONEY_FILES = [
  'src/MoneyDashboard.tsx', 'src/Wallet.tsx', 'src/MarketWatch.tsx', 'src/MarketInsights.tsx', 'src/FinancialPlanning.tsx',
  'src/StoreAjo.tsx', 'src/GroupsTab.tsx', 'src/GroupScreen.tsx', 'src/app/wallet.tsx',
];

test('B57 CP6 Sky Money is fourth in the sidebar directory, right after Zeeza', () => {
  const ids = [...read('src/homeDesign.ts').matchAll(/\['([a-z]+)','[^']+','[a-z-]+-outline'/g)].map(m => m[1]);
  assert.deepEqual(ids.slice(0, 5), ['home', 'dami', 'zeeza', 'money', 'marketplace']);
});

test('B57 CP6 no inline style object on any Sky Money screen bypasses ds() (Earth Light design layer)', () => {
  let wrapped = 0;
  for (const f of MONEY_FILES) {
    const src = read(f);
    const plain = src.match(/(?<![A-Za-z])(style|contentContainerStyle)=\{\{/g) || [];
    assert.equal(plain.length, 0, `${f}: ${plain.length} inline style(s) not wrapped in ds()`);
    const w = (src.match(/(?<![A-Za-z])(style|contentContainerStyle)=\{ds\(\{/g) || []).length;
    if (w) assert.match(src, /import \{[^}]*\bds\b[^}]*\} from ['"][./]+theme['"]/, `${f} uses ds() without importing it`);
    wrapped += w;
  }
  assert.ok(wrapped >= 120, `wrapped inline styles should not decrease below the historical baseline: ${wrapped}`);
});

test('B57 CP6 ds() is not stacked on token radius/typography in Sky Money inline styles (multi-line safe)', () => {
  for (const f of MONEY_FILES) {
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

test('B57 CP6 Sky Money colour literals are theme-aware and every one has an Earth Light mapping', () => {
  const theme = read('src/theme.ts');
  const table = new Function(`return (${theme.match(/const LIGHT_LITERALS[^=]*= (\{[\s\S]*?\n\});/)[1]})`)();
  const norm = c => c.replace(/\s+/g, '').toLowerCase();
  for (const f of MONEY_FILES.concat('src/groupStyles.ts', 'src/styles.ts')) {
    const src = read(f);
    for (const m of src.matchAll(/tc\(['"]([^'"]+)['"]\)/g)) {
      const k = norm(m[1]);
      assert.ok(table[k] || /^rgba\((255,215,0|212,175,55),[0-9.]+\)$/.test(k), `${f}: ${m[1]} has no Earth Light mapping`);
    }
    const bare = (src.match(/(?<!tc\()['"]#[0-9a-fA-F]{3,8}['"]/g) || []).filter(x => !/^['"](#fff|#ffffff)['"]$/i.test(x));
    assert.deepEqual(bare, [], `${f}: bare colour literal ${bare.join(', ')}`);
  }
});

test('B57 CP6 regression: every Sky Money file that reads theme.* imports theme (FinancialPlanning crashed without it)', () => {
  for (const f of MONEY_FILES) {
    const src = read(f);
    if (/(?<![A-Za-z.])theme\./.test(src)) assert.match(src, /import \{[^}]*\btheme\b[^}]*\} from ['"][./]+theme['"]/, `${f} uses theme.* without importing theme`);
  }
  assert.match(read('src/FinancialPlanning.tsx'), /import \{ theme, tc, ds \} from '\.\/theme'/);
});

test('B57 CP6 Earth Light money layers: native, decorative, five coins + five growth bars, subscription motion rules', () => {
  const src = read('src/NexaEarthMoney.tsx');
  assert.match(src, /export function EarthMoneySky/);
  assert.match(src, /export function EarthMoneyWater/);
  assert.equal((src.match(/^import .*$/gm) || []).length, 3, 'only react, react-native and ./motion are imported');
  assert.match(src, /from 'react-native'/);
  assert.match(src, /from '\.\/motion'/);
  assert.equal((src.match(/pointerEvents="none"/g) || []).length, 2, 'both layers ignore touches');
  assert.equal(eval(src.match(/const COINS[^=]*= (\[[\s\S]*?\]);\n/)[1]).length, 5);
  assert.deepEqual(eval(src.match(/const BAR_HEIGHTS = (\[[^\]]*\]);/)[1]), [22, 34, 46, 60, 78]);
  assert.match(src, /allows\('world-ambient'\)/);
  assert.match(src, /allows\('vip-spotlight'\)/);
  assert.equal((src.match(/return \(\) => loops?\.(forEach\(l => l\.stop\(\)\)|stop\(\))/g) || []).length, 2, 'loops stop on unmount');
  // Free / reduced motion: every animated value falls back to a static number
  assert.match(src, /animated \? bob\.interpolate/);
  assert.match(src, /animated \? turn\.interpolate/);
  assert.match(src, /animated \? rise\.interpolate/);
});

test('B57 CP6 Earth Light growth-bar glow ramps are strictly ascending for every bar', () => {
  const src = read('src/NexaEarthMoney.tsx');
  assert.match(src, /inputRange: \[0, Math\.max\(0\.01, peak - 0\.18\), peak, Math\.min\(0\.99, peak \+ 0\.18\), 1\]/);
  const n = eval(src.match(/const BAR_HEIGHTS = (\[[^\]]*\]);/)[1]).length;
  for (let i = 0; i < n; i++) {
    const peak = (i + 1) / (n + 1);
    const r = [0, Math.max(0.01, peak - 0.18), peak, Math.min(0.99, peak + 0.18), 1];
    for (let k = 1; k < r.length; k++) assert.ok(r[k] > r[k - 1], `bar ${i}: ramp not ascending ${r}`);
  }
});

test('B57 CP6 Royal Dark vault layer: native, decorative, six sparks + one gleam, ramps ascending, subscription rules', () => {
  const src = read('src/NexaDarkMoney.tsx');
  assert.match(src, /export function NexaDarkMoney/);
  assert.equal((src.match(/^import .*$/gm) || []).length, 3);
  assert.match(src, /pointerEvents="none"/);
  const sparks = eval(src.match(/const SPARKS[^=]*= (\[[\s\S]*?\]);\n/)[1]);
  assert.equal(sparks.length, 6);
  assert.match(src, /inputRange: \[0, Math\.max\(0\.01, a\), \(a \+ b\) \/ 2, b, 1\]/);
  for (const [, , , phase] of sparks) {
    const a = phase, b = Math.min(0.99, phase + 0.5);
    const r = [0, Math.max(0.01, a), (a + b) / 2, b, 1];
    for (let k = 1; k < r.length; k++) assert.ok(r[k] > r[k - 1], `spark phase ${phase}: ramp not ascending ${r}`);
  }
  assert.match(src, /allows\('world-ambient'\)/);
  assert.match(src, /allows\('vip-spotlight'\)/);
  assert.match(src, /return \(\) => loops\.forEach\(l => l\.stop\(\)\)/);
  assert.match(src, /: 0\.5,/, 'Free (static) still shows the gleam');
  assert.doesNotMatch(src, /useThemeMode|currentThemeMode/, 'the dark layer never branches on the theme');
});

test('B57 CP6 wiring: sky-money -> money variant in Earth Light, dark layer only in Royal Dark, other worlds untouched', () => {
  const earth = read('src/NexaEarth.tsx');
  assert.match(earth, /export type EarthVariant = 'home' \| 'dami' \| 'zeeza' \| 'money' \| (?:'market' \| )?(?:'yaayz' \| )?(?:'leisure' \| )?(?:'ball' \| )?(?:'kitchen' \| )?(?:'game' \| )?(?:'fitness' \| )?'calm'/);
  assert.match(earth, /variant === 'money' \? <EarthMoneySky/);
  assert.match(earth, /variant === 'money' \? <EarthMoneyWater/);
  assert.doesNotMatch(earth, /variant === 'home' \? 0\.62 : variant === 'dami' \? 0\.55 : variant === 'money'/, 'money keeps the calm horizon');
  const wb = read('src/NexaWorldBackground.tsx');
  assert.match(wb, /world === 'sky-money' \? 'money'/);
  assert.match(wb, /earthVariant === 'calm'(?: \|\| earthVariant === 'search')? \|\| earthVariant === 'zeeza' \|\| earthVariant === 'money'(?: \|\| earthVariant === 'market')?(?: \|\| earthVariant === 'yaayz')?(?: \|\| earthVariant === 'leisure')?(?: \|\| earthVariant === 'ball')?(?: \|\| earthVariant === 'kitchen')?(?: \|\| earthVariant === 'game')?(?: \|\| earthVariant === 'fitness')? : !cosmos/);
  assert.match(wb, /\{!light && world === 'sky-money' \? <NexaDarkMoney \/> : null\}/);
  // poster + cosmos lines of Royal Dark are byte-for-byte as before
  assert.match(wb, /!light && cosmos && world === 'dami' \? <NexaCosmos variant="dami" dim=\{0\.28\} \/> : null/);
  assert.match(wb, /world === 'home' \? <Image source=\{HOME_CINEMATIC_BACKGROUND\}/);
  assert.match(wb, /\{!light && source \? <Image source=\{source\} resizeMode="cover"/);
  // the dark layer sits after the poster and before the depth layer (environment -> depth -> readability -> content)
  assert.ok(wb.indexOf('<Image source') < wb.indexOf('<NexaDarkMoney />') && wb.indexOf('<NexaDarkMoney />') < wb.indexOf('<NexaDepthLayer'));
});

test('B57 CP6 sub-views no longer hide the world scene; Wallet lives in the Sky Money world', () => {
  const md = read('src/MoneyDashboard.tsx');
  assert.equal((md.match(/ds\(\{ flex: 1, backgroundColor: 'transparent' \}\)/g) || []).length, 4, 'Planning, Store Savings, Market/Insights and Group Savings wrappers');
  assert.doesNotMatch(md, /ds\(\{ flex: 1, backgroundColor: theme\.colors\.background \}\)/);
  const w = read('src/app/wallet.tsx');
  assert.match(w, /<NexaWorldBackground world="sky-money"><Wallet\/><\/NexaWorldBackground>/);
  assert.match(read('src/app/(tabs)/money.tsx'), /<NexaWorldBackground world="sky-money">/);
});
