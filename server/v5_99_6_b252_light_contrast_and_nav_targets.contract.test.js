const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

const lum = h => { const v = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(x => x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const theme = read('src/theme.ts');
const block = theme.slice(theme.indexOf('const lightColors'), theme.indexOf('const lightTheme'));
const c = Object.fromEntries([...block.matchAll(/(\w+):\s*'(#[0-9A-Fa-f]{6})'/g)].map(m => [m[1], m[2]]));

test('M4127-M4128 Earth Light accent/status text tokens meet 4.5:1 on every light surface', () => {
  const texts = ['royalGold', 'brightGold', 'goldBright', 'goldHot', 'goldText', 'focus', 'text', 'textSecondary', 'muted', 'success', 'info', 'warning', 'error', 'danger'];
  const surfaces = ['background', 'backgroundSoft', 'surface', 'surfaceElevated', 'surfacePressed', 'goldWash', 'charcoal', 'successSoft', 'infoSoft', 'warningSoft', 'errorSoft'];
  const failures = [];
  for (const t of texts) for (const s of surfaces) if (ratio(c[t], c[s]) < 4.5) failures.push(`${t} on ${s}: ${ratio(c[t], c[s]).toFixed(2)}`);
  assert.deepStrictEqual(failures, []);
});

test('M4129 hard-coded dark literals map to the same accessible tokens', () => {
  assert.match(theme, /'#ffd700': '#1767A9'/);
  assert.match(theme, /'#f87171': '#B83629'/);
  assert.match(theme, /'#9ff0b5': '#1D7343'/);
});

test('M4130 keyboard focus ring uses the accessible blue and Royal Dark is unchanged', () => {
  assert.match(read('src/motion.tsx'), /'#FFD700':'#1767A9'/);
  const dark = theme.slice(theme.indexOf('const darkColors') >= 0 ? theme.indexOf('const darkColors') : 0, theme.indexOf('const lightColors'));
  assert.ok(!/1767A9|2A7147|1D7343|B83629/.test(dark), 'dark palette untouched');
});

test('M4133-M4134 every navigation target resolves to a real live route file', () => {
  const nav = read('src/nexaNavigation.ts'), home = read('src/homeDesign.ts');
  const exists = p => {
    const segs = p.split('?')[0].replace(/^\//, '').split('/').filter(Boolean);
    if (!segs.length || (segs.length === 1 && segs[0] === '(tabs)')) return fs.existsSync(path.join(root, 'src/app/(tabs)/index.tsx'));
    const base = path.join(root, 'src/app', ...segs);
    return fs.existsSync(base + '.tsx') || fs.existsSync(path.join(base, 'index.tsx'));
  };
  const dir = [...nav.matchAll(/^\s{2}(\w+): \{ pathname: '([^']+)'/gm)].map(m => [m[1], m[2]]);
  const add = [...nav.matchAll(/case '(\w+)': return \{ pathname: '([^']+)'/g)].map(m => [m[1], m[2]]);
  const hd = [...home.matchAll(/\['(\w+)','([^']+)','([\w-]+)','([^']+)'\]/g)].map(m => [m[1], m[4]]);
  assert.ok(dir.length >= 17 && hd.length >= 14);
  for (const [id, p] of [...dir, ...add, ...hd]) assert.ok(exists(p), `missing route for ${id}: ${p}`);
  for (const [id] of hd) if (id !== 'subscription') assert.ok(dir.some(d => d[0] === id), `home item ${id} has no directory route`);
});

test('M4135 live layout (src/app) is the router root and its status bar follows the theme', () => {
  const layout = read('src/app/_layout.tsx');
  assert.match(layout, /StatusBar style=\{mode === 'light' \? 'dark' : 'light'\}/);
  assert.match(layout, /contentStyle:\{backgroundColor:theme\.colors\.background\}/);
});

// Release identity is no longer pinned per release: see v5_99_7_b253_release_identity_authority.contract.test.js
