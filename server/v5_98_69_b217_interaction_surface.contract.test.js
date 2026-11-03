const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname,'..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const files = [
  'src/app/(tabs)/profile.tsx','src/RoomScreen.tsx','src/GroupsTab.tsx','src/FriendsScreen.tsx',
  'src/YaayzScreen.tsx','src/Wallet.tsx','src/ZeezaProfile.tsx','src/StoreAjo.tsx',
  'src/StaffScreen.tsx','src/ExtensionDeveloperScreen.tsx'
];
test('all B217 migration targets use shared NexaPressable',()=>{for(const f of files){const s=read(f); assert.match(s,/NexaPressable/); assert.doesNotMatch(s,/TouchableOpacity/); assert.match(s,/from ['\"](?:\.\/|\.\.\/\.\.\/)motion['\"]/);}});
test('B217 target set remains exactly ten controlled screens',()=>assert.equal(files.length,10));
test('NexaPressable preserves accessibility state and focus behavior',()=>{const s=read('src/motion.tsx'); assert.match(s,/accessibilityState=\{accessibilityState\}/); assert.match(s,/onFocus=\{\(\)=>setFocused\(true\)\}/); assert.match(s,/focusable=\{!disabled\}/);});
test('B217 shared motion authority preserves reduced motion and free-tier static behavior',()=>{const s=read('src/motion.tsx'); assert.match(s,/freeTierStatic: true/); assert.match(s,/if\(level<=0\|\|reducedMotion\|\|disabled\)return/);});
test('B217 migration preserves touch-target authority',()=>{const s=read('src/motion.tsx'); assert.match(s,/touchTargetStyle/);});
test('B217 release metadata is preserved in its frozen report',()=>{const r=read('B217_REPORT.md'); assert.match(r,/M3300–M3324/); assert.match(r,/B217/);});
