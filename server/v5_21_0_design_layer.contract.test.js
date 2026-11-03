const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { stripTypeScriptTypes } = require('node:module');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

// B57 Checkpoint 3 — the design layer: Royal Dark and Earth Light differ in LOOKS (shape, type, frame,
// shadow, icons, motion), not only colour. Layout and navigation are the same in both.
async function load() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexa-design-'));
  for (const f of ['themeMode', 'themeDesign', 'nexaFonts', 'theme']) {
    const code = stripTypeScriptTypes(read(`src/${f}.ts`), { mode: 'strip' }).replace("'./themeMode'", "'./themeMode.mjs'").replace("'./themeDesign'", "'./themeDesign.mjs'").replace("'./nexaFonts'", "'./nexaFonts.mjs'");
    fs.writeFileSync(path.join(dir, `${f}.mjs`), code);
  }
  return { mode: await import(path.join(dir, 'themeMode.mjs')), design: await import(path.join(dir, 'themeDesign.mjs')), theme: await import(path.join(dir, 'theme.mjs')) };
}

const sample = () => ({
  card: { borderRadius: 16, borderWidth: 1.5, fontWeight: '900', letterSpacing: 2, shadowRadius: 20, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, elevation: 10, padding: 18, width: 120 },
  pill: { borderRadius: 999, borderWidth: 1, fontWeight: 'bold' },
  circle: { width: 34, height: 34, borderRadius: 17 },
  hair: { borderRadius: 2, borderTopLeftRadius: 20, borderBottomRightRadius: 12, fontWeight: '700', letterSpacing: -0.5 },
});

test('B57 CP3 Royal Dark is the identity: designStyle returns the very same object', async () => {
  const { design } = await load();
  const s = sample();
  assert.equal(design.designStyle('dark', s), s);
  assert.deepEqual(design.designStyle('dark', s), sample());
  assert.equal(design.designIcon('home-outline', 'dark'), 'home-outline');
  assert.deepEqual(design.motionProfile('dark'), { pressScale: 0, springSpeedDelta: 0, bounceDelta: 0, enterMsDelta: 0, travelScale: 1 });
});

test('B57 CP3 Earth Light reshapes corners: rounder, pills and circles and hairlines untouched', async () => {
  const { design } = await load();
  const e = design.designStyle('light', sample());
  assert.equal(e.card.borderRadius, 21);              // 16 * 1.3
  assert.equal(e.pill.borderRadius, 999);             // pill stays a pill
  assert.equal(e.circle.borderRadius >= 17, true);    // a circle can never become less round
  assert.equal(e.hair.borderRadius, 2);               // hairline untouched
  assert.equal(e.hair.borderTopLeftRadius, 26); assert.equal(e.hair.borderBottomRightRadius, 16);
});

test('B57 CP3 Earth Light type, frame and shadow: lighter weights, thinner frames, softer lifted shadows', async () => {
  const { design } = await load();
  const e = design.designStyle('light', sample());
  assert.equal(e.card.fontWeight, '800'); assert.equal(e.hair.fontWeight, '600'); assert.equal(e.pill.fontWeight, 'bold');
  assert.equal(e.card.letterSpacing, 1); assert.equal(e.hair.letterSpacing, -0.5);
  assert.equal(e.card.borderWidth, 1); assert.equal(e.pill.borderWidth, 1);
  assert.equal(e.card.shadowRadius, 28); assert.equal(e.card.shadowOpacity, 0.21);
  assert.deepEqual(e.card.shadowOffset, { width: 0, height: 5 }); assert.equal(e.card.elevation, 7);
  // layout numbers are never touched: same screens, same spacing, same sizes
  assert.equal(e.card.padding, 18); assert.equal(e.card.width, 120); assert.equal(e.circle.width, 34);
});

test('B57 CP3 designStyle handles arrays and nested styles and does not mutate its input', async () => {
  const { design } = await load();
  const input = [{ borderRadius: 10 }, { transform: [{ scale: 1 }], nested: { fontWeight: '900' } }];
  const before = JSON.stringify(input);
  const out = design.designStyle('light', input);
  assert.equal(JSON.stringify(input), before);
  assert.equal(out[0].borderRadius, 13); assert.equal(out[1].nested.fontWeight, '800'); assert.deepEqual(out[1].transform, [{ scale: 1 }]);
});

test('B57 CP3 icons: Earth Light fills only known-safe names; inactive tabs and unknown names stay outline', async () => {
  const { design } = await load();
  assert.equal(design.designIcon('home-outline', 'light'), 'home');
  assert.equal(design.designIcon('home-outline', 'light', false), 'home-outline');
  assert.equal(design.designIcon('menu', 'light'), 'menu');
  assert.equal(design.designIcon('mystery-thing-outline', 'light'), 'mystery-thing-outline');
  const src = read('src/homeDesign.ts');
  const names = [...src.matchAll(/'([a-z-]+-outline)'/g)].map(m => m[1].replace(/-outline$/, ''));
  for (const n of names) assert.ok(design.EARTH_FILLED_ICONS.includes(n), `directory icon "${n}" has no filled mapping (it would stay outline, which is safe, but check)`);
});

