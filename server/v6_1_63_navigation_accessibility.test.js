const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

function routePathForFile(file) {
  let relative = path.relative(path.join(root, 'src/app'), file).split(path.sep).join('/');
  relative = relative.replace(/\.(tsx|ts|jsx|js)$/, '');
  if (relative.endsWith('/index')) relative = relative.slice(0, -6);
  if (relative === 'index') relative = '';
  return '/' + relative;
}
function listRouteFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listRouteFiles(full);
    if (!/\.(tsx|ts|jsx|js)$/.test(entry.name) || entry.name === '+html.tsx' || entry.name === '_layout.tsx') return [];
    return [full];
  });
}

const inventorySource = read('src/nexaRouteInventory.ts');
const appRoutes = listRouteFiles(path.join(root, 'src/app')).map(routePathForFile);
const inventoryMatch = inventorySource.match(/NEXA_ROUTE_INVENTORY\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\s*as const\)/);
const inventory = inventoryMatch ? [...inventoryMatch[1].matchAll(/'([^']+)'/g)].map(m => m[1]) : [];

test('route inventory is parseable and nonempty', () => {
  assert.ok(inventoryMatch, 'canonical route inventory declaration must remain statically readable');
  assert.ok(inventory.length >= 30, `expected at least 30 route targets, got ${inventory.length}`);
});
test('every canonical route resolves to a real Expo Router file', () => {
  const missing = inventory.filter(route => !appRoutes.includes(route));
  assert.deepEqual(missing, [], `route inventory points to missing route files: ${missing.join(', ')}`);
});
test('every non-layout Expo Router route appears in the canonical inventory', () => {
  const missing = appRoutes.filter(route => !inventory.includes(route));
  assert.deepEqual(missing, [], `route files missing from inventory: ${missing.join(', ')}`);
});
test('help search destination is now canonical and backed by a route file', () => {
  assert.ok(inventory.includes('/help'));
  assert.ok(appRoutes.includes('/help'));
  assert.match(read('src/nexaNavigation.ts'), /case 'help':\s*return validateNavigationTarget\(\{ pathname: '\/help'/);
});
test('route inventory matches dynamic parameter route files', () => {
  assert.ok(inventory.includes('/leisure/kitchen/ref/[code]'));
  assert.ok(inventory.includes('/zeeza/share/[token]'));
  assert.ok(appRoutes.includes('/leisure/kitchen/ref/[code]'));
  assert.ok(appRoutes.includes('/zeeza/share/[token]'));
});
test('notification identifiers use a bounded allowlist sanitizer', () => {
  const source = read('src/pushRouting.ts');
  assert.match(source, /export function safeRouteIdentifier\(value: unknown, maxLength = 160\)/);
  assert.match(source, /!\/\^\[A-Za-z0-9\.\_:\-\]\+\$\/\.test\(id\)/);
  assert.match(source, /id\.length > maxLength/);
  assert.match(source, /undefined\|null/);
});
test('push route ids reject malformed thread, room, group and call identifiers', () => {
  const source = read('src/pushRouting.ts');
  for (const id of ['groupId', 'threadId', 'roomId', 'callId']) assert.match(source, new RegExp(`safeRouteIdentifier\\(data\\.${id}\\)`));
});
test('special group-call push path validates call identifier before routing', () => {
  const source = read('src/pushTapRouting.ts');
  assert.match(source, /data\.screen === 'chat_room' && data\.type === 'group_call'/);
  assert.match(source, /const callId = safeRouteIdentifier\(data\.callId\)/);
  assert.match(source, /if \(!callId\) return null/);
});
test('lifestyle post deep links share the same safe identifier contract', () => {
  const source = read('src/pushTapRouting.ts');
  assert.match(source, /const postId = safeRouteIdentifier\(data\.postId\)/);
});
test('navigation validation stays separate from authorization', () => {
  const source = read('src/nexaNavigation.ts');
  assert.match(source, /destination modules remain responsible for their own permissions/);
  assert.match(source, /if \(!target \|\| !isKnownNexaRoute\(target\.pathname\)\) return null/);
});
test('accessibility contract keeps mobile touch target and text scaling bounds', () => {
  const a11y = read('src/accessibility.ts');
  const interaction = read('src/interactionAccessibility.ts');
  const responsive = read('src/nexaResponsive.ts');
  assert.match(a11y, /minTouchTarget: 44/);
  assert.match(interaction, /maxFontSizeMultiplier: 1\.45/);
  assert.match(responsive, /MINIMUM_READABLE_FONT_SIZE = 13/);
  assert.match(responsive, /useSafeAreaInsets/);
});
test('web interaction wrappers preserve focus styling and touch target helpers', () => {
  const motion = read('src/motion.tsx');
  assert.match(motion, /touchTargetStyle/);
  assert.match(motion, /outlineWidth:2/);
  assert.match(motion, /focusable=\{!disabled\}/);
});
test('UI parity gap report distinguishes static checks from device acceptance', () => {
  const report = read('LAUNCH_HANDOFF.md');
  assert.match(report, /device|screen.reader|browser|native/i);
});
