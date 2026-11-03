const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const migrated = [
  'src/HomeCommandCenter.tsx','src/MarketplaceScreen.tsx','src/MarketplaceStorefront.tsx','src/GroupScreen.tsx',
  'src/NexaAI.tsx','src/YaayzHomeFeed.tsx','src/VendorDashboard.tsx','src/MoneyDashboard.tsx',
  'src/UnifiedSearch.tsx','src/ZeezaInbox.tsx','src/ExtensionsScreen.tsx','src/NotificationCenter.tsx'
];
const motion = read('src/motion.tsx');
const source = migrated.map(read).join('\n');
const b216Report = read('B216_REPORT.md');

test('M3275 motion adoption inventory exists',()=>assert.equal(migrated.length,12));
test('M3276 shared NexaPressable remains the interaction authority',()=>assert.match(motion,/export function NexaPressable/));
test('M3277 shared press primitive forwards accessibility state',()=>assert.match(motion,/accessibilityState=\{accessibilityState\}/));
test('M3278 shared press primitive forwards hit slop',()=>assert.match(motion,/hitSlop=\{hitSlop\}/));
test('M3279 Home no longer uses direct TouchableOpacity',()=>assert.doesNotMatch(read('src/HomeCommandCenter.tsx'),/TouchableOpacity/));
test('M3280 Marketplace no longer uses direct TouchableOpacity',()=>assert.doesNotMatch(read('src/MarketplaceScreen.tsx'),/TouchableOpacity/));
test('M3281 Marketplace storefront no longer uses direct TouchableOpacity',()=>assert.doesNotMatch(read('src/MarketplaceStorefront.tsx'),/TouchableOpacity/));
test('M3282 Group screen no longer uses direct TouchableOpacity',()=>assert.doesNotMatch(read('src/GroupScreen.tsx'),/TouchableOpacity/));
test('M3283 Dami/NexaAI no longer uses direct TouchableOpacity',()=>assert.doesNotMatch(read('src/NexaAI.tsx'),/TouchableOpacity/));
test('M3284 Yaayz home feed no longer uses direct TouchableOpacity',()=>assert.doesNotMatch(read('src/YaayzHomeFeed.tsx'),/TouchableOpacity/));
test('M3285 Vendor dashboard no longer uses direct TouchableOpacity',()=>assert.doesNotMatch(read('src/VendorDashboard.tsx'),/TouchableOpacity/));
test('M3286 Money dashboard no longer uses direct TouchableOpacity',()=>assert.doesNotMatch(read('src/MoneyDashboard.tsx'),/TouchableOpacity/));
test('M3287 Unified Search no longer uses direct TouchableOpacity',()=>assert.doesNotMatch(read('src/UnifiedSearch.tsx'),/TouchableOpacity/));
test('M3288 Zeeza inbox no longer uses direct TouchableOpacity',()=>assert.doesNotMatch(read('src/ZeezaInbox.tsx'),/TouchableOpacity/));
test('M3289 Extensions no longer uses direct TouchableOpacity',()=>assert.doesNotMatch(read('src/ExtensionsScreen.tsx'),/TouchableOpacity/));
test('M3290 Notifications no longer uses direct TouchableOpacity',()=>assert.doesNotMatch(read('src/NotificationCenter.tsx'),/TouchableOpacity/));
test('M3291 migrated controls use shared press authority',()=>assert.ok((source.match(/<NexaPressable\b/g)||[]).length>=100));
test('M3292 free tier remains static',()=>assert.match(motion,/freeTierStatic:\s*true/));
test('M3293 reduced motion remains authoritative',()=>assert.match(motion,/!reducedMotion/));
test('M3294 shared press animations retain cleanup',()=>assert.match(motion,/springRef\.current\?\.stop\(\)/));
test('M3295 motion animations retain cleanup helper',()=>assert.match(motion,/function stopNexaAnimations/));
test('M3296 migrated screens preserve tab semantics',()=>assert.ok((source.match(/accessibilityRole="tab"/g)||[]).length>=10));
test('M3297 migrated screens preserve disabled state semantics',()=>assert.ok((source.match(/accessibilityState=\{\{disabled/g)||[]).length>=20));
test('M3298 migrated screens retain touch-target styling',()=>assert.match(motion,/touchTargetStyle/));
test('M3299 release metadata is registered for B216',()=>{assert.match(b216Report,/V5\.98\.68|B216/); assert.match(b216Report,/M3275–M3299/);});
