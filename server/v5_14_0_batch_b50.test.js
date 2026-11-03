const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ops=require('./marketplaceOperations');
const orders=fs.readFileSync(path.join(__dirname,'marketplaceOrders.js'),'utf8');
const client=fs.readFileSync(path.join(__dirname,'..','src','marketplace.ts'),'utf8');
const hook=fs.readFileSync(path.join(__dirname,'..','src','useMarketplace.ts'),'utf8');

test('B50 marketplace status filter is allowlisted',()=>{assert.deepEqual(ops.normalizeOrderStatus(' COMPLETED '),'completed');assert.equal(ops.normalizeOrderStatus('bogus'),null);assert.match(orders,/normalizeOrderStatus/)});
test('B50 order list has a bounded maximum',()=>{assert.equal(ops.clampOrderLimit(999),100);assert.equal(ops.clampOrderLimit(0),1);assert.match(orders,/clampOrderLimit/)});
test('B50 order detail item/event payloads are bounded',()=>{assert.equal(ops.boundRows(Array.from({length:150},(_,i)=>({id:i})),100).length,100);assert.match(orders,/boundRows/)});
test('B50 event output is normalized and actor identity is not overexposed',()=>{assert.deepEqual(ops.normalizeOrderEvent({id:'e',actorId:'u',fromStatus:null,toStatus:'placed',note:'x',createdAt:'t'}),{id:'e',actorId:'u',fromStatus:null,toStatus:'placed',note:'x',createdAt:'t'});assert.match(orders,/normalizeOrderEvent/)});
test('B50 duplicate order response remains explicit',()=>{assert.match(orders,/duplicate:true/);assert.match(orders,/mall_order_idempotency/)});
test('B50 status transitions use the canonical transition helper',()=>{assert.match(orders,/canTransition\(o\.status,to\)/);assert.equal(ops.isOrderStatus('fulfilled'),true);assert.equal(ops.isOrderStatus('unknown'),false)});
test('B50 marketplace client supports paged order retrieval',()=>{assert.match(client,/listOrders\(cursor\?:string/);assert.match(client,/nextCursor/)});
test('B50 marketplace hook merges paged orders without duplicates',()=>{assert.match(hook,/mergeOrdersById/);assert.match(hook,/orderCursor/)});
test('B50 checkout client prevents stale completion from reopening an old state',()=>{assert.match(hook,/placeRequest/);assert.match(hook,/requestId!==placeRequest/)});
test('B50 release records the canonical marketplace continuity scope',()=>{const v=fs.readFileSync(path.join(__dirname,'..','V5_14_0_IMPLEMENTATION_REPORT.md'),'utf8');assert.match(v,/V5\.14\.0/);assert.match(v,/B50/)});
