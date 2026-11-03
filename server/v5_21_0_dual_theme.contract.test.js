const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { stripTypeScriptTypes } = require('node:module');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

// Load theme.ts + themeMode.ts as real modules (types stripped, explicit extension for node ESM).
async function loadTheme() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexa-theme-'));
  for (const f of ['themeMode', 'themeDesign', 'nexaFonts', 'theme']) {
    const code = stripTypeScriptTypes(read(`src/${f}.ts`), { mode: 'strip' })
      .replace("'./themeMode'", "'./themeMode.mjs'")
      .replace("'./themeDesign'", "'./themeDesign.mjs'")
      .replace("'./nexaFonts'", "'./nexaFonts.mjs'");
    fs.writeFileSync(path.join(dir, `${f}.mjs`), code);
  }
  const mode = await import(path.join(dir, 'themeMode.mjs'));
  const theme = await import(path.join(dir, 'theme.mjs'));
  return { mode, theme };
}

test('B57 Royal Dark tokens are unchanged', async () => {
  const { mode, theme } = await loadTheme();
  mode.setActiveThemeMode('dark');
  const c = theme.theme.colors;
  assert.equal(c.royalGold, '#D4AF37'); assert.equal(c.brightGold, '#FFD700');
  assert.equal(c.background, '#000000'); assert.equal(c.text, '#F8F5E9'); assert.equal(c.black, '#000000');
  assert.deepEqual([...theme.theme.gradients.app], ['#000000', '#1A1A1A']);
});

