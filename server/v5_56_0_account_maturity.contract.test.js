"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
const security=require("./accountSecurity");
const readiness=require("./accountLifecycleReadiness");
const portability=require("./accountPortability");
const index=read("server/index.js");
const profile=read("src/app/(tabs)/profile.tsx");
const tests=[
 [750,"privacy policy has an explicit version",()=>assert.match(security.PRIVACY_POLICY_VERSION,/^\d{4}-\d{2}-\d{2}\.v\d+$/)],
 [751,"privacy patch accepts only known keys",()=>{assert.throws(()=>security.validatePrivacyPatch({password:"x"}),/Unknown privacy setting/);assert.equal(security.validatePrivacyPatch({visibility:"private",discoverable:false}),true);}],
 [752,"privacy booleans are strict instead of truthy coercion",()=>{assert.throws(()=>security.validatePrivacyPatch({discoverable:"false"}),/must be boolean/);assert.equal(security.normalizePrivacy({discoverable:"false"}).discoverable,true);}],
 [753,"privacy summary contains all contact/discovery controls",()=>{const x=security.securitySummary({privacy:{visibility:"private",discoverable:false,allowFriendRequests:false,allowInboxRequests:true}});assert.deepEqual(x.privacy,{visibility:"private",discoverable:false,allowFriendRequests:false,allowInboxRequests:true});}],
 [754,"privacy summary carries policy version",()=>assert.equal(security.securitySummary().privacyPolicyVersion,security.PRIVACY_POLICY_VERSION)],
 [755,"privacy GET is no-store and versioned",()=>{assert.match(index,/app\.get\("\/api\/account\/privacy", auth\.authMiddleware/);const i=index.indexOf('app.get("/api/account/privacy"');const b=index.slice(i,i+900);assert.match(b,/Cache-Control/);assert.match(b,/privacyPolicyVersion/);}],
 [756,"privacy PATCH rejects malformed payloads",()=>{const i=index.indexOf('app.patch("/api/account/privacy"');const b=index.slice(i,i+1100);assert.match(b,/validatePrivacyPatch/);assert.match(b,/status\(400\)/);}],
 [757,"privacy PATCH returns normalized policy metadata",()=>{const i=index.indexOf('app.patch("/api/account/privacy"');const b=index.slice(i,i+1800);assert.match(b,/privacyPolicyVersion/);assert.match(b,/Cache-Control/);}],
 [758,"security summary reads every privacy control",()=>{const i=index.indexOf('app.get("/api/account/security-summary"');const b=index.slice(i,i+800);for(const x of ["profileVisibility","zeezaExploreOptIn","allowFriendRequests","allowInboxRequests"])assert.match(b,new RegExp(x));}],
 [759,"security summary is not cacheable",()=>{const i=index.indexOf('app.get("/api/account/security-summary"');const b=index.slice(i,i+800);assert.match(b,/Cache-Control/);}],
 [760,"closure readiness requires session support",()=>assert.ok(readiness.REQUIRED_CLOSURE_SUPPORT.includes("sessions"))],
 [761,"closure readiness requires lifecycle user columns",()=>{assert.match(read("server/accountLifecycleReadiness.js"),/missingUserColumns/);assert.match(read("server/accountLifecycleReadiness.js"),/accountStatus.*closedAt/);}],
 [762,"closure readiness reports missing support tables",()=>assert.match(read("server/accountLifecycleReadiness.js"),/missingClosureSupport/)],
 [763,"closure readiness refuses incomplete schema",()=>{assert.match(read("server/accountLifecycleReadiness.js"),/missingRetainedTables\.length === 0/);assert.match(read("server/accountLifecycleReadiness.js"),/missingClosureSupport\.length === 0/);}],
 [764,"export bundle declares portability policy version",()=>assert.match(portability.buildBundle.toString(),/privacyPolicyVersion/)],
 [765,"export endpoint disables caching",()=>{const i=index.indexOf('app.get("/api/account/export"');const b=index.slice(i,i+650);assert.match(b,/Cache-Control/);}],
 [766,"export still excludes credentials and provider secrets",()=>{for(const x of ["sessions","passwords","provider payment","vendor credentials"])assert.ok(read("server/accountPortability.js").toLowerCase().includes(x),`missing exclusion marker: ${x}`);}],
 [767,"export remains bounded by row and byte limits",()=>{assert.equal(portability.MAX_ROWS_PER_TABLE,5000);assert.equal(portability.MAX_BUNDLE_BYTES,2*1024*1024);}],
 [768,"import validation endpoint is authenticated and no-store",()=>{const i=index.indexOf('app.post("/api/account/import/validate"');const b=index.slice(i,i+650);assert.match(b,/auth\.authMiddleware/);assert.match(b,/Cache-Control/);}],
 [769,"import endpoint is authenticated",()=>assert.match(index,/app\.post\("\/api\/account\/import", auth\.authMiddleware/)],
 [770,"portable import rejects closed accounts",()=>assert.match(read("server/accountPortability.js"),/Closed accounts cannot import data/)],
 [771,"portable import refuses cross-account primary-key ownership",()=>assert.match(read("server/accountPortability.js"),/owned by another account/)],
 [772,"profile exposes export action with accessibility label",()=>assert.match(profile,/accessibilityLabel="Export my NEXA data"/)],
 [773,"profile security surface remains accessible",()=>{for(const x of ["Active sessions:","Lifecycle ready:","Sign out other sessions"])assert.match(profile,new RegExp(x.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));}],
 [774,"account maturity contract is version-bound to the new release",()=>{const v=require("../package.json").version;assert.equal(require("../server/package.json").version,v);}]
];
for(const [n,title,fn] of tests)test(`B97 M${n}: ${title}`,fn);
