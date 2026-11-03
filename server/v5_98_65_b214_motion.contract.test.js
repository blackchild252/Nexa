const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const motion = fs.readFileSync(path.join(root,'src','motion.tsx'),'utf8');
const data = fs.readFileSync(path.join(root,'src','NexaDataState.tsx'),'utf8');
const nav = fs.readFileSync(path.join(root,'src','NexaNavKeys.tsx'),'utf8');
const layout = fs.readFileSync(path.join(root,'src','app','_layout.tsx'),'utf8');

test('M3235 screen transition remains motion-tier and reduced-motion aware',()=>{
  assert.match(layout,/const animation = reducedMotion \|\| level < BASIC_MOTION_LEVEL \? 'none' : 'fade_from_bottom'/);
});
test('M3236 shared motion surface exists for cards/sheets',()=>{
  assert.match(motion,/export function NexaMotionSurface/);
  assert.match(motion,/requiresCleanup: true/);
});
test('M3237 loading motion uses shared primitive',()=>{
  assert.match(motion,/export function NexaLoadingPulse/);
  assert.match(data,/NexaLoadingPulse/);
  assert.match(data,/motion="loading"/);
});
test('M3238 Add sheet uses shared entrance motion',()=>{
  assert.match(nav,/<NexaMotionSurface visible=\{open\} motion="expand"/);
});
test('M3239 reduced motion disables loading animation',()=>{
  assert.match(motion,/if\(reducedMotion\|\|level<30\)/);
});
test('M3239 loading loop has cleanup',()=>{
  assert.match(motion,/return\(\)=>loop\.stop\(\);/);
});
test('M3239 data retry uses shared press behavior',()=>{
  assert.match(data,/NexaPressable/);
});
test('M3239 decorative motion remains non-interactive contract',()=>{
  assert.match(motion,/decorativeLayersIgnoreInput: true/);
});
