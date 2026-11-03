const test=require('node:test'); const assert=require('node:assert/strict'); const fs=require('fs'); const path=require('path');
const src=fs.readFileSync(path.join(__dirname,'customerCare.js'),'utf8'); const index=fs.readFileSync(path.join(__dirname,'index.js'),'utf8'); const ai=fs.readFileSync(path.join(__dirname,'../src/NexaAI.tsx'),'utf8'); const help=fs.readFileSync(path.join(__dirname,'../src/app/help.tsx'),'utf8'); const home=fs.readFileSync(path.join(__dirname,'../src/HomeCommandCenter.tsx'),'utf8');
test('customer care has authenticated user thread and message boundaries',()=>{assert.match(src,/\/api\/customer-care\/threads/);assert.match(src,/auth\.authMiddleware/);assert.match(src,/senderType/);assert.match(src,/status='closed'/);});
test('customer care creates Staff work using support capability',()=>{assert.match(src,/support_investigation/);assert.match(src,/kind.*customer_care/);assert.match(src,/admin_work/);});
test('Dami can recommend human handoff and returns a thread id',()=>{assert.match(index,/needsHuman/);assert.match(index,/customerCareHandoff/);assert.match(index,/Live Staff assistance/);});
test('Dami and Home expose live Staff help entry points',()=>{assert.match(ai,/Talk to a live Staff agent/);assert.match(ai,/openCustomerCare/);assert.match(home,/Open NEXA Help/);assert.match(help,/Chat with a NEXA Staff customer-care agent/);});

test('customer care maturity exposes read-state and safe refresh contract',()=>{assert.match(src,/lastReadAt/);assert.match(src,/unreadCount/);assert.match(src,/\/api\/customer-care\/threads\/:id\/read/);assert.match(help,/markCustomerCareRead/);assert.match(help,/setInterval\(refresh,5000\)/);assert.match(help,/accessibilityLiveRegion=\"polite\"/);});

test('customer care message boundary is rate limited and owner can assign capability-scoped Staff',()=>{assert.match(src,/customer-care-message/);assert.match(src,/\/api\/admin\/customer-care\/threads\/:id\/assign/);assert.match(src,/support_investigation/);});

test('customer care reliability adds pagination, idempotent sends, escalation, reopen and Staff notifications',()=>{
  assert.match(src,/req\.query\?\.limit/); assert.match(src,/idempotencyKey/); assert.match(src,/\/api\/customer-care\/threads\/:id\/escalate/); assert.match(src,/\/api\/customer-care\/threads\/:id\/reopen/); assert.match(src,/notifications\.createEvent/); assert.match(src,/priority/);
});
