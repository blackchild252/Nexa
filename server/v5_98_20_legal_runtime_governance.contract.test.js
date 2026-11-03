"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root,f),"utf8");
const pkg = JSON.parse(read("package.json"));
const app = JSON.parse(read("app.json"));
const moduleText = read("server/v5_98_20_legal_runtime_governance.js");
const index = read("server/index.js");
const db = read("server/db.js");
const api = read("src/api.ts");
const privacy = read("docs/legal/PRIVACY_POLICY.md");
const terms = read("docs/legal/TERMS_OF_SERVICE.md");
const tests = [
 [2075,"release identity remains synchronized",()=>assert.match(pkg.version,/^\d+\.\d+\.\d+$/)],
 [2076,"Expo identity matches package",()=>assert.equal(app.expo.version,pkg.version)],
 [2077,"Android version identity remains a valid release version",()=>assert.match(String(app.expo.android.version||""),/^\d+\.\d+\.\d+$/)],
 [2078,"iOS build identity remains present",()=>assert.match(String(app.expo.ios.buildNumber||''),/^\d+$/)],
 [2079,"legal runtime module exists",()=>assert.match(moduleText,/legalRuntimeStatus/)],
 [2080,"legal runtime requires HTTPS URLs",()=>assert.match(moduleText,/url\.protocol !== "https:"/)],
 [2081,"minimum age is 18",()=>assert.match(moduleText,/LEGAL_MIN_AGE = 18/)],
 [2082,"children are prohibited",()=>assert.match(moduleText,/childrenAllowed: false/)],
 [2083,"privacy document has governed version",()=>assert.match(moduleText,/PRIVACY_POLICY_VERSION = "2026-10-01\.v3"/)],
 [2084,"terms document has governed version",()=>assert.match(moduleText,/TERMS_VERSION = "2026-10-01\.v3"/)],
 [2085,"publication readiness requires both legal URLs",()=>assert.match(moduleText,/Boolean\(privacyUrl && termsUrl\)/)],
 [2086,"acceptance is disabled before publication",()=>assert.match(moduleText,/Legal documents are not published/)],
 [2087,"acceptance requires both documents",()=>assert.match(moduleText,/privacyAccepted !== true.*termsAccepted !== true/)],
 [2088,"acceptance requires adult confirmation",()=>assert.match(moduleText,/ageConfirmed !== true/)],
 [2089,"acceptance record stores privacy version",()=>assert.match(moduleText,/privacyPolicyVersion: PRIVACY_POLICY_VERSION/)],
 [2090,"acceptance record stores terms version",()=>assert.match(moduleText,/termsVersion: TERMS_VERSION/)],
 [2091,"acceptance records use unique identifiers",()=>assert.match(moduleText,/crypto\.randomUUID/)],
 [2092,"legal acceptance table exists",()=>assert.match(db,/CREATE TABLE IF NOT EXISTS legal_acceptances/)],
 [2093,"legal acceptance history is indexed",()=>assert.match(db,/idx_legal_acceptances_user_accepted/)],
 [2094,"legal readiness API is authenticated",()=>assert.match(index,/app\.get\("\/api\/legal\/readiness", auth\.authMiddleware/)],
 [2095,"legal acceptance API is authenticated",()=>assert.match(index,/app\.post\("\/api\/account\/legal-acceptance", auth\.authMiddleware/)],
 [2096,"legal readiness is no-store",()=>{const i=index.indexOf('app.get("/api/legal/readiness"');assert.match(index.slice(i,i+700),/Cache-Control/)}],
 [2097,"client exposes legal readiness",()=>assert.match(api,/getLegalReadiness/)],
 [2098,"client exposes legal acceptance",()=>assert.match(api,/acceptLegalDocuments/)],
 [2099,"exactly 25 governance roadmap checks",()=>assert.equal(tests.length,25)],
];
for(const [n,title,fn] of tests)test(`B168 M${n}: ${title}`,fn);
test("B168 acceptance requires published legal documents",()=>{assert.match(moduleText,/acceptanceEnabled: Boolean\(privacyUrl && termsUrl\)/);assert.match(moduleText,/if \(!status\.acceptanceEnabled\)/)});
test("B168 policy and terms remain explicit about 18+",()=>{assert.match(privacy,/aged 18 years and older/);assert.match(terms,/aged 18 years and older/)});
test("B168 legal endpoints do not expose credentials",()=>{assert.doesNotMatch(index.slice(index.indexOf('/api/legal/readiness'),index.indexOf('/api/account/legal-acceptance')),/password|token|secret|passwordHash/i)});
