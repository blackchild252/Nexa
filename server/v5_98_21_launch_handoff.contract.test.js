"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
const json=f=>JSON.parse(read(f));
const pkg=json("package.json"), server=json("server/package.json"), app=json("app.json"), eas=json("eas.json");
const report=read("scripts/launch-handoff-report.mjs");
const preflight=read("scripts/launch-preflight.mjs");
const env=read("scripts/production-env-contract.mjs");
const launch=read("server/launchReadiness.js");
const cert=read("server/productionLaunchCertification.js");
const admob=read("src/YaayzNativeAd.tsx");
const legal=read("server/v5_98_20_legal_runtime_governance.js");
const privacy=read("docs/legal/PRIVACY_POLICY.md");
const terms=read("docs/legal/TERMS_OF_SERVICE.md");
const historicalSeal=JSON.parse(read("RELEASE_SEAL_V5.98.21.json"));
const historicalReport=read("B169_REPORT.md");
const tests=[
 [2100,"archived B169 release identity is 5.98.21",()=>assert.equal(historicalSeal.release,"5.98.21")],
 [2101,"archived B169 report records 5.98.21 server identity",()=>assert.match(historicalReport,/V5\.98\.21 \/ B169/)],
 [2102,"archived B169 report records Expo identity",()=>assert.match(historicalReport,/Synchronized package, server, Expo/)],
 [2103,"archived B169 report records Android build 5990",()=>assert.match(historicalReport,/build 5990/)],
 [2104,"archived B169 report records iOS build 5990",()=>assert.match(historicalReport,/build 5990/)],
 [2105,"EAS project identity remains configured",()=>assert.match(String(app.expo.extra?.eas?.projectId||""),/^[0-9a-f-]{36}$/i)],
 [2106,"EAS production environment and channel remain production",()=>{assert.equal(eas.build.production.environment,"production");assert.equal(eas.build.production.channel,"production")}],
 [2107,"production Node pin remains 22.22.2",()=>assert.equal(eas.build.base.node,"22.22.2")],
 [2108,"launch preflight requires all public production keys",()=>{assert.match(preflight,/inspectProductionEnvironment/);for(const k of ["EXPO_PUBLIC_API_URL","EXPO_PUBLIC_PRIVACY_POLICY_URL","EXPO_PUBLIC_TERMS_URL"])assert.match(env,new RegExp(k))}],
 [2109,"public environment contract is HTTPS-only",()=>assert.match(env,/u\.protocol === 'https:'/)],
 [2110,"launch handoff report separates external blockers",()=>assert.match(report,/externalBlockers/)],
 [2111,"launch handoff report never includes secret values",()=>assert.match(report,/secretValuesIncluded: false/)],
 [2112,"launch handoff report distinguishes legal publication placeholders",()=>assert.match(report,/legal-documents: publication placeholders remain/)],
 [2113,"legal runtime remains 18+ and children-prohibited",()=>{assert.match(legal,/LEGAL_MIN_AGE = 18/);assert.match(legal,/childrenAllowed: false/)}],
 [2114,"legal acceptance remains versioned",()=>{assert.match(legal,/PRIVACY_POLICY_VERSION/);assert.match(legal,/TERMS_VERSION/);assert.match(legal,/crypto\.randomUUID/)}],
 [2115,"production launch requires strict mode",()=>assert.match(cert,/NEXA_STRICT_LAUNCH/)],
 [2116,"production launch requires explicit certification",()=>assert.match(cert,/NEXA_LAUNCH_CERTIFIED/)],
 [2117,"production preview mode is blocked",()=>assert.match(launch,/NEXA_PREVIEW_MODE.*production/)],
 [2118,"production fixture/admin preview identities are blocked",()=>assert.match(launch,/admin\.no-fixtures/)],
 [2119,"production payment mode cannot be mock",()=>assert.match(launch,/PAYMENT_MODE.*mock/)],
 [2120,"production wallet mode must be live",()=>assert.match(launch,/NEXA_WALLET_MODE.*live/)],
 [2121,"production CORS wildcard is blocked",()=>assert.match(launch,/CORS_ORIGINS.*\*/)],
 [2122,"real AdMob identifiers remain protected",()=>{assert.doesNotMatch(read("app.json"),/ca-app-pub-3940256099942544/);assert.doesNotMatch(admob,/3940256099942544/)}],
 [2123,"Yaayz remains the AdMob presentation boundary",()=>assert.match(admob,/AdMob|NativeAd|adUnitId|mobile-ads/i)],
 [2124,"exactly 25 B169 roadmap checks are defined",()=>assert.equal(tests.length,25)],
];
for(const [n,title,fn] of tests)test(`B169 M${n}: ${title}`,fn);
test("B169 legal publication sources remain explicit about 18+",()=>{assert.match(privacy,/aged 18 years and older/);assert.match(terms,/aged 18 years and older/)});
test("B169 handoff report remains package-script reachable",()=>assert.match(read("package.json"),/launch:handoff/));
