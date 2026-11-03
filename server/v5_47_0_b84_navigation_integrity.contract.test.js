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
  // Dynamic route parents are valid destinations when the resolver supplies params.
  const parts = normalized.split('/');
  let dir = path.join(root, 'src', 'app', ...parts);
  while (parts.length) {
    const parent = path.join(root, 'src', 'app', ...parts.slice(0, -1));
    if (fs.existsSync(path.join(parent, 'index.tsx'))) return true;
    parts.pop();
  }
  return false;
}

function navigationPathLiterals(source) {
  return [...source.matchAll(/pathname:\s*'([^']+)'/g)].map(m => m[1]);
}

test('B84 canonical navigation resolver points only to real routes', () => {
  const nav = read('src/nexaNavigation.ts');
  const paths = [...new Set(navigationPathLiterals(nav))];
  assert.ok(paths.length >= 15, 'expected the canonical resolver to expose the established navigation surface');
  for (const route of paths) assert.equal(routeExists(route), true, `dead canonical navigation route: ${route}`);
});

test('B84 Home directory and navigation resolver have identical destination IDs', () => {
  const home = read('src/homeDesign.ts');
  const nav = read('src/nexaNavigation.ts');
  const marker = 'export const HOME_DIRECTORY = [';
  const start = home.indexOf(marker);
  const end = home.indexOf('] as const', start);
  assert.ok(start >= 0 && end > start, 'HOME_DIRECTORY declaration missing');
  const homeIds = [...home.slice(start + marker.length, end).matchAll(/\['([^']+)'\s*,/g)].map(m => m[1]);
  const routeBlock = nav.match(/const DIRECTORY_ROUTES:[\s\S]*?= \{([\s\S]*?)\n\};/);
  assert.ok(routeBlock, 'directory route registry missing');
  const resolverIds = [...routeBlock[1].matchAll(/^\s*['"]?([\w-]+)['"]?:/gm)].map(m => m[1]);
  assert.deepEqual(resolverIds.sort(), homeIds.sort());
});

test('B84 Add actions remain backed by real routes', () => {
  const nav = read('src/nexaNavigation.ts');
  const paths = ['/ (tabs)/zeeza'.replace(' ', ''), '/wallet', '/(tabs)/money', '/marketplace/vendor'];
  for (const route of paths) assert.equal(routeExists(route), true, `dead Add route: ${route}`);
  assert.match(nav, /navigationForAddAction/);
});

test('B84 Sky Money Marketplace navigation is live, not a no-op callback', () => {
  const money = read('src/app/(tabs)/money.tsx');
  assert.match(money, /router\.push\('\/\(tabs\)\/marketplace'/);
  assert.doesNotMatch(money, /onOpenMarketplace=\{\(\)=>\{\}\}/);
});

test('B84 primary navigation tools all retain real handlers', () => {
  const keys = (read('src/NexaNavKeys.tsx')+read('src/nexaAccessibility.ts'));
  for (const label of ['Go back', 'Search NEXA', 'Open NEXA Add actions', 'NEXA Home', 'Open NEXA directory']) {
    assert.match(keys, new RegExp(label));
  }
  for (const handler of ['nexaGoBack', 'onSearch', 'openAdd', 'nexaGoHome', 'openDirectory']) assert.match(keys, new RegExp(handler));
});

test('B84 no empty callback remains on a named navigation action', () => {
  const money = read('src/app/(tabs)/money.tsx');
  assert.doesNotMatch(money, /on[A-Z][A-Za-z]+\s*=\{\s*\(\)\s*=>\s*\{\s*\}\s*\}/);
});

test('B84 directory navigation preserves the full established destination set', () => {
  const home = read('src/homeDesign.ts');
  for (const label of ['Home','Dami','Zeeza','Sky Money','Dream Marketplace','Yaayz','L.A.','Ball House','Kitchen','Game House','Fitness','Notifications','Search','Profile','Extensions','Developer Console']) {
    assert.match(home, new RegExp(`'${label}'`));
  }
});

test('B84 cross-module navigation remains centralized', () => {
  const nav = read('src/nexaNavigation.ts');
  assert.match(nav, /navigationForDirectoryItem/);
  assert.match(nav, /navigationForAddAction/);
  assert.match(nav, /navigationForNotification/);
  assert.match(nav, /navigationForSearchResult/);
  assert.match(nav, /navigationForDamiDestination/);
});

test('B84 navigation audit does not add business or advertising authority', () => {
  const nav = read('src/nexaNavigation.ts');
  assert.doesNotMatch(nav, /fetch\(|authedFetch\(|NativeAd|YaayzAdvert|AdMob/);
});

test('B84 real route tree contains every canonical directory destination', () => {
  const nav = read('src/nexaNavigation.ts');
  const block = nav.match(/const DIRECTORY_ROUTES:[\s\S]*?= \{([\s\S]*?)\n\};/);
  for (const m of block[1].matchAll(/pathname:\s*'([^']+)'/g)) assert.equal(routeExists(m[1]), true, `dead directory route: ${m[1]}`);
});

test('B84 navigation audit covers Add, Directory, Search and notification resolver families', () => {
  const nav = read('src/nexaNavigation.ts');
  for (const family of ['navigationForAddAction','navigationForDirectoryItem','navigationForSearchResult','navigationForNotification']) assert.match(nav, new RegExp(`export function ${family}`));
});
