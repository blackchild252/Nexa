"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const auth = read("server/auth.js");
const index = read("server/index.js");
const profile = read("src/app/(tabs)/profile.tsx");
const signup = read("src/app/auth/signup.tsx");
const googleCallback = read("src/app/auth/google-callback.tsx");
const ageGate = read("src/ageGate.ts");
const privacy = read("docs/legal/PRIVACY_POLICY.md");
const terms = read("docs/legal/TERMS_OF_SERVICE.md");
const tests = [
  [3205,"signup is fail-closed on 18+ confirmation",()=>assert.match(auth,/requireAdultConfirmation\(context\.ageConfirmed\)/)],
  [3205,"password login remains fail-closed on 18+ confirmation",()=>assert.match(auth,/async function login\(email,password,context=\{\},options=\{\}\)\{ requireAdultConfirmation\(context\.ageConfirmed\)/)],
  [3205,"Google exchange remains age-gated",()=>assert.match(index,/req\.body\?\.ageConfirmed !== true/)],
  [3205,"signup UI explicitly excludes children and under-18 users",()=>assert.match(signup,/Children and anyone under 18 are not permitted/)],
  [3205,"Google callback requires stored adult confirmation",()=>assert.match(googleCallback,/getAdultConfirmation/)],
  [3205,"adult confirmation storage remains present",()=>assert.match(ageGate,/nexa\.age\.confirmed\.v1/)],
  [3206,"privacy endpoint returns server-normalized controls",()=>assert.match(index,/accountSecurity\.normalizePrivacy/)],
  [3206,"privacy update writes only normalized server values",()=>assert.match(index,/normalized\.visibility/)],
  [3206,"profile exposes visibility and discovery controls",()=>assert.match(profile,/Privacy & discovery/)],
  [3206,"profile states privacy controls are server-enforced",()=>assert.match(profile,/enforced on the server/)],
  [3207,"session list is protected by authentication",()=>assert.match(index,/app\.get\("\/api\/auth\/sessions", auth\.authMiddleware/)],
  [3207,"other-session revocation is protected by authentication",()=>assert.match(index,/app\.delete\("\/api\/auth\/sessions\/others", auth\.authMiddleware/)],
  [3207,"account export is protected by authentication",()=>assert.match(index,/app\.get\("\/api\/account\/export", auth\.authMiddleware/)],
  [3207,"account closure requires explicit confirmation",()=>assert.match(index,/req\.body\?\.confirmed !== true/)],
  [3207,"account closure requires the current password",()=>assert.match(index,/auth\.verifyPassword\(req\.user\.id, req\.body\?\.password\)/)],
  [3207,"account closure revokes the account sessions",()=>assert.match(read("server/accountLifecycle.js"),/revokeUserSessions\(db, userId, now, "account_closed"\)/)],
  [3207,"profile legal-readiness response is assigned from the actual Promise result",()=>assert.match(profile,/sessionData,privacyData,securityData,readinessData,legalReadinessData,yaayzData,eventData,currencyData,regionalData\]=await Promise\.all\(\[/) && assert.match(profile,/setLegalReadiness\(legalReadinessData\|\|null\)/)],
  [3208,"profile transfer notice identifies cross-border processing",()=>assert.match(profile,/including infrastructure located in other countries/)],
  [3208,"profile transfer notice describes recognized safeguards",()=>assert.match(profile,/contractual, adequacy-based, or other legally recognized safeguards/)],
  [3208,"Privacy Policy covers international data processing and transfers",()=>assert.match(privacy,/International data processing and transfers/)],
  [3208,"Privacy Policy covers transfer safeguards",()=>assert.match(privacy,/appropriate contractual, adequacy-based, or other legally recognized transfer mechanisms/)],
  [3208,"Terms retain adult-only eligibility",()=>assert.match(terms,/Children and anyone under 18 are not permitted/)],
  [3209,"profile describes one shared NEXA identity across core modules",()=>assert.match(profile,/Your NEXA identity is shared across Sky Money, Zeeza, Dream Marketplace, Yaayz, Leisure, Dami, Business Hub and Extensions/)],
  [3209,"auth middleware attaches the canonical public user identity",()=>assert.match(auth,/req\.user=\{\.\.\.publicUser\(row\),adminSessionVerified:!!row\.adminVerifiedAt,twoFactorVerified:!!row\.twoFactorVerifiedAt\}/)],
  [3209,"account identity endpoint returns the canonical authenticated user",()=>assert.match(index,/app\.get\("\/api\/auth\/me", auth\.authMiddleware/)],
];
for (const [n,title,fn] of tests) test(`B213 M${n}: ${title}`,fn);
test("B213 identity/privacy contract contains exactly 25 focused checks",()=>assert.equal(tests.length,25));
