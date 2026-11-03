"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
const json=f=>JSON.parse(read(f));
const pkg=json("package.json"), server=json("server/package.json"), app=json("app.json").expo, eas=json("eas.json"), historicalSeal=json("RELEASE_SEAL_V5.98.22.json");
const historicalReport=read("B170_REPORT.md");
const report=read("scripts/launch-candidate-report.mjs");
const env=read("scripts/production-env-contract.mjs");
const preflight=read("scripts/launch-preflight.mjs");
const handoff=read("scripts/launch-handoff-report.mjs");
const legal=read("server/v5_98_20_legal_runtime_governance.js");
const launch=read("server/launchReadiness.js");
const cert=read("server/productionLaunchCertification.js");
const tests=[
 [2125,"archived B170 release identity is 5.98.22",()=>assert.equal(historicalSeal.release,"5.98.22")],
 [2126,"archived B170 report records 5.98.22",()=>assert.match(historicalReport,/V5\.98\.22 \/ B170/)],
 [2127,"archived B170 report records release identity synchronization",()=>assert.match(historicalReport,/release identity to V5\.98\.22 \/ build 5991/i)],
 [2128,"archived B170 report records Android build 5991",()=>assert.match(historicalReport,/build 5991/)],
 [2129,"archived B170 report records iOS build 5991",()=>assert.match(historicalReport,/build 5991/)],
 [2130,"EAS project identity remains configured",()=>assert.match(String(app.extra?.eas?.projectId||""),/^[0-9a-f-]{36}$/i)],
 [2131,"production profile remains production",()=>{assert.equal(eas.build.production.environment,"production");assert.equal(eas.build.production.channel,"production")}],
 [2132,"Node build pin remains 22.22.2",()=>assert.equal(eas.build.base.node,"22.22.2")],
 [2133,"candidate report validates all required public keys",()=>{for(const k of ["EXPO_PUBLIC_API_URL","EXPO_PUBLIC_PRIVACY_POLICY_URL","EXPO_PUBLIC_TERMS_URL"])assert.match(report,new RegExp(k))}],
 [2134,"candidate report is secret-safe",()=>{assert.match(report,/secretsIncluded: false/);for(const k of ["OPENAI_API_KEY","GEMINI_API_KEY","PAYSTACK_SECRET_KEY","SENTRY_AUTH_TOKEN"])assert.doesNotMatch(report,new RegExp(`${k}[^\\n]*(?:=|:)\\s*[^<]`))}],
 [2135,"HTTPS validation remains centralized",()=>assert.match(report,/isHttpsUrl|apiHttps|privacyHttps|termsHttps/)],
 [2136,"existing production environment contract is reused",()=>assert.match(report,/inspectProductionEnvironment/)],
 [2137,"launch preflight remains part of the launch boundary",()=>assert.match(preflight,/inspectProductionEnvironment/)],
 [2138,"handoff remains externally-blocker aware",()=>assert.match(handoff,/externalBlockers/)],
 [2139,"legal publication remains environment-driven",()=>{assert.match(env,/EXPO_PUBLIC_PRIVACY_POLICY_URL/);assert.match(env,/EXPO_PUBLIC_TERMS_URL/)}],
 [2140,"legal runtime remains 18+",()=>assert.match(legal,/LEGAL_MIN_AGE = 18/)],
 [2141,"children remain prohibited",()=>assert.match(legal,/childrenAllowed: false/)],
 [2142,"strict production launch remains enforced",()=>assert.match(cert,/NEXA_STRICT_LAUNCH/)],
 [2143,"explicit production certification remains enforced",()=>assert.match(cert,/NEXA_LAUNCH_CERTIFIED/)],
 [2144,"production preview remains blocked",()=>assert.match(launch,/NEXA_PREVIEW_MODE.*production/)],
 [2145,"production fixture identities remain blocked",()=>assert.match(launch,/admin\.no-fixtures/)],
 [2146,"production payment mode remains live-only",()=>assert.match(launch,/PAYMENT_MODE.*mock/)],
 [2147,"production wallet remains live-only",()=>assert.match(launch,/NEXA_WALLET_MODE.*live/)],
 [2148,"production CORS wildcard remains blocked",()=>assert.match(launch,/CORS_ORIGINS.*\*/)],
 [2149,"exactly 25 B170 roadmap checks are defined",()=>assert.equal(tests.length,25)],
];
for(const [n,title,fn] of tests)test(`B170 M${n}: ${title}`,fn);
test("B170 candidate report package script is reachable",()=>assert.match(read("package.json"),/launch:candidate/));
test("B170 archived release identity remains sealed",()=>assert.equal(historicalSeal.archive,"NEXA-V5.98.22-B170.zip"));
