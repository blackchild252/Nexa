"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const leisure=require("./leisureArena");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("V3.87.1 L.A. and Kitchen surfaces are wired into the active Expo shell",()=>{
 const tabs=read("src/app/(tabs)/_layout.tsx");
 assert.match(tabs,/name="leisure" options=\{\{title:BRAND\.leisure\}\}/);
 assert.ok(fs.existsSync(path.join(root,"src/LeisureArenaScreen.tsx"))); assert.ok(fs.existsSync(path.join(root,"src/LeisureKitchenScreen.tsx")));
});

test("Kitchen menu and order validation are server-side",()=>{
 assert.equal(leisure.MENU.length,8); assert.throws(()=>leisure.normalizeItems([])); assert.deepEqual(leisure.normalizeItems([{key:"yam_slices",quantity:3}]),[{key:"yam_slices",name:"Yam Slices",quantity:3}]); assert.throws(()=>leisure.normalizeItems([{key:"unknown",quantity:1}]));
 assert.equal(leisure.orderTotal([{key:"yam_slices",quantity:3},{key:"fried_egg",quantity:1}],{yam_slices:150,fried_egg:250}),700);
});

test("Kitchen referral rules and cashback rate are explicit",()=>{
 assert.equal(leisure.REFERRAL_RATE,0.025); assert.match(read("server/index.js"),/api\/leisure\/kitchen\/referral/); assert.match(read("server/index.js"),/2\.5|REFERRAL_RATE/); assert.match(read("server/index.js"),/You cannot refer yourself/); assert.match(read("server/index.js"),/Number\(order\.total\)<Number\(original\.total\)/);
});

test("AI receipts are authenticated and order-specific",()=>{
 const server=read("server/index.js"); const ui=read("src/LeisureKitchenScreen.tsx");
 assert.match(server,/grokProvider\.generateImage/); assert.match(server,/exactly this order/); assert.match(server,/receipt-data/); assert.match(server,/auth\.authMiddleware/); assert.match(ui,/receipt-data/); assert.match(ui,/receiptImages\[o\.id\]/);
});

test("Kitchen referral deep links use the NEXA scheme",()=>{
 const server=read("server/index.js"); const ui=read("src/LeisureKitchenScreen.tsx");
 assert.match(server,/nexa:\/\/leisure\/kitchen\/ref/); assert.match(ui,/Share referral/); assert.ok(fs.existsSync(path.join(root,"src/app/leisure/kitchen/ref/[code].tsx")));
});
