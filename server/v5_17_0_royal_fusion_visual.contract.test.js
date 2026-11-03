const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

function read(file){ return fs.readFileSync(path.join(root,file),'utf8'); }

test('Royal Fusion visual system centralizes the three layers', () => {
  const visual = read('src/nexaVisualSystem.ts');
  assert.match(visual, /environment/);
  assert.match(visual, /depth/);
  assert.match(visual, /motion/);
});

test('Theme exposes the Royal Fusion material and gradient roles', () => {
  const theme = read('src/theme.ts');
  assert.match(theme, /version: '2\.\d+'/);
  assert.match(theme, /borderQuiet/);
  assert.match(theme, /goldSoft/);
  assert.match(theme, /readability/);
});

test('Depth layer remains mobile-safe and pointer-free', () => {
  const depth = read('src/NexaDepthLayer.tsx');
  assert.match(depth, /pointerEvents="none"/);
  assert.match(depth, /expo-linear-gradient/);
  assert.match(depth, /world-ambient/);
  assert.match(depth, /vip-spotlight/);
});

test('Motion catalog keeps subscription levels and reduced motion authority', () => {
  const motion = read('src/motion.tsx');
  assert.match(motion, /free:BASIC_MOTION_LEVEL, regular:30, premium:60, vip:100/);
  assert.match(motion, /world-ambient['\"]:60/);
  assert.match(motion, /vip-spotlight['\"]:100/);
  assert.match(motion, /!reducedMotion/);
});

test('World background composes environment, depth and readability', () => {
  const world = read('src/NexaWorldBackground.tsx');
  assert.match(world, /NexaDepthLayer/);
  assert.match(world, /LinearGradient/);
  assert.match(world, /pointerEvents="none"/);
});

test('Subscription visual policy preserves all four experience tiers', () => {
  const tokens = JSON.parse(read('assets/design/NEXA_THEME_INTERFACE_V2_0_TOKENS.json'));
  assert.deepEqual(Object.keys(tokens.subscriptionVisualPolicy), ['free','regular','premium','vip']);
  assert.equal(tokens.subscriptionVisualPolicy.free.motion, false);
  assert.equal(tokens.subscriptionVisualPolicy.regular.motion, true);
  assert.equal(tokens.subscriptionVisualPolicy.premium.ambient, true);
  assert.equal(tokens.subscriptionVisualPolicy.vip.vipSpotlight, true);
});

test('Theme interface folder has a versioned Royal Fusion contract', () => {
  const doc = read('assets/design/NEXA_THEME_INTERFACE_V2_0.md');
  assert.match(doc, /Royal Fusion/);
  assert.match(doc, /Mobile rules/);
  assert.match(doc, /Reuse contract/);
});

test('No second theme system is introduced', () => {
  const theme = read('src/theme.ts');
  const visual = read('src/nexaVisualSystem.ts');
  assert.match(theme, /Royal Fusion/);
  assert.match(visual, /NEXA_VISUAL_SYSTEM_VERSION/);
  assert.doesNotMatch(visual, /createTheme|ThemeProvider/);
});

test('Existing Home remains the canonical command-center composition', () => {
  const home = read('src/homeDesign.ts');
  assert.match(home, /home-command-center/);
  assert.match(home, /dami-ai/);
  assert.match(home, /zeeza-friends/);
  assert.match(home, /calls/);
});

test('Root shell keeps MotionProvider above navigation', () => {
  const rootLayout = read('src/app/_layout.tsx');
  assert.match(rootLayout, /AuthProvider><NexaLocationProvider><MotionProvider>/);
  assert.match(rootLayout, /<Stack/);
});
