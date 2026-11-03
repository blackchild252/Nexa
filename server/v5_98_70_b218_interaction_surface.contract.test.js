const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const migrated = [
  'src/FinancialPlanning.tsx','src/MarketInsights.tsx','src/CallScreen.tsx','src/AdminDisputesScreen.tsx',
  'src/LeisureArenaScreen.tsx','src/app/leisure/fitness/index.tsx','src/app/leisure/ball-house/index.tsx',
  'src/app/leisure/kitchen/ref/[code].tsx','src/app/leisure/game-house/index.tsx','src/ThemePicker.tsx'
];
const source = migrated.map(read).join('\n');
const motion = read('src/motion.tsx');

test('M3325 B218 inventory remains exactly ten controlled screens',()=>assert.equal(migrated.length,10));
test('M3326 Financial Planning uses shared press authority',()=>assert.doesNotMatch(read('src/FinancialPlanning.tsx'),/TouchableOpacity/));
test('M3327 Market Insights uses shared press authority',()=>assert.doesNotMatch(read('src/MarketInsights.tsx'),/TouchableOpacity/));
test('M3328 Call screen uses shared press authority',()=>assert.doesNotMatch(read('src/CallScreen.tsx'),/TouchableOpacity/));
test('M3329 Admin disputes uses shared press authority',()=>assert.doesNotMatch(read('src/AdminDisputesScreen.tsx'),/TouchableOpacity/));
test('M3330 Leisure Arena uses shared press authority',()=>assert.doesNotMatch(read('src/LeisureArenaScreen.tsx'),/TouchableOpacity/));
test('M3331 Fitness uses shared press authority',()=>assert.doesNotMatch(read('src/app/leisure/fitness/index.tsx'),/TouchableOpacity/));
test('M3332 Ball House uses shared press authority',()=>assert.doesNotMatch(read('src/app/leisure/ball-house/index.tsx'),/TouchableOpacity/));
test('M3333 Kitchen referral uses shared press authority',()=>assert.doesNotMatch(read('src/app/leisure/kitchen/ref/[code].tsx'),/TouchableOpacity/));
test('M3334 Game House uses shared press authority',()=>assert.doesNotMatch(read('src/app/leisure/game-house/index.tsx'),/TouchableOpacity/));
test('M3335 Theme Picker uses shared press authority',()=>assert.doesNotMatch(read('src/ThemePicker.tsx'),/TouchableOpacity/));
test('M3336 migrated controls use NexaPressable',()=>assert.ok((source.match(/<NexaPressable\b/g)||[]).length>=31));
test('M3337 migrated controls preserve accessibility roles',()=>assert.ok((source.match(/accessibilityRole=/g)||[]).length>=31));
test('M3338 migrated controls preserve accessibility labels',()=>assert.ok((source.match(/accessibilityLabel=/g)||[]).length>=31));
test('M3339 disabled-state semantics remain explicit',()=>assert.ok((source.match(/accessibilityState=\{\{disabled/g)||[]).length>=4));
test('M3340 shared press authority remains exported',()=>assert.match(motion,/export function NexaPressable/));
test('M3341 shared focus authority remains exported',()=>assert.match(motion,/export function NexaFocusPressable/));
test('M3342 reduced motion remains authoritative',()=>assert.match(motion,/reducedMotion/));
test('M3343 free tier remains static',()=>assert.match(motion,/freeTierStatic:\s*true/));
test('M3344 press animation retains cleanup',()=>assert.match(motion,/springRef\.current\?\.stop\(\)/));
test('M3345 touch-target authority remains centralized',()=>assert.match(motion,/touchTargetStyle/));
test('M3346 direct TouchableOpacity inventory is reduced by B218 targets',()=>{const remaining=migrated.filter(f=>/TouchableOpacity/.test(read(f)));assert.equal(remaining.length,0);});
test('M3347 B218 version identity is registered',()=>{const v=read('B218_REPORT.md');assert.match(v,/V5\.98\.70 B218/);assert.match(v,/M3325–M3349/);});
test('M3348 B218 report records the complete roadmap',()=>{const r=read('B218_REPORT.md');assert.match(r,/M3325–M3349/);assert.match(r,/CHECK → FIX → TEST → RECHECK → SEAL/);});
test('M3349 release gate registers B218 contract',()=>assert.match(read('scripts/release-gate.mjs'),/v5_98_70_b218_interaction_surface\.contract\.test\.js/));
