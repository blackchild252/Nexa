const test=require('node:test');
const {atLeast,currentVersionMd}=require('./versionAtLeast');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=(p)=>fs.readFileSync(path.join(__dirname,p),'utf8');

test('V5 versioning is canonical',()=>{
 const pkg=JSON.parse(read('package.json')); assert.ok(atLeast(pkg.version,'5.8.0'),'version must be at least 5.8.0'); const serverPkg=JSON.parse(fs.readFileSync(path.join(__dirname,'package.json'),'utf8')); assert.ok(atLeast(serverPkg.version,'5.8.0'),'version must be at least 5.8.0');
 assert.ok(atLeast(currentVersionMd(read('../VERSION.md')),'5.8.0'));
 assert.doesNotMatch(read('../VERSION.md'),/V4\.100\.0/);
});
test('Marketplace notification targets retain order identity',()=>{
 const s=read('../src/nexaNavigation.ts');
 assert.match(s,/mall_vendor.*\/marketplace\/vendor/s); assert.match(s,/mall_orders.*orderId: id/s);
});
test('Yaayz ticket notification retains order identity',()=>{
 const s=read('../src/nexaNavigation.ts'); assert.match(s,/case 'ticket'.*ticketOrderId: id/s);
 const y=read('../src/YaayzScreen.tsx'); assert.match(y,/ticketOrderId/); assert.match(y,/Opening ticket order/);
});
test('Money group notification opens the requested group',()=>{
 const s=read('../src/app/(tabs)/money.tsx'); assert.match(s,/params\.groupId/); assert.match(s,/groups\.openGroup/);
});
test('Money group list ignores stale responses',()=>{
 const s=read('../src/useGroups.ts'); assert.match(s,/listRequest/); assert.match(s,/requestId === listRequest\.current/);
});
test('Zeeza search result can seed Friends search',()=>{
 const z=read('../src/app/(tabs)/zeeza.tsx'); const f=read('../src/FriendsScreen.tsx');
 assert.match(z,/requestedResultId/); assert.match(z,/initialSearch=\{requestedResultId\}/); assert.match(f,/initialSearch\?: string/);
});
test('Marketplace order deep link opens Orders surface',()=>{
 const r=read('../src/app/(tabs)/marketplace.tsx'); const m=read('../src/MarketplaceScreen.tsx');
 assert.match(r,/orderId/); assert.match(r,/initialTab/); assert.match(m,/initialTab==='orders'/); assert.match(m,/setOrdersOpen\(true\)/);
});
test('Generic chat notification opens Zeeza Inbox',()=>{ const s=read('../src/nexaNavigation.ts'); assert.match(s,/case 'chat': return validateNavigationTarget\({ pathname: '\/\(tabs\)\/zeeza'/); });
test('Vendor staff notification opens the vendor staff surface',()=>{ const s=read('../src/nexaNavigation.ts'); assert.match(s,/case 'vendor_staff'.*tab: 'staff'/s); });
test('Canonical navigation keeps compatibility boundaries',()=>{
 const s=read('../src/nexaNavigation.ts'); assert.match(s,/case 'marketplace'/); assert.match(s,/case 'mall_vendor'/); assert.match(s,/case 'mall_orders'/); assert.match(s,/case 'ticket'/);
});
test('No active V4.100.0 version metadata remains',()=>{
 for(const p of ['package.json','VERSION.md']) assert.doesNotMatch(read('../'+p),/4\.100\.0/);
});
test('B37 report records the ten-item scope',()=>{
 const s=read('../V5_1_0_IMPLEMENTATION_REPORT.md'); assert.match(s,/V5\.1\.0/); assert.match(s,/10\./);
});
