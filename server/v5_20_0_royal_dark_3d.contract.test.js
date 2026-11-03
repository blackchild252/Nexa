const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

test('B56 poster wallpaper is no longer the Home or Dami background', () => {
  const worlds = read('src/nexaWorlds.ts');
  assert.doesNotMatch(worlds, /home:\s*require\(/);
  assert.match(worlds, /home: null/);
  assert.match(worlds, /NEXA_COSMOS_WORLDS/);
  assert.match(read('src/NexaWorldBackground.tsx'), /<NexaCosmos/);
  assert.ok(fs.existsSync(path.join(root, 'assets/design/NEXA_HOME_DESIGN_V1_2_3D_REFERENCE.png')), 'reference asset is kept, just not used as wallpaper');
});

test('B56 cosmos is native, pointer-free and tier-aware', () => {
  const c = read('src/NexaCosmos.tsx');
  assert.match(c, /pointerEvents="none"/);
  assert.match(c, /allows\('world-ambient'\)/);
  assert.match(c, /useNativeDriver: true/);
  assert.doesNotMatch(c, /require\(['"].*\.(png|jpg)/);
});

test('B56 Dami robot slot now renders the cartoon avatar and keeps its props', () => {
  const r = read('src/NexaDamiRobot.tsx');
  for (const part of ['AvatarStage', 'useAvatar', 'waveSpan', 'onPress']) assert.match(r, new RegExp(part));
  assert.doesNotMatch(r, /localStorage/);
});

test('B56 Home uses robot + glossy orbs and keeps existing accessibility labels', () => {
  const h = read('src/HomeCommandCenter.tsx');
  assert.match(h, /<NexaDamiRobot/);
  assert.match(h, /tone="red"/);
  assert.match(h, /tone="blue"/);
  for (const label of ['Open Zeeza friends', 'Open Zeeza calling', 'Open NEXA directory']) assert.match(h, new RegExp(label));
  assert.match(h, /import \{ Alert, Animated/);
});

test('B56 Dami screen shows the robot and lets the cosmos through', () => {
  const a = read('src/NexaAI.tsx');
  assert.match(a, /<NexaDamiRobot/);
  assert.match(a, /embedded\?'transparent'/);
});

test('B56 developer motion preview is dev-only and reduced motion still wins', () => {
  const m = read('src/motion.tsx');
  assert.match(m, /EXPO_PUBLIC_NEXA_MOTION_PREVIEW/);
  assert.match(m, /__DEV__/);
  assert.match(m, /!reducedMotion&&level>=/);
  assert.match(m, /free:BASIC_MOTION_LEVEL, regular:30, premium:60, vip:100/);
});

test('B56 depth layer uses perspective rings', () => {
  const d = read('src/NexaDepthLayer.tsx');
  assert.match(d, /perspective: 800/);
  assert.match(d, /pointerEvents="none"/);
});

test('B56 version and theme docs are synchronized', () => {
  const current = JSON.parse(read('package.json')).version;
  for (const f of ['package.json', 'server/package.json', 'app.json']) assert.equal(JSON.parse(read(f)).version, current, f);
  assert.match(current, /^\d+\.\d+\.\d+$/);
  assert.match(read('VERSION.md'), new RegExp('V'+current.replace(/\./g,'\\.')));
  assert.match(read('VERSION.md'), /B\d+/);
  assert.match(read('src/theme.ts'), new RegExp(`release: '${current.replace('.', '\\.')}'`));
  const tok = JSON.parse(read('assets/design/NEXA_THEME_INTERFACE_V2_2_TOKENS.json'));
  assert.equal(tok.version, '2.2');
  assert.deepEqual(Object.keys(tok.subscriptionVisualPolicy), ['free', 'regular', 'premium', 'vip']);
  assert.match(read('assets/design/NEXA_THEME_INTERFACE_V2_2.md'), /Royal Dark 3D/);
});
