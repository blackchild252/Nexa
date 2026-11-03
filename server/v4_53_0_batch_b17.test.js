const assert=require('assert');
const vendor=require('./vendorSettlementExceptions');
const dami=require('./damiOperations');
const wallet=require('./walletOperations');
const community=require('./communityOperations');
const marketplace=require('./marketplaceSettlement');
const fs=require('fs'); const path=require('path');
const {atLeast,currentVersionMd}=require('./versionAtLeast');
const root=path.join(__dirname,'..');
const index=fs.readFileSync(path.join(root,'server/index.js'),'utf8');
const version=fs.readFileSync(path.join(root,'VERSION.md'),'utf8');
function test(name,fn){try{fn();console.log('PASS',name);}catch(e){console.error('FAIL',name,e.message);process.exitCode=1;}}
test('vendor settlement exceptions and SLA',()=>{assert.equal(vendor.summarize([{providerVerified:1,status:'delivered'},{providerVerified:0,status:'confirmed'}]).exceptions,1);assert.equal(vendor.sla([{orderId:'1',status:'confirmed',createdAt:new Date(Date.now()-49*3600000).toISOString()}])[0].breached,true);});
test('Dami workflow operations are planning-only',()=>{assert.deepEqual(dami.workflowSummary([{status:'draft'},{status:'completed'}],[{}]),{workflows:2,draft:1,active:0,completed:1,runs:1});assert.equal(dami.nextSteps([{title:'A',dependsOn:[]},{title:'B',dependsOn:[0]}],[])[0].ready,true);});
test('wallet operations classify reconciliation states',()=>{assert.deepEqual(wallet.summarize([{applicable:false},{applicable:true,safeToApply:true,mappedStatus:'completed'},{applicable:true,safeToApply:false}]),{total:3,reconciled:1,review:0,mismatch:1,internal:1});});
test('Zeeza moderation and member safety summarize',()=>{assert.deepEqual(community.moderationSummary([{status:'open',escalation:'urgent'}],[{status:'pending'}]),{reports:1,open:1,urgent:1,appeals:1,appealsOpen:1});assert.deepEqual(community.memberSafety([{role:'owner'},{role:'member'}]),{owner:1,member:1});});
test('marketplace exceptions and SLA are read-only',()=>{assert.equal(marketplace.exceptions([{id:'o1',status:'cancelled',providerVerified:0}])[0].orderId,'o1');assert.equal(marketplace.fulfillmentSla([{orderId:'o1',status:'shipped',createdAt:new Date(Date.now()-49*3600000).toISOString()}])[0].breached,true);});
test('B17 routes/version are registered',()=>{for(const p of ['/api/mall/vendor/settlement-exceptions','/api/dami/operations/workflows','/api/wallet/settlement/operations','/api/zeeza/moderation/operations','/api/mall/operations/settlement-depth'])assert.match(index,new RegExp(p.replaceAll('/','\\/')));assert.ok(atLeast(currentVersionMd(version),'4.96.0'));});