test('B57 Earth Light palette: sky, water, land, forest, gold', async () => {
  const { mode, theme } = await loadTheme();
  mode.setActiveThemeMode('light');
  const c = theme.theme.colors;
  assert.match(c.background, /^#F2F9FF$/i);            // white sky
  assert.match(c.brightGold, /^#1767A9$/i);            // water blue
  assert.match(c.royalGold, /^#2A7147$/i);             // forest green
  assert.match(c.text, /^#2A2118$/i);                  // land brown text
  assert.match(c.borderGold, /^#C9A227$/i);            // touch of gold
  assert.equal(c.black, '#FFFFFF');                    // text on green primary buttons
  mode.setActiveThemeMode('dark');
});

test('B57 every dark token has a light counterpart (same keys, same shape)', async () => {
  const { mode, theme } = await loadTheme();
  const dark = theme.getTheme('dark'); const light = theme.getTheme('light');
  assert.deepEqual(Object.keys(light.colors).sort(), Object.keys(dark.colors).sort());
  for (const k of Object.keys(dark)) assert.ok(k in light, k);
  for (const k of ['card', 'gold', 'glow']) assert.ok(light.shadow[k] || k === 'card');
});

test('B57 light text/background pairs keep readable contrast (WCAG AA 4.5)', async () => {
  const { theme } = await loadTheme();
  const L = h => { const n = parseInt(h.slice(1), 16); const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(n >> 16 & 255) + 0.7152 * f(n >> 8 & 255) + 0.0722 * f(n & 255); };
  const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const c = theme.getTheme('light').colors;
  for (const [fg, bg] of [['text', 'surface'], ['text', 'background'], ['textSecondary', 'surface'], ['muted', 'surface'], ['black', 'royalGold'], ['deepBlack', 'brightGold'], ['goldHot', 'surface'], ['text', 'surfaceElevated']]) {
    assert.ok(ratio(c[fg], c[bg]) >= 4.5, `${fg} on ${bg} = ${ratio(c[fg], c[bg]).toFixed(2)}`);
  }
});

test('B57 theme is live: reads follow the active mode; themedStyles resolves per mode', async () => {
  const { mode, theme } = await loadTheme();
  const sheet = theme.themedStyles(() => ({ a: { color: theme.theme.colors.text, borderColor: 'rgba(212,175,55,0.4)' } }));
  mode.setActiveThemeMode('dark');
  assert.equal(sheet.a.color, '#F8F5E9'); assert.equal(sheet.a.borderColor, 'rgba(212,175,55,0.4)');
  const seen = []; const off = mode.subscribeThemeMode(m => seen.push(m));
  mode.setActiveThemeMode('light');
  assert.equal(sheet.a.color, '#2A2118'); assert.match(sheet.a.borderColor, /^rgba\(201,162,39,/);
  assert.equal(theme.tc('#9b907a'), '#7A6A4F');
  mode.setActiveThemeMode('dark');
  assert.deepEqual(seen, ['light', 'dark']); off();
  assert.equal(theme.tc('#9b907a'), '#9b907a');
});

test('B57 mode normalization only accepts light; anything else is Royal Dark', async () => {
  const { mode } = await loadTheme();
  assert.equal(mode.normalizeThemeMode('light'), 'light');
  for (const v of ['dark', '', null, undefined, 'LIGHT ', 'system', 42]) assert.equal(mode.normalizeThemeMode(v), 'dark');
  assert.equal(mode.DEFAULT_THEME_MODE, 'dark');
});

test('B57 Settings has the Appearance switch wired to the provider', () => {
  const profile = read('src/app/(tabs)/profile.tsx');
  assert.match(profile, /Appearance/); assert.match(profile, /<ThemePicker preference=\{preference\} onSelect=\{setPreference\}\/>/);
  const picker = read('src/ThemePicker.tsx');
  for (const label of ['Royal Dark', 'Earth Light']) assert.match(picker, new RegExp(label));
  assert.match(picker, /accessibilityRole="radio"/);
  const provider = read('src/ThemeProvider.tsx');
  assert.match(provider, /SecureStore\.getItemAsync\(THEME_STORAGE_KEY\)/); assert.match(provider, /SecureStore\.setItemAsync/);
});

test('B57 root layout keeps provider order, re-keys the tree on switch and restores the route', () => {
  const layout = read('src/app/_layout.tsx');
  assert.match(layout, /AuthProvider><NexaLocationProvider><MotionProvider>/);
  assert.match(layout, /<NexaNavProvider key=\{appearance\}><RootNavigator\/><\/NexaNavProvider>/);
  assert.match(layout, /StatusBar style=\{mode === 'light' \? 'dark' : 'light'\}/);
  assert.match(layout, /router\.replace\(target as any\)/);
});

test('B57 module-level style sheets are theme-resolved, never frozen to one palette', () => {
  for (const f of ['styles.ts', 'groupStyles.ts', 'socialStyles.ts', 'CallScreen.tsx', 'GroupCallScreen.tsx', 'HomeCommandCenter.tsx', 'NexaNavKeys.tsx', 'ZeezaChase.tsx', 'ZeezaProfile.tsx', 'NexaWorldBackground.tsx', 'app/zeeza/share/[token].tsx', 'app/(tabs)/zeeza.tsx']) {
    assert.match(read(`src/${f}`), /themedStyles\(/, f);
  }
  // No bare StyleSheet.create left that reads theme colors at import time.
  for (const f of ['styles.ts', 'groupStyles.ts', 'socialStyles.ts']) assert.doesNotMatch(read(`src/${f}`), /^export const \w+ = StyleSheet\.create/m, f);
});

test('B57 Earth Light scene: sky, sun, land, forest, water; follows subscription motion', () => {
  const earth = read('src/NexaEarth.tsx');
  for (const part of ['drifting clouds', 'sun with a touch of gold', 'distant land (brown)', 'forest tree line (green)', 'water (blue)']) assert.match(earth, new RegExp(part.replace(/[()]/g, '\\$&')));
  assert.match(earth, /allows\('world-ambient'\)/); assert.match(earth, /pointerEvents="none"/);
  const bg = read('src/NexaWorldBackground.tsx');
  assert.match(bg, /<NexaEarth/); assert.match(bg, /<NexaCosmos/);
});

test('B57 white text on cards was replaced by the text token (invisible in Earth Light otherwise)', () => {
  for (const f of ['Wallet.tsx', 'MoneyDashboard.tsx', 'MarketWatch.tsx']) assert.doesNotMatch(read(`src/${f}`), /color: ?["']#fff["']/, f);
});

test('B57 release metadata is synchronized', () => {
  const rootVersion = JSON.parse(read('package.json')).version;
  assert.equal(JSON.parse(read('server/package.json')).version, rootVersion);
  assert.match(read('VERSION.md'), new RegExp(`Current Version:\\*\\* V${rootVersion.replace('.', '\\.')}`));
  assert.match(read('src/theme.ts'), new RegExp(`release: '${rootVersion.replace('.', '\\.')}'`));
});
