const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

function routeExists(pathname) {
  const p = String(pathname).split('?')[0].split('#')[0].replace(/^\/+/, '');
  const normalized = p === '(tabs)' ? '(tabs)/index' : p;
  const direct = path.join(root, 'src', 'app', normalized + '.tsx');
  if (fs.existsSync(direct)) return true;
  const index = path.join(root, 'src', 'app', normalized, 'index.tsx');
  if (fs.existsSync(index)) return true;
  const parts = normalized.split('/');
  while (parts.length > 0) {
    const parent = path.join(root, 'src', 'app', ...parts);
    if (fs.existsSync(path.join(parent, 'index.tsx'))) return true;
    parts.pop();
  }
  return false;
}

function resolverBlock(source, name) {
  const re = new RegExp(`(?:const|export const) ${name}[^\\n]*=\\s*\\{([\\s\\S]*?)\\n\\};`);
  const m = source.match(re);
  assert.ok(m, `${name} registry missing`);
  return m[1];
}

test('B86 M575 canonical resolver routes all resolve against the real Expo Router tree', () => {
  const nav = read('src/nexaNavigation.ts');
  const paths = [...nav.matchAll(/pathname:\s*'([^']+)'/g)].map(m => m[1]);
  assert.ok(paths.length >= 15, 'canonical resolver surface unexpectedly shrank');
  for (const route of [...new Set(paths)]) {
    assert.equal(routeExists(route), true, `dead canonical navigation route: ${route}`);
  }
});

test('B86 M576 Home directory IDs and canonical destination registry remain one-to-one', () => {
  const home = read('src/homeDesign.ts');
  const nav = read('src/nexaNavigation.ts');
  const start = home.indexOf('export const HOME_DIRECTORY = [');
  const end = home.indexOf('] as const;', start);
  assert.ok(start >= 0 && end > start, 'HOME_DIRECTORY declaration missing');
  const homeIds = [...home.slice(start, end).matchAll(/\['([^']+)'\s*,/g)].map(m => m[1]);
  const block = resolverBlock(nav, 'DIRECTORY_ROUTES');
  const resolverIds = [...block.matchAll(/^\s*['"]?([\w-]+)['"]?:/gm)].map(m => m[1]);
  assert.deepEqual([...new Set(resolverIds)].sort(), [...new Set(homeIds)].sort());
});

test('B86 M577 Quick Search Rail is a single shared-search entry with accessible target semantics', () => {
  const home = read('src/HomeCommandCenter.tsx');
  const match = home.match(/<Rail title="SEARCH NEXA"[\s\S]*?<\/Rail>/);
  assert.ok(match, 'Home Quick Search Rail missing');
  assert.match(match[0], /onPress=\{\(\)=>router\.push\('\/\(tabs\)\/search'/);
  assert.match(match[0], /People/);
  assert.match(match[0], /Groups/);
  assert.match(match[0], /Products/);
  assert.match(match[0], /Tickets/);
  assert.match(match[0], /Money/);
  assert.match(home, /accessibilityRole=\{onPress\?'button':undefined\}/);
});

test('B86 M578 Search is reachable from Home, inner navigation keys and the real route', () => {
  const home = read('src/HomeCommandCenter.tsx');
  const keys = read('src/NexaNavKeys.tsx');
  const route = path.join(root, 'src/app/(tabs)/search.tsx');
  assert.equal(fs.existsSync(route), true);
  assert.match(home, /router\.push\('\/\(tabs\)\/search'/);
  assert.match(keys, /label=\{NEXA_QUICK_ACCESS_LABELS\.search\}/);
  assert.match(keys, /router\.push\('\/\(tabs\)\/search'/);
});

test('B86 M579 world dock contains exactly the five user-world destinations and no settings/search utilities', () => {
  const layout = read('src/app/(tabs)/_layout.tsx');
  const screenNames = [...layout.matchAll(/<Tabs\.Screen name="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(screenNames, ['index','money','zeeza','marketplace','yaayz','leisure','profile','search']);
  for (const name of ['money','zeeza','marketplace','yaayz','leisure']) assert.match(layout, new RegExp(`<Tabs\\.Screen name="${name}"`));
  assert.match(layout, /name="profile" options=\{\{title:BRAND\.profile,href:null\}\}/);
  assert.match(layout, /name="search" options=\{\{href:null\}\}/);
  const iconBlock = layout.match(/const iconMap:[\s\S]*?= \{([\s\S]*?)\n\};/);
  assert.ok(iconBlock);
  assert.doesNotMatch(iconBlock[1], /profile\s*:/);
  assert.doesNotMatch(iconBlock[1], /search\s*:/);
});
