const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('B54 seals one explicit visual layer order', () => {
  const visual = read('src/nexaVisualSystem.ts');
  for (const layer of ['environment', 'depth', 'readability', 'content']) assert.match(visual, new RegExp(layer));
  assert.match(visual, /reducedMotionWins: true/);
  assert.match(visual, /freeTierStaysStatic: true/);
});

test('B54 root navigation respects motion entitlement and reduced motion', () => {
  const layout = read('src/app/_layout.tsx');
  assert.match(layout, /useMotion/);
  assert.match(layout, /reducedMotion \|\| level < BASIC_MOTION_LEVEL \? 'none' : 'fade_from_bottom'/);
});

test('B54 theme exposes semantic materials, typography and accessibility', () => {
  const theme = read('src/theme.ts');
  assert.match(theme, /materials:/);
  assert.match(theme, /typography:/);
  assert.match(theme, /minTouchTarget: 44/);
  assert.match(theme, /preferredTouchTarget: 48/);
});

test('B54 world shell consumes canonical readability gradient', () => {
  const world = read('src/NexaWorldBackground.tsx');
  assert.match(world, /colors=\{theme\.gradients\.readability\}/);
  assert.match(world, /pointerEvents="none"/);
});

test('B54 reusable token JSON is current and complete', () => {
  const tokens = JSON.parse(read('assets/design/NEXA_THEME_INTERFACE_V2_1_TOKENS.json'));
  assert.equal(tokens.version, '2.1');
  assert.equal(tokens.release, '5.18.0');
  assert.deepEqual(tokens.layerOrder, ['environment','depth','readability','content']);
  assert.equal(tokens.accessibility.reducedMotionOverridesMotion, true);
  assert.ok(tokens.materials.glass);
  assert.ok(tokens.typography.title);
});

test('B54 final audit preserves single theme architecture', () => {
  const theme = read('src/theme.ts');
  const visual = read('src/nexaVisualSystem.ts');
  assert.match(theme, /Royal Fusion \/ Royal Gold Dark/);
  assert.doesNotMatch(visual, /ThemeProvider|createTheme/);
});
