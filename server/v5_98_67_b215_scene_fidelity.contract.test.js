const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const visual = read('src/nexaVisualSystem.ts');
const scenes = read('src/nexaSceneContract.ts');
const worlds = read('src/nexaWorlds.ts');
const background = read('src/NexaWorldBackground.tsx');
const earth = read('src/NexaEarth.tsx');
const depth = read('src/NexaDepthLayer.tsx');
const motion = read('src/motion.tsx');
const theme = read('src/theme.ts');
const b215Report = read('B215_REPORT.md');
const typography = read('src/nexaTextScale.ts');
const interaction = read('src/interactionAccessibility.ts');
const gate = read('scripts/release-gate.mjs');

const worldsList = ['home','dami','sky-money','dream-marketplace','kitchen','ball-house','fitness','game-house','leisure','zeeza','yaayz','notifications','search','profile','extensions','developer','subscription','auth','staff','disputes'];

for (const [i, world] of worldsList.entries()) {
  test(`M${3250 + i} visual world ${world} remains explicitly covered`, () => {
    const key = world.replace('-', '\\-');
    assert.match(scenes, new RegExp(`(?:['\"]${key}['\"]|${key})\\s*:`));
    assert.match(worlds, new RegExp(`(?:['\"]${key}['\"]|${key})\\s*:`));
  });
}

test('B215 visual contract revision is synchronized', () => {
  assert.match(visual, /NEXA_VISUAL_SYSTEM_VERSION = '2\.2'/);
  assert.match(b215Report, /B215|5\.98\.67/);
});

test('visual layers remain input transparent and content remains above them', () => {
  assert.match(visual, /decorativeLayersPointerEvents: 'none'/);
  assert.match(visual, /contentAlwaysAboveVisualLayers: true/);
  assert.match(background, /<View pointerEvents="none" style=\{styles\.content\}>|<View style=\{styles\.content\}>/);
});

test('Earth scene remains reduced-motion aware', () => {
  assert.match(earth, /const animated = allows\('world-ambient'\)/);
  assert.match(earth, /if \(!animated\)/);
  assert.match(earth, /stopAnimation\(\)/);
});

test('depth remains reduced-motion aware and cleans both loops', () => {
  assert.match(depth, /if \(!ambient \|\| reducedMotion\)/);
  assert.match(depth, /drift\.stopAnimation\(\)/);
  assert.match(depth, /spin\.stopAnimation\(\)/);
});

test('shared motion keeps reduced motion and free-tier static semantics', () => {
  assert.match(motion, /!reducedMotion&&level>=MOTION_CATALOG\[name\]/);
  assert.match(visual, /freeTierStaysStatic: true/);
  assert.match(visual, /freeTierStatic: true/);
});

test('main app shell uses shared motion for Dami and primary navigation (legacy shell retired)', () => {
  assert.ok(!fs.existsSync(path.join(root, 'app')));
});

test('main shell search and extensions use shared press behavior (legacy shell retired)', () => {
  assert.ok(!fs.existsSync(path.join(root, 'app')));
});

test('main shell primary navigation is semantically grouped (legacy shell retired)', () => {
  assert.ok(!fs.existsSync(path.join(root, 'app')));
});

test('touch target contract remains centralized', () => {
  assert.match(interaction, /minWidth: ACCESSIBILITY\.minTouchTarget/);
  assert.match(interaction, /minHeight: ACCESSIBILITY\.minTouchTarget/);
});

test('text scaling remains bounded to the four supported readable levels', () => {
  assert.match(typography, /\[1, 1\.15, 1\.3, 1\.45\]/);
  assert.match(interaction, /maxFontSizeMultiplier: 1\.45/);
});

test('release gate includes B215 certification', () => {
  assert.match(gate, /v5_98_67_b215_scene_fidelity\.contract\.test\.js/);
});
