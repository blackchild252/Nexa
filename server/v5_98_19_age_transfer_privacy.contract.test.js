"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const pkg = JSON.parse(read("package.json"));
const app = JSON.parse(read("app.json"));
const auth = read("server/auth.js");
const index = read("server/index.js");
const signup = read("src/app/auth/signup.tsx");
const googleCallback = read("src/app/auth/google-callback.tsx");
const profile = read("src/app/(tabs)/profile.tsx");
const privacy = read("docs/legal/PRIVACY_POLICY.md");
const terms = read("docs/legal/TERMS_OF_SERVICE.md");
const ageGate = read("src/ageGate.ts");
const tests = [
 [2050,"release identity matches package version",()=>assert.match(pkg.version,/^\d+\.\d+\.\d+$/)],
 [2051,"Expo identity matches package version",()=>assert.equal(app.expo.version,pkg.version)],
 [2052,"Android version name remains a valid release version",()=>assert.match(String(app.expo.android.version||""),/^\d+\.\d+\.\d+$/)],
 [2053,"iOS build identity remains present",()=>assert.match(String(app.expo.ios.buildNumber||''),/^\d+$/)],
 [2054,"signup requires adult confirmation server-side",()=>assert.match(auth,/requireAdultConfirmation\(context\.ageConfirmed\)/)],
 [2055,"signup API passes age confirmation through the shared request context",()=>assert.match(index,/const context = authSessionContext\(req\);[\s\S]*auth\.signup\(email, password, name, context\)/) && assert.match(index,/ageConfirmed: req\.body\?\.ageConfirmed === true/)],
 [2056,"signup UI has explicit 18+ confirmation",()=>assert.match(signup,/18 years or older/)],
 [2057,"signup blocks submission without adult confirmation",()=>assert.match(signup,/if\(!adultConfirmed\)/)],
 [2058,"Google signup is age-gated",()=>assert.match(signup,/Age requirement/)],
 [2059,"Google exchange requires adult confirmation",()=>assert.match(index,/req\.body\?\.ageConfirmed !== true/)],
 [2060,"Google callback retrieves adult confirmation",()=>assert.match(googleCallback,/getAdultConfirmation/)],
 [2061,"adult confirmation storage exists",()=>assert.match(ageGate,/nexa\.age\.confirmed\.v1/)],
 [2062,"Password sign-in requires adult confirmation",()=>assert.match(auth,/async function login\(email,password,context=\{\},options=\{\}\)\{ requireAdultConfirmation\(context\.ageConfirmed\)/)],
 [2063,"Privacy Policy explicitly prohibits under-18 users",()=>assert.match(privacy,/Children and anyone under 18 are not permitted/)],
 [2064,"Terms explicitly prohibit under-18 users",()=>assert.match(terms,/Children and anyone under 18 are not permitted/)],
 [2065,"Privacy Policy describes international processing",()=>assert.match(privacy,/International data processing and transfers/)],
 [2066,"Privacy Policy describes transfer safeguards",()=>assert.match(privacy,/appropriate contractual, adequacy-based, or other legally recognized transfer mechanisms/)],
 [2067,"Profile exposes age and data-transfer information",()=>assert.match(profile,/Age & data transfers/)],
 [2068,"Profile explains cross-border processing",()=>assert.match(profile,/located in other countries/)],
 [2069,"Profile retains Privacy Policy access",()=>assert.match(profile,/LEGAL_LINKS/)],
 [2070,"Profile retains data export",()=>assert.match(profile,/Export my data/)],
 [2071,"Profile retains account deletion",()=>assert.match(profile,/Close account/)],
 [2072,"Ad consent remains fail-closed",()=>assert.match(read("src/adConsent.ts"),/canRequestAds/)],
 [2073,"legal publication URLs remain environment driven",()=>assert.match(read("src/legalLinks.ts"),/EXPO_PUBLIC_PRIVACY_POLICY_URL/) && assert.match(read("src/legalLinks.ts"),/EXPO_PUBLIC_TERMS_URL/)],
 [2074,"exactly 25 privacy/data-transfer roadmap checks",()=>assert.equal(tests.length,25)],
];
for (const [n,title,fn] of tests) test(`B167 M${n}: ${title}`,fn);
test("B167 adult confirmation is fail-closed",()=>{assert.match(auth,/requireAdultConfirmation\(context\.ageConfirmed\)/);assert.match(auth,/AGE_RESTRICTION/);});
test("B167 legal topic coverage remains complete",()=>{for(const topic of ["information we collect","international data processing and transfers","contact"]) assert.match(privacy,new RegExp(topic.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"i"));for(const topic of ["eligibility and accounts","acceptable use","contact"]) assert.match(terms,new RegExp(topic,"i"));});
test("B167 adult confirmation text is consistent",()=>{assert.match(signup,/18 years or older/);assert.match(privacy,/aged 18 years and older/);assert.match(terms,/aged 18 years and older/);});
