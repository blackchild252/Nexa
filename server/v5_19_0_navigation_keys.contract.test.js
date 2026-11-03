const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

test('B55 pure nav helpers: visibility, titles, back fallback', () => {
  const source = read('src/nexaNavKeys.ts')
    .replace(/^export type .*$/gm, '')
    .replace(/export function /g, 'function ')
    .replace(/export const /g, 'const ')
    .replace(/: string \| null \| undefined/g, '')
    .replace(/: string/g, '')
    .replace(/: boolean/g, '')
    .replace(/: BackDecision/g, '')
    .replace(/: Array<\[string, string\]>/g, '')
    .replace(/ as const/g, '')
    .replace(/\nexport /g, '\n');
  const module = { exports: {} };
  const factory = new Function('module', 'exports', `${source}\nmodule.exports = { normalizePath, navKeysVisible, titleForPath, directoryIdForPath, decideBack };`);
  factory(module, module.exports);
  const k = module.exports;
  for (const p of ['/', '', '/dami', '/auth/login', '/zeeza/call', '/zeeza/group-call', '/zeeza/share/abc']) assert.equal(k.navKeysVisible(p), false, p);
  for (const p of ['/money', '/leisure/kitchen', '/leisure/ball-house', '/search', '/extensions', '/wallet', '/zeeza/profile']) assert.equal(k.navKeysVisible(p), true, p);
  assert.equal(k.titleForPath('/leisure/ball-house'), 'Ball House');
  assert.equal(k.titleForPath('/money'), 'Sky Money');
  assert.equal(k.titleForPath('/(tabs)/money'), 'Sky Money');
  assert.equal(k.titleForPath('/(tabs)/yaayz'), 'Yaayz');
  assert.equal(k.directoryIdForPath('/(tabs)/marketplace'), 'marketplace');
  assert.equal(k.directoryIdForPath('/(tabs)/search'), 'search');
  assert.equal(k.directoryIdForPath('/leisure/fitness'), 'fitness');
  assert.equal(k.decideBack(true), 'back');
  assert.equal(k.decideBack(false), 'home');
});

test('B55 global bar is mounted once in the root layout without moving providers', () => {
  const layout = read('src/app/_layout.tsx');
  assert.match(layout, /<AuthProvider>.*<MotionProvider>/s);
  assert.match(layout, /<NexaNavProvider( key=\{appearance\})?><RootNavigator\/><\/NexaNavProvider>/);
  const keys = (read('src/NexaNavKeys.tsx')+read('src/nexaAccessibility.ts'));
  for (const label of ['Go back', 'Search NEXA', 'NEXA Home', 'Open NEXA directory']) assert.match(keys, new RegExp(label));
});

test('B55 search is not an unlabeled tab and its close key works', () => {
  assert.match(read('src/app/(tabs)/_layout.tsx'), /name="search" options=\{\{href:null\}\}/);
  assert.doesNotMatch(read('src/app/(tabs)/search.tsx'), /onClose=\{\(\) => \{\}\}/);
});

test('B55 Home call sheet has no undefined media / missing Alert', () => {
  const home = read('src/HomeCommandCenter.tsx');
  assert.match(home, /import \{ Alert, Animated/);
  assert.doesNotMatch(home, /start an \{media\} call/);
});

test('B55 directory Notifications opens the Notification Center', () => {
  assert.match(read('src/nexaNavigation.ts'), /notifications: \{ pathname: '\/\(tabs\)', params: \{ panel: 'notifications' \} \}/);
  assert.match(read('src/app/(tabs)/index.tsx'), /params\.panel === 'notifications'/);
});

test('B55 no raw router.back() remains outside the back helper', () => {
  for (const f of ['src/Wallet.tsx', 'src/Subscription.tsx', 'src/app/extensions.tsx', 'src/app/developer.tsx', 'src/app/marketplace/vendor.tsx', 'src/app/leisure/ball-house/index.tsx', 'src/app/leisure/game-house/index.tsx', 'src/app/leisure/fitness/index.tsx']) assert.doesNotMatch(read(f), /router\.back\(\)/, f);
});

test('B55 version is synchronized (5.19.0 or later)', () => {
  const atLeast = v => { const [a, b] = String(v).split('.').map(Number); return a > 5 || (a === 5 && b >= 19); };
  for (const f of ['package.json', 'server/package.json', 'app.json']) assert.ok(atLeast(JSON.parse(read(f)).version), f);
  const current = JSON.parse(read('package.json')).version; assert.match(read('VERSION.md'), new RegExp('V'+current.replace(/\./g,'\\.')));
});
