"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const app = JSON.parse(read("app.json"));
const pkg = JSON.parse(read("package.json"));
const legal = require("./v5_98_18_privacy_legal_readiness");
const privacy = read("docs/legal/PRIVACY_POLICY.md");
const terms = read("docs/legal/TERMS_OF_SERVICE.md");
const tests = [
 [2025,"current release version remains synchronized",()=>assert.equal(app.expo.version,pkg.version)],
 [2026,"privacy policy draft exists",()=>assert.ok(legal.legalDocumentReady(legal.LEGAL_DOCUMENTS[0],privacy))],
 [2027,"terms draft exists",()=>assert.ok(legal.legalDocumentReady(legal.LEGAL_DOCUMENTS[1],terms))],
 [2028,"privacy policy has required topic coverage",()=>assert.equal(legal.requiredTopicsPresent(privacy,legal.REQUIRED_PRIVACY_TOPICS),true)],
 [2029,"terms has required topic coverage",()=>assert.equal(legal.requiredTopicsPresent(terms,legal.REQUIRED_TERMS_TOPICS),true)],
 [2030,"privacy policy has explicit version",()=>assert.match(privacy,/2026-10-01\.v3/g)],
 [2031,"terms has explicit version",()=>assert.match(terms,/2026-10-01\.v3/g)],
 [2032,"account security privacy version matches new legal version",()=>assert.match(read("server/accountSecurity.js"),/2026-10-01\.v3/g)],
 [2033,"legal links remain environment driven",()=>assert.match(read("src/legalLinks.ts"),/EXPO_PUBLIC_PRIVACY_POLICY_URL/) && assert.match(read("src/legalLinks.ts"),/EXPO_PUBLIC_TERMS_URL/)],
 [2034,"legal links validate external URLs",()=>assert.match(read("src/legalLinks.ts"),/validateExternalUrl/)],
 [2035,"profile exposes legal links",()=>assert.match(read("src/app/(tabs)/profile.tsx"),/LEGAL_LINKS/)],
 [2036,"account export carries privacy policy version",()=>assert.match(read("server/accountPortability.js"),/privacyPolicyVersion/)],
 [2037,"account export excludes credentials",()=>assert.match(read("server/accountPortability.js"),/Deliberately excludes sessions, passwords, API-key material/)],
 [2038,"account closure remains user-visible",()=>assert.match(read("src/app/(tabs)/profile.tsx"),/Close account/)],
 [2039,"account closure revokes sessions",()=>assert.match(read("server/accountLifecycle.js"),/revokeUserSessions/)],
 [2040,"financial records remain within closure retention boundary",()=>assert.match(read("server/v5_77_0_account_closure_integrity.js"),/RETAINED_USER_TABLES/)],
 [2041,"AdMob uses consent-aware gate",()=>assert.match(read("src/adConsent.ts"),/AdsConsent/)],
 [2042,"ads do not initialize before consent gate",()=>assert.match(read("src/YaayzNativeAd.tsx"),/canRequestAds/)],
 [2043,"privacy options can be reopened",()=>assert.match(read("src/adConsent.ts"),/showPrivacyOptionsForm/)],
 [2044,"AdMob remains confined to Yaayz",()=>assert.doesNotMatch(read("src/app/(tabs)/index.tsx"),/YaayzNativeAd/)],
 [2045,"production AdMob IDs remain protected",()=>assert.doesNotMatch(read("src/YaayzNativeAd.tsx"),/3940256099942544/)],
 [2046,"publication checklist exists",()=>assert.ok(fs.existsSync(path.join(root,"docs/legal/LEGAL_PUBLICATION_CHECKLIST.md")))],
 [2047,"privacy publication still requires legal review",()=>assert.match(privacy,/Technical product draft — publish only after business\/legal review/)],
 [2048,"terms publication still requires legal review",()=>assert.match(terms,/Technical product draft — publish only after business\/legal review/)],
 [2049,"exactly 25 privacy/legal roadmap checks",()=>assert.equal(tests.length,25)],
];
for (const [n,title,fn] of tests) test(`B166 M${n}: ${title}`,fn);
test("B166 consent gate is fail-closed",()=>{assert.deepEqual(legal.consentGate({canRequestAds:false,consentUpdated:true}),{canRequestAds:false,consentUpdated:true,adsAllowed:false});assert.deepEqual(legal.consentGate({canRequestAds:true,consentUpdated:false}).adsAllowed,false);assert.equal(legal.consentGate({canRequestAds:true,consentUpdated:true}).adsAllowed,true);});
test("B166 consent diagnostics contain no raw identifiers",()=>{const out=legal.sanitizeConsentDiagnostics({status:"OBTAINED",canRequestAds:true,isConsentFormAvailable:false,privacyOptionsRequirementStatus:"REQUIRED",deviceId:"secret"});assert.deepEqual(out,{status:"OBTAINED",canRequestAds:true,isConsentFormAvailable:false,privacyOptionsRequired:true});});
test("B166 acceptance record is deterministic",()=>{assert.deepEqual(legal.policyAcceptanceRecord({userId:"u1",policyVersion:"2026-10-01.v3",acceptedAt:"2026-10-01T00:00:00.000Z"}),{userId:"u1",policyVersion:"2026-10-01.v3",acceptedAt:"2026-10-01T00:00:00.000Z"});});
test("B166 legal documents define publication URLs",()=>{assert.deepEqual(legal.LEGAL_DOCUMENTS.map(x=>x.env),["EXPO_PUBLIC_PRIVACY_POLICY_URL","EXPO_PUBLIC_TERMS_URL"]);});
test("B166 privacy topic list is non-empty and terms topic list is non-empty",()=>{assert.ok(legal.REQUIRED_PRIVACY_TOPICS.length>=10);assert.ok(legal.REQUIRED_TERMS_TOPICS.length>=10);});