test('B57 CP3 motion feel: Earth Light is calmer than Royal Dark', async () => {
  const { design } = await load();
  const d = design.motionProfile('dark'); const l = design.motionProfile('light');
  assert.ok(l.springSpeedDelta < d.springSpeedDelta && l.bounceDelta < d.bounceDelta && l.enterMsDelta > d.enterMsDelta && l.travelScale > d.travelScale);
  assert.ok(0.975 + l.pressScale < 1 && 0.985 + l.pressScale < 1, 'a press must still shrink');
  const m = read('src/motion.tsx');
  assert.match(m, /motionProfile\(currentThemeMode\(\)\)/); assert.match(m, /mp\.enterMsDelta/); assert.match(m, /Math\.max\(0,\(level>=100\?7:level>=60\?5:3\)\+mp\.bounceDelta\)/);
});

test('B57 CP3 tokens: theme.radius/typography are designed for inline use and NOT scaled twice in style sheets', async () => {
  const { mode, theme } = await load();
  mode.setActiveThemeMode('dark');
  assert.deepEqual({ ...theme.theme.radius }, { sm: 12, md: 16, lg: 18, xl: 20, pill: 999 });
  mode.setActiveThemeMode('light');
  assert.deepEqual({ ...theme.theme.radius }, { sm: 16, md: 21, lg: 23, xl: 26, pill: 999 });
  assert.equal(theme.theme.typography.title.fontWeight, '800'); assert.equal(theme.theme.typography.title.letterSpacing, 0.1);
  const sheet = theme.themedStyles(() => ({ box: { borderRadius: theme.theme.radius.md, ...theme.theme.typography.title } }));
  mode.setActiveThemeMode('light'); assert.equal(sheet.box.borderRadius, 21); assert.equal(sheet.box.fontWeight, '800');
  mode.setActiveThemeMode('dark'); assert.equal(sheet.box.borderRadius, 16); assert.equal(sheet.box.fontWeight, '900');
});

test('B57 CP3 themed sheets: literal radii/weights follow the interface, and Royal Dark values are byte-identical', async () => {
  const { mode, theme } = await load();
  const sheet = theme.themedStyles(() => ({ a: { borderRadius: 14, fontWeight: '800', shadowRadius: 10, backgroundColor: '#1A1A1A' } }));
  mode.setActiveThemeMode('dark');
  assert.deepEqual({ ...sheet.a }, { borderRadius: 14, fontWeight: '800', shadowRadius: 10, backgroundColor: '#1A1A1A' });
  mode.setActiveThemeMode('light');
  assert.equal(sheet.a.borderRadius, 18); assert.equal(sheet.a.fontWeight, '700'); assert.equal(sheet.a.shadowRadius, 14); assert.equal(sheet.a.backgroundColor, '#FFFFFF');
  mode.setActiveThemeMode('dark');
});

test('B57 CP3 layout tokens: Earth Light airier, same keys as Royal Dark, and the design profile is exposed', async () => {
  const { theme } = await load();
  const dark = theme.getTheme('dark'); const light = theme.getTheme('light');
  assert.deepEqual(Object.keys(light.layout).sort(), Object.keys(dark.layout).sort());
  assert.ok(light.layout.cardPadding > dark.layout.cardPadding);
  assert.equal(dark.design.id, 'royal-dark'); assert.equal(light.design.id, 'earth-light');
  assert.ok(light.layout.primaryControlHeight >= dark.accessibility.preferredTouchTarget, 'touch targets stay >= 48');
});

test('B57 CP3 wiring: tabs, directory drawer, Home directory and nav keys use the design layer', () => {
  const tabs = read('src/app/(tabs)/_layout.tsx');
  assert.match(tabs, /di\(name,focused\)/); assert.match(tabs, /earth-light/); assert.match(tabs, /ds\(\{fontSize:14/);
  assert.match(tabs, /tabBarStyle:\{display:'none'\}/, 'Home still hides the tab bar (layout unchanged)');
  for (const f of ['src/NexaNavKeys.tsx', 'src/HomeCommandCenter.tsx']) assert.match(read(f), /di\(icon\)/);
  const theme = read('src/theme.ts');
  assert.match(theme, /designStyle\(mode, remapColorsForMode\(mode, value\)\)/);
  assert.match(theme, /export const ds = /); assert.match(theme, /export const di = /);
});

test('B57 CP3 design module is pure (no React Native) and Royal Dark tab layout numbers are unchanged', () => {
  const src = read('src/themeDesign.ts');
  assert.doesNotMatch(src, /from 'react-native'|from "react-native"|require\(/);
  const tabs = read('src/app/(tabs)/_layout.tsx');
  assert.ok(tabs.includes("{width:34,height:34,borderRadius:17,backgroundColor:focused?theme.colors.brightGold:'transparent',...focused?theme.shadow.glow:{}}"));
  assert.ok(tabs.includes("height:dock.height,paddingTop:7,paddingBottom:dock.paddingBottom"));
});
