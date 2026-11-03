const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const migrated = [
  'src/Subscription.tsx','src/LeisureKitchenScreen.tsx','src/app/(tabs)/zeeza.tsx','src/ZeezaThreadScreen.tsx',
  'src/YaayzSocialFeed.tsx','src/ZeezaChase.tsx','src/VendorPhotos.tsx','src/GroupCallScreen.tsx',
  'src/app/zeeza/share/[token].tsx','src/app/marketplace/disputes.tsx'
];
const source = migrated.map(read).join('\n');
const motion = read('src/motion.tsx');

test('M3350 B219 inventory contains exactly ten controlled screens',()=>assert.equal(migrated.length,10));
for (const f of migrated) test(`B219 ${f} has no direct TouchableOpacity`,()=>assert.doesNotMatch(read(f),/TouchableOpacity/));
test('M3361 migrated controls use NexaPressable',()=>assert.ok((source.match(/<NexaPressable\b/g)||[]).length>=31));
test('M3362 accessibility roles remain present',()=>assert.ok((source.match(/accessibilityRole=/g)||[]).length>=31));
test('M3363 accessibility labels remain present',()=>assert.ok((source.match(/accessibilityLabel=/g)||[]).length>=31));
test('M3364 disabled-state semantics remain explicit',()=>assert.ok((source.match(/accessibilityState=/g)||[]).length>=5));
test('M3365 shared press authority remains exported',()=>assert.match(motion,/export function NexaPressable/));
test('M3366 shared focus authority remains exported',()=>assert.match(motion,/export function NexaFocusPressable/));
test('M3367 reduced motion remains authoritative',()=>assert.match(motion,/reducedMotion/));
test('M3368 free tier remains static',()=>assert.match(motion,/freeTierStatic:\s*true/));
test('M3369 press animation retains cleanup',()=>assert.match(motion,/springRef\.current\?\.stop\(\)/));
test('M3370 touch-target authority remains centralized',()=>assert.match(motion,/touchTargetStyle/));
test('M3371 all selected B219 targets are direct-touch clean',()=>assert.equal(migrated.filter(f=>/TouchableOpacity/.test(read(f))).length,0));
test('M3372 B219 version identity is registered',()=>{const v=read('B219_REPORT.md');assert.match(v,/V5\.98\.71/);assert.match(v,/M3350–M3374/);});
test('M3373 B219 report records the complete roadmap',()=>{const r=read('B219_REPORT.md');assert.match(r,/M3350–M3374/);assert.match(r,/CHECK → FIX → TEST → RECHECK → SEAL/);});
test('M3374 release gate registers B219 contract',()=>assert.match(read('scripts/release-gate.mjs'),/v5_98_71_b219_interaction_surface\.contract\.test\.js/));
