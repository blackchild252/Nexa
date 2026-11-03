const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

test('B73 shared focus primitive exposes keyboard focus without changing native motion semantics', () => {
  const src = read('src/motion.tsx');
  assert.match(src, /Platform\.OS==='web'/);
  assert.match(src, /onFocus=\{\(\)=>setFocused\(true\)\}/);
  assert.match(src, /onBlur=\{\(\)=>setFocused\(false\)\}/);
  assert.match(src, /focusable=\{!disabled\}/);
  assert.match(src, /outlineWidth:2/);
});

test('B73 focus treatment respects both NEXA themes', () => {
  const src = read('src/motion.tsx');
  assert.match(src, /currentThemeMode\(\)==='dark'\?'#FFD700':'#1767A9'/);
});

test('B73 Home rails and directory controls use the shared focus primitive', () => {
  const src = read('src/HomeCommandCenter.tsx');
  assert.match(src, /<NexaFocusPressable onPress=\{onPress\}/);
  assert.match(src, /Open NEXA directory/);
  assert.match(src, /Close NEXA directory/);
  assert.match(src, /<NexaFocusPressable key=\{id\}/);
});

test('B73 keyboard focus remains bounded to interactive controls', () => {
  const src = read('src/motion.tsx');
  assert.doesNotMatch(src, /tabIndex:\s*-?1/);
  assert.match(src, /disabled=\{disabled\}/);
  assert.match(src, /accessibilityRole=\{accessibilityRole\}/);
});

test('B73 reduced motion and existing motion tiers remain authoritative', () => {
  const src = read('src/motion.tsx');
  assert.match(src, /if\(level<=0\|\|reducedMotion\|\|disabled\)return/);
  assert.match(src, /allows:\(name:MotionName\)=>!reducedMotion&&level>=MOTION_CATALOG\[name\]/);
});
