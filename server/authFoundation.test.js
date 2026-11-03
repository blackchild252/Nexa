"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("server auth surface exposes signup, login, logout, me and session controls",()=>{
 const s=read("server/index.js");
 assert.match(s,/app\.post\("\/api\/auth\/signup", authLimiter/);
 assert.match(s,/app\.post\("\/api\/auth\/login", authLimiter/);
 assert.match(s,/app\.post\("\/api\/auth\/logout", auth\.authMiddleware/);
 assert.match(s,/app\.get\("\/api\/auth\/me", auth\.authMiddleware/);
 assert.match(s,/app\.get\("\/api\/auth\/sessions", auth\.authMiddleware/);
 assert.match(s,/app\.delete\("\/api\/auth\/sessions\/others", auth\.authMiddleware/);
});

test("active client persists only the session token through SecureStore",()=>{
 const s=read("src/auth.tsx");
 assert.match(s,/expo-secure-store/);
 assert.match(s,/nexa\.auth\.token\.v1/);
 assert.match(s,/SecureStore\.getItemAsync/);
 assert.match(s,/SecureStore\.setItemAsync/);
 assert.match(s,/SecureStore\.deleteItemAsync/);
 assert.doesNotMatch(s,/AsyncStorage/);
 assert.match(s,/Platform\.OS==='web'/);
 assert.match(s,/webRuntimeToken/);
});

test("active client has one auth gate and reacts to server 401 expiry",()=>{
 const auth=read("src/auth.tsx");
 const api=read("src/api.ts");
 const layout=read("src/app/_layout.tsx");
 assert.match(auth,/function AuthGate/);
 assert.match(auth,/isPublicRoute/);
 assert.match(auth,/segments\[0\]==='zeeza' && segments\[1]==='share'/);
 assert.match(api,/code\s*=\s*['"]AUTH_EXPIRED['"]/);
 assert.match(api,/authFailureHandler/);
 assert.match(layout,/AuthProvider/);
 assert.match(layout,/AuthGate/);
});

test("current Playwright smoke is auth-first and uses current primary destinations",()=>{
 const s=read("e2e/nexa-smoke.spec.js");
 assert.match(s,/\/auth\/login/);
 assert.match(s,/Welcome back/);
 for(const label of ["Home","Money","Zeeza","Dream Marketplace","Yaayz","L.A.","Profile"]) assert.match(s,new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
 assert.match(s,/NEXA_E2E_EMAIL/);
 assert.match(s,/NEXA_E2E_PASSWORD/);
});
test("public auth failures do not masquerade as expired authenticated sessions",()=>{
 const api=read("src/api.ts");
 const publicFetch=api.slice(api.indexOf("export async function publicFetch"),api.indexOf("export function setNexaToken"));
 assert.doesNotMatch(publicFetch,/AUTH_EXPIRED/);
 assert.doesNotMatch(publicFetch,/authFailureHandler/);
 const authedFetch=api.slice(api.indexOf("export async function authedFetch"),api.indexOf("export async function publicFetch"));
 assert.match(authedFetch,/res\.status === 401/);
 assert.match(authedFetch,/AUTH_EXPIRED/);
 assert.match(authedFetch,/authFailureHandler/);
});


test("production database configuration fails closed without persistent DB_PATH",()=>{
 const db=read("server/db.js");
 assert.match(db,/NODE_ENV === ["']production["']/);
 assert.match(db,/DB_PATH must be configured in production/);
});
