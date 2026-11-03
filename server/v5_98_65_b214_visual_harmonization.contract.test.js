const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const motion = read('src/motion.tsx');
const nav = read('src/NexaNavKeys.tsx');
const textSize = read('src/NexaTextSizeControl.tsx');
const depth = read('src/NexaDepthLayer.tsx');
const dami = read('src/NexaAvatar.tsx');
const damiCompatibility = read('src/NexaDamiRobot.tsx');
const coverage = read('server/motionCoverage.js');
const visual = read('src/nexaVisualSystem.ts');

test('M3240 shared motion authority remains the single tier/reduced-motion gate', () => {
  assert.match(motion, /export function useMotion\(\)/);
  assert.match(motion, /reducedMotionWins: true/);
  assert.match(motion, /freeTierStatic: true/);
});
test('M3241 navigation controls use shared press feedback', () => {
  assert.match(nav, /NexaPressable/);
  assert.doesNotMatch(nav, /<TouchableOpacity/);
});
test('M3242 text-size controls use shared interaction motion', () => {
  assert.match(textSize, /NexaPressable/);
  assert.doesNotMatch(textSize, /TouchableOpacity/);
});
test('M3243 depth layer cleans every running loop when motion is disabled', () => {
  assert.match(depth, /drift\.stopAnimation\(\);/);
  assert.match(depth, /spin\.stopAnimation\(\);/);
  assert.match(depth, /spin\.setValue\(0\);/);
});
test('M3244 Dami does not capture decorative touches', () => {
  assert.match(dami, /onStartShouldSetPanResponder: \(\) => Boolean\(pressRef\.current\)/);
});
test('M3245 Dami reduced-motion path preserves tap without tilt animation', () => {
  assert.match(dami, /const \{ allows, reducedMotion \} = useMotion\(\);/);
  assert.match(dami, /const go = animate && !reducedMotion && allows\('dami'\);/);
  assert.match(dami, /if \(!go\) \{ t\.stopAnimation\(\); t\.setValue\(0\); blink\.setValue\(1\); return; \}/);
  assert.match(damiCompatibility, /AvatarStage cfg=\{cfg\} size=\{size\} onPress=\{onPress\}/);
});
test('M3246 visual layers remain input-transparent', () => {
  assert.match(visual, /decorativeLayersPointerEvents: 'none'/);
  assert.match(visual, /contentAlwaysAboveVisualLayers: true/);
});
test('M3247 reduced motion remains globally authoritative', () => {
  assert.match(motion, /!reducedMotion&&level>=MOTION_CATALOG\[name\]/);
  assert.match(motion, /if\(reducedMotion\|\|level<30\)/);
});
test('M3248 motion coverage exposes major NEXA surfaces through shared authority', () => {
  assert.match(coverage, /home:/);
  assert.match(coverage, /marketplace:/);
  assert.match(coverage, /yaayz:/);
  assert.match(coverage, /zeeza:/);
});
test('M3249 no destructive visual architecture replacement was introduced', () => {
  assert.match(visual, /dependency-free and mobile-safe/);
  assert.match(visual, /does not change[\s\S]*product semantics, navigation, subscription authority or data behavior/);
});
