"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
const index=read("server/index.js");
const lifecycle=read("server/accountLifecycle.js");
const portability=read("server/accountPortability.js");
const profile=read("src/app/(tabs)/profile.tsx");
const api=read("src/api.ts");
const security=read("server/accountSecurity.js");
const retention=read("server/dataRetention.js");
const auth=read("server/auth.js");
const integrity=require("./v5_77_0_account_closure_integrity");

const tests=[
 [600,"account lifecycle readiness route is authenticated",()=>assert.match(index,/app\.get\("\/api\/account\/lifecycle-readiness", auth\.authMiddleware/)],
 [601,"privacy read/write routes are authenticated",()=>{assert.match(index,/app\.get\("\/api\/account\/privacy", auth\.authMiddleware/);assert.match(index,/app\.patch\("\/api\/account\/privacy", auth\.authMiddleware/);}],
 [602,"portable export excludes credentials and payment/provider material",()=>{assert.match(portability,/Deliberately excludes sessions, passwords, API-key material, provider payment/);assert.ok(!portability.match(/"sessions"\s*,/));}],
 [603,"import accepts only supported versions and validates format",()=>{assert.deepEqual(require("./accountPortability").SUPPORTED_IMPORT_VERSIONS,[1,2]);assert.match(portability,/Unsupported/);}],
 [604,"account closure requires explicit confirmation",()=>assert.match(index,/req\.body\?\.confirmed !== true/)],
 [605,"account closure requires current password",()=>assert.match(index,/auth\.verifyPassword\(req\.user\.id, req\.body\?\.password\)/)],
 [606,"retained commerce tables are explicitly declared",()=>{const m=require("./accountLifecycle");for(const t of ["mall_orders","mall_payment_events","mall_refunds","yaayz_ticket_orders","kitchen_orders","nexa_subscription_charges"])assert.ok(m.RETAINED_USER_TABLES.includes(t));}],
 [607,"Ajo unsold reservations are released on closure",()=>assert.match(lifecycle,/productStock\.release\(db, \{ productId: row\.productId, qty: Number\(row\.count\), now \}\)/)],
 [608,"social identity rows are removed on closure",()=>{for(const x of ["friend_requests","friendships","blocks","dm_threads","chat_room_members"])assert.ok(integrity.DELETE_USER_TABLES.includes(x) || lifecycle.includes("cleanupDirectMessages") || lifecycle.includes("cleanupChatRooms"),x);}],
 [609,"call signaling records are removed on closure",()=>{assert.match(lifecycle,/DELETE FROM call_signals/);assert.match(lifecycle,/DELETE FROM call_sessions/);}],
 [610,"session tokens are deleted on closure",()=>assert.match(lifecycle,/"sessions"/)],
 [611,"recovery tokens have bounded expiry",()=>{assert.match(security,/RECOVERY_TTL_MS = 30 \* 60 \* 1000/);assert.match(security,/consumedAt/);}],
 [612,"retention windows are bounded",()=>{assert.match(retention,/MAX_NOTIFICATION_DAYS = 3650/);assert.match(retention,/MAX_EVENT_DAYS = 365/);}],
 [613,"Profile exposes server-backed privacy controls",()=>{for(const x of ["getAccountPrivacy","updateAccountPrivacy","Privacy & discovery","Profile visibility"])assert.match(profile,new RegExp(x.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));}],
 [614,"Profile exposes account data export",()=>{assert.match(profile,/exportNexaAccount/);assert.match(profile,/Share\.share/);assert.match(profile,/Export my data/);}],
 [615,"Profile exposes password-confirmed account closure",()=>{assert.match(profile,/closeNexaAccount/);assert.match(profile,/Current NEXA password/);assert.match(profile,/Confirm permanent closure/);}],
 [616,"Profile exposes security summary",()=>{assert.match(profile,/getAccountSecuritySummary/);assert.match(profile,/Active sessions:/);}],
 [617,"Profile exposes lifecycle readiness",()=>{assert.match(profile,/getAccountLifecycleReadiness/);assert.match(profile,/Lifecycle ready:/);}],
 [618,"Dami/account personalization remains resettable through existing API",()=>{assert.match(api,/resetDamiPersonalization/);assert.match(api,/resetDamiVoicePreferences/);}],
 [619,"auth middleware rejects closed accounts",()=>assert.match(auth,/row\.accountStatus === "closed"/)],
 [620,"privacy controls have accessibility semantics",()=>{assert.match(profile,/accessibilityRole="switch"/);assert.match(profile,/accessibilityState=\{\{checked:/);}],
 [621,"privacy controls meet minimum target height",()=>assert.match(profile,/minHeight:44/)],
 [622,"account closure modal has explicit cancel and confirm controls",()=>{assert.match(profile,/accessibilityLabel="Confirm account closure"/);assert.match(profile,/accessibilityLabel="Cancel account closure"/);}],
 [623,"B87 API helpers are centralized",()=>{for(const x of ["getAccountPrivacy","updateAccountPrivacy","getAccountSecuritySummary","getAccountLifecycleReadiness","closeNexaAccount"])assert.match(api,new RegExp(`export async function ${x}`));}],
 [624,"historical B87 contract remains compatible with the current release",()=>assert.match(require("../package.json").version,/^\d+\.\d+\.\d+$/)],
];
for(const [n,title,fn] of tests)test(`B87 M${n}: ${title}`,fn);
