"use strict";
const test=require("node:test"); const assert=require("node:assert/strict"); const crypto=require("node:crypto");
const h=require("./v5_60_0_major_hardening");
const cases=[
[850,"production CORS fails closed",()=>assert.equal(h.productionCorsPolicy({nodeEnv:"production",origins:[]}).ok,false)],
[851,"request target is bounded",()=>assert.equal(h.requestTargetBounds("/".repeat(100)).ok,true)],
[852,"query key count is bounded",()=>assert.equal(h.queryKeyCount({a:1,b:2}).ok,true)],
[853,"header value is bounded",()=>assert.equal(h.headerValueBound("ok").ok,true)],
[854,"content type policy accepts JSON",()=>assert.equal(h.contentTypePolicy("POST","application/json").ok,true)],
[855,"error envelope hides internal failure",()=>assert.equal(h.safeErrorEnvelope(new Error("secret stack"),"r1").error,"An unexpected server error occurred.")],
[856,"sensitive headers are scrubbed",()=>assert.equal(h.scrubSensitiveHeaders({Authorization:"Bearer secret"}).Authorization,"[REDACTED]")],
[857,"pagination has hard maximum",()=>assert.equal(h.paginationBound(1000),100)],
[858,"cursor length is bounded",()=>assert.equal(h.cursorBound("abc").ok,true)],
[859,"admin rate policy is bounded",()=>assert.equal(h.adminRateLimitPolicy({max:999}).max,100)],
[860,"admin step-up binds action",()=>assert.equal(h.adminStepUpActionBinding({action:"refund",requestAction:"refund",issuedAt:new Date().toISOString()}).ok,true)],
[861,"auth attempt envelope hashes identity data",()=>assert.equal(h.authAttemptEnvelope({ip:"1.2.3.4",email:"A@B.COM"}).key.length,64)],
[862,"session count cap rejects excess",()=>assert.equal(h.sessionCountCap(11,10).ok,false)],
[863,"session idle window accepts fresh session",()=>assert.equal(h.sessionIdleWindow(new Date().toISOString()).ok,true)],
[864,"revocation reason is normalized",()=>assert.equal(h.revocationReason("Password Changed!"),"password_changed_")],
[865,"password change revokes sessions",()=>assert.equal(h.passwordChangeSessionRevocation(true).revokeAll,true)],
[866,"unused OAuth exchange remains consumable",()=>assert.equal(h.oauthExchangeAtomicConsumption({consumedAt:null}).ok,true)],
[867,"fresh webhook timestamp accepted",()=>assert.equal(h.webhookFreshness(new Date().toISOString()).ok,true)],
[868,"webhook body hash binds payload",()=>assert.equal(h.webhookBodyBinding(Buffer.from("x"),crypto.createHash("sha256").update("x").digest("hex")).ok,true)],
[869,"provider circuit opens after threshold",()=>assert.equal(h.providerCircuitState({failures:6,openedAt:new Date().toISOString()}).open,true)],
[870,"external URL requires HTTPS allowlist",()=>assert.equal(h.externalUrlAllowlist("https://api.example.com/x",["api.example.com"]).ok,true)],
[871,"upload filename strips traversal",()=>assert.equal(h.safeUploadFilename("../../photo.png").filename,"photo.png")],
[872,"upload MIME and extension must agree",()=>assert.equal(h.uploadMimeExtensionParity("photo.png","image/png").ok,true)],
[873,"image pixel count is bounded",()=>assert.equal(h.uploadImagePixelBound(1000,1000).ok,true)],
[874,"25-milestone certification requires all passes",()=>assert.equal(h.certification(Array(25).fill(true)).ok,true)],
];
for(const [id,name,fn] of cases) test(`M${id} ${name}`,fn);
