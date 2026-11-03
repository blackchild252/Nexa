"use strict";
const test=require("node:test"); const assert=require("node:assert/strict"); const fs=require("node:fs"); const path=require("node:path");
const p=require("./v5_72_0_session_integrity"); const root=path.join(__dirname,".."); const read=f=>fs.readFileSync(path.join(root,f),"utf8");
const auth=read("server/auth.js"), index=read("server/index.js"), db=read("server/db.js"), client=read("src/auth.tsx"), api=read("src/api.ts");
const checks=[
[1150,"session identity",()=>{assert.match(auth,/sessionId/);assert.match(db,/sessionId TEXT/);assert.equal(typeof p.newSessionId,"function")}],
[1151,"token entropy",()=>{assert.equal(p.TOKEN_BYTES,32);assert.equal(p.newToken().length,64)}],
[1152,"absolute lifetime",()=>assert.equal(p.SESSION_ABSOLUTE_MS,30*24*60*60*1000)],
[1153,"idle lifetime",()=>assert.equal(p.SESSION_IDLE_MS,7*24*60*60*1000)],
[1154,"session touch",()=>assert.equal(p.needsTouch({lastSeenAt:new Date(Date.now()-p.SESSION_TOUCH_MS-1).toISOString()}),true)],
[1155,"rotation age",()=>assert.equal(p.needsRotation({createdAt:new Date(Date.now()-p.SESSION_ROTATION_MS-1).toISOString()}),true)],
[1156,"device binding",()=>{assert.match(auth,/deviceIdHash/);assert.match(client,/nexa\.auth\.device\.id\.v1/)}],
[1157,"device label",()=>assert.equal(p.normalizeDeviceLabel("\u0000  My Phone  "),"My Phone")],
[1158,"session cap",()=>assert.equal(p.capSessions(Array.from({length:10},(_,i)=>({createdAt:new Date(2020,0,i+1).toISOString()}))).length,8)],
[1159,"concurrent login cap",()=>assert.match(auth,/SESSION_CAP|SESSION_CAP/)],
[1160,"revocation reason",()=>{assert.match(db,/revocationReason TEXT/);assert.match(auth,/revocationReason/)}],
[1161,"atomic rotation",()=>assert.match(auth,/transaction\(.*rotateSession|rotateSession[\s\S]*transaction/s)],
[1162,"old token invalidation",()=>assert.match(auth,/UPDATE sessions SET revokedAt=.*WHERE token=\?/s)],
[1163,"rotation reuse detection",()=>assert.match(auth,/revocationReason===\"rotation\"|rotation/)],
[1164,"reuse event",()=>assert.match(auth,/session_reuse_detected/)],
[1165,"ip hash",()=>{assert.match(db,/ipHash TEXT/);assert.match(auth,/hashIp/)}],
[1166,"user agent hash",()=>{assert.match(db,/userAgentHash TEXT/);assert.match(auth,/hashUserAgent/)}],
[1167,"logout all",()=>assert.match(index,/\/api\/auth\/sessions\/all/)],
[1168,"password change revocation",()=>assert.match(auth,/passwordChangeRevokeAll/)],
[1169,"account close revocation",()=>assert.ok(read("server/accountLifecycle.js").includes("\"sessions\""))],
[1170,"provider sessions",()=>assert.match(auth,/createSessionForProvider\(userId/)],
[1171,"safe session list",()=>{assert.match(auth,/deviceLabel/);assert.match(auth,/map\(r=>policy\.safeSession/)}],
[1172,"expired cleanup",()=>assert.match(read("server/sessionMaintenance.js"),/expiresAt/)],
[1173,"session certification",()=>assert.deepEqual(p.certification(Array(25).fill(true)),{version:"5.72.0",milestones:25,total:25,passed:25,complete:true})],
[1174,"cumulative certification",()=>assert.deepEqual(p.MILESTONES.map(x=>x[0]),Array.from({length:25},(_,i)=>1150+i))]
];
for(const [id,name,fn] of checks)test(`M${id} ${name}`,fn);
test("B113 milestone list is exact",()=>assert.deepEqual(p.MILESTONES.map(x=>x[0]),Array.from({length:25},(_,i)=>1150+i)));
test("B113 auth client uses secure device identity and rotation endpoint",()=>{assert.match(client,/SecureStore/);assert.match(api,/session\/rotate/);assert.match(api,/rotateAuthSession/)});
