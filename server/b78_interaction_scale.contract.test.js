const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
function read(p){return fs.readFileSync(path.join(__dirname,'..',p),'utf8');}

test('B78 shared interaction helper is grounded in the existing accessibility contract',()=>{
 const src=read('src/interactionAccessibility.ts'); const a=read('src/accessibility.ts');
 assert.match(src,/ACCESSIBILITY\.minTouchTarget/); assert.match(a,/minTouchTarget: 44/); assert.match(src,/minHeight: ACCESSIBILITY\.minTouchTarget/);
});
test('B78 shared pressables enforce the minimum usable touch target without changing roles',()=>{
 const src=read('src/motion.tsx'); assert.match(src,/touchTargetStyle/); assert.match(src,/focusable=\{!disabled\}/); assert.match(src,/accessibilityRole=\{accessibilityRole\}/);
});
test('B78 Dami quick actions and settings retain their actions while meeting the touch floor',()=>{
 const src=read('src/NexaAI.tsx'); assert.match(src,/minHeight:44,backgroundColor/); assert.match(src,/minHeight:44,paddingVertical:8/); assert.match(src,/Dami settings/); assert.match(src,/Quick Scam Check/);
});
test('B78 primary shell navigation exposes a 44px interaction floor',()=>{const src=read('src/HomeCommandCenter.tsx')+read('src/nexaNavKeys.ts');assert.match(src,/minHeight:44/);assert.match(src,/Dream Marketplace/);assert.match(src,/Inbox/);});
test('B78 navigation titles can reflow at enlarged text sizes',()=>{const src=read('src/NexaNavKeys.tsx');assert.match(src,/numberOfLines=\{2\}/);assert.doesNotMatch(src,/numberOfLines=\{1\} accessibilityRole="header"/);});
test('B78 search controls remain reachable at enlarged text size',()=>{const src=read('src/UnifiedSearch.tsx');assert.match(src,/Close search/);assert.match(src,/minHeight:44,paddingHorizontal:12/);assert.match(src,/Search NEXA/);});
test('B78 Home call controls meet the interaction floor without changing call authority',()=>{const src=read('src/HomeCommandCenter.tsx');assert.match(src,/closeButton:\{width:44,height:44/);assert.match(src,/videoCall:\{minHeight:44/);assert.match(src,/startCall:\{minHeight:44/);});
test('B78 Yaayz discovery action keeps the existing ticket handler while gaining a 44px hit area',()=>{const src=read('src/YaayzHomeFeed.tsx');assert.match(src,/onOpenTickets/);assert.match(src,/minHeight:44,minWidth:44/);});
test('B78 text-scale contract acknowledges the existing 145 percent user setting',()=>{const src=read('src/accessibility.ts');const scale=read('src/nexaTextScale.ts');assert.match(src,/maxSupportedTextScale: 1.45/);assert.match(scale,/1\.45/);});
test('B78 no new business authority is introduced by the interaction layer',()=>{const src=read('src/interactionAccessibility.ts');assert.doesNotMatch(src,/fetch\(|authedFetch|router|payment|ticket|admin|subscription/);});
