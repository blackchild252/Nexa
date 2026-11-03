const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');

test('B414 AI beautification is server-restricted to the main image',()=>{
 const s=read('server/index.js');
 assert.match(s,/images\/beautify", auth\.authMiddleware, requireVendorAccess, vendorProductAiLimiter, vendorProductAiDailyLimiter/);
 assert.match(s,/if\(n!==0\)return res\.status\(403\)\.json\(\{error:"AI beautification is available only for the main product image/);
 assert.match(s,/if\(n!==0\)return res\.status\(403\)\.json\(\{error:"Only the main product image can be saved/);
});

test('B414 Vendor Staff retains vendor-scoped access to the beautifier',()=>{
 const staff=read('server/staff.js');
 const ui=read('src/VendorPhotos.tsx');
 assert.match(staff,/req\.vendorRole = staffRole/);
 assert.match(staff,/return next\(\);/);
 assert.match(ui,/i===0\?<[\s\S]*AI Main Image/);
 assert.match(ui,/Real reference/);
 assert.doesNotMatch(ui,/Beautify photo \$\{i\+1\} with AI/);
});

test('B414 the product photo surface is main image plus four real references',()=>{
 const ui=read('src/VendorPhotos.tsx');
 assert.match(ui,/const MAX_PHOTOS=6/);
 assert.match(ui,/main image \+ up to 4 real reference photos/);
 assert.match(ui,/Photos 2–5 remain the original reference photos/);
});
