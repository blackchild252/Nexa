"use strict";
const test=require("node:test"); const assert=require("node:assert/strict"); const p=require("./v5_63_0_privacy_authorization");
const checks=[
[925,"sensitive response fields",()=>{const r=p.redactSensitive({passwordHash:"x",nested:{token:"y",name:"ok"}});assert.equal(r.passwordHash,undefined);assert.equal(r.nested.token,undefined);assert.equal(r.nested.name,"ok");}],
[926,"account export redaction",()=>assert.deepEqual(Object.keys(p.exportSafeAccount({id:"u",email:"x",passwordHash:"p",name:"N"})),["id","name"])],
[927,"import metadata boundary",()=>assert.throws(()=>p.assertImportMetadata({format:"nexa-account-export",account:{token:"x"}}),e=>e.code==="IMPORT_CREDENTIALS_FORBIDDEN")],
[928,"profile visibility",()=>assert.equal(p.profileVisibility({viewerId:"a",targetId:"b",visibility:"public"}).allowed,true)],
[929,"blocked profile isolation",()=>assert.equal(p.profileVisibility({viewerId:"a",targetId:"b",visibility:"public",blocked:true}).allowed,false)],
[930,"notification ownership",()=>assert.equal(p.notificationActionOwned({userId:"u"},"v"),false)],
[931,"push ownership",()=>assert.equal(p.pushTokenOwned({userId:"u"},"u"),true)],
[932,"friend target normalization",()=>assert.equal(p.normalizeTargetId("../../x"),null)],
[933,"group role invariant",()=>assert.equal(p.groupRoleAllows("member","void_entry"),false)],
[934,"group entry void role",()=>assert.equal(p.groupRoleAllows("admin","void_entry"),true)],
[935,"call participant boundary",()=>assert.equal(p.callParticipantAllows({userId:"v"},"u"),false)],
[936,"call history privacy",()=>assert.equal(p.callParticipantAllows({userId:"u"},"u"),true)],
[937,"room member visibility",()=>assert.equal(p.profileVisibility({viewerId:"a",targetId:"b",visibility:"friends",friends:false}).allowed,false)],
[938,"admin gate primitive",()=>assert.equal(typeof p.adminPage,"function")],
[939,"admin pagination cap",()=>assert.equal(p.adminPage({limit:999999}).limit,100)],
[940,"vendor staff snapshot",()=>assert.equal(p.vendorPermissionSnapshot({role:"staff"},{action:"finance"}),false)],
[941,"vendor evidence transition",()=>assert.equal(p.vendorPermissionSnapshot({role:"admin"},{action:"write"}),true)],
[942,"extension owner binding",()=>assert.equal(p.pushTokenOwned({userId:"u"},"v"),false)],
[943,"extension scope normalization",()=>assert.equal(p.extensionScope(" Notifications.Send "),"notifications.send")],
[944,"AI memory redaction",()=>assert.equal(p.redactSensitive({memory:{secret:"x",text:"ok"}}).memory.secret,undefined)],
[945,"workflow ownership",()=>assert.equal(p.workflowRunOwned({userId:"u"},"v"),false)],
[946,"search privacy filter",()=>assert.equal(p.profileVisibility({viewerId:"a",targetId:"b",visibility:"private",friends:true}).allowed,false)],
[947,"internal error scrub",()=>assert.equal(p.scrubError(new Error("SQLITE_CONSTRAINT: UPDATE users")),"Request could not be completed.")],
[948,"audit metadata redaction",()=>assert.equal(p.auditMetadata({apiKey:"x",action:"read"}).apiKey,undefined)],
[949,"cumulative certification",()=>assert.deepEqual(p.certification(),{version:"5.63.0",milestones:25,complete:true})]
];
for(const [id,name,fn] of checks)test(`M${id} ${name}`,fn);
test("B104 milestone list is exact",()=>assert.deepEqual(p.MILESTONES.map(x=>x[0]),Array.from({length:25},(_,i)=>925+i)));
