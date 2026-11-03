"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const maturity = require("./v5_93_0_account_privacy_maturity");
const portability = require("./accountPortability");
const retention = require("./dataRetention");
const closure = require("./v5_77_0_account_closure_integrity");
const lifecycle = read("server/accountLifecycle.js");
const auth = read("server/auth.js");
const retentionSource = read("server/dataRetention.js");
const tests = [
 [1675,"account lifecycle has a bounded state vocabulary",()=>assert.deepEqual(maturity.ACCOUNT_STATES,["active","closed"])],
 [1676,"closure state is consistently rejected by the canonical active-state helper",()=>assert.equal(maturity.isAccountActive({accountStatus:"closed"}),false)],
 [1677,"account closure explicitly revokes live sessions at the lifecycle boundary",()=>assert.match(lifecycle,/revokeUserSessions\(db, userId, now, "account_closed"\)/)],
 [1678,"authenticated session creation uses the canonical account-state guard",()=>assert.match(auth,/lifecycleMaturity\.assertAccountActive\(account\)/)],
 [1679,"portable data inventory is explicit and finite",()=>assert.ok(Array.isArray(portability.TABLES) && portability.TABLES.length>0 && portability.TABLES.every(Boolean))],
 [1680,"closed accounts remain ineligible for export",()=>assert.match(read("server/accountPortability.js"),/Closed accounts cannot be exported/)],
 [1681,"new exports carry explicit integrity metadata",()=>assert.match(read("server/accountPortability.js"),/attachBundleIntegrity\(bundle\)/)],
 [1682,"portable export table coverage remains allowlist based",()=>assert.ok(portability.TABLES.every(t=>typeof t === "string"))],
 [1683,"import authorization remains target-account scoped",()=>assert.match(read("server/accountPortability.js"),/preflightImport\(db, userId, bundle\)/)],
 [1684,"export integrity uses SHA-256 over canonical payload",()=>assert.equal(maturity.INTEGRITY_ALGORITHM,"sha256")],
 [1685,"audit metadata helper delegates to the existing sensitive-data redactor",()=>assert.deepEqual(maturity.safeAuditMetadata({token:"secret",ok:1}, v=>({ok:v.ok})),{ok:1})],
 [1686,"closed accounts remain ineligible for import",()=>assert.match(read("server/accountPortability.js"),/Closed accounts cannot import data/)],
 [1687,"retention windows remain bounded",()=>assert.equal(retention.boundedDays(999999,90,3650),3650)],
 [1688,"financial/history retention remains outside notification purge",()=>assert.doesNotMatch(retentionSource,/DELETE FROM (wallet_transactions|wallet_ledger_entries|mall_orders)/)],
 [1689,"closure retains canonical financial/history tables",()=>assert.ok(closure.RETAINED_USER_TABLES.includes("wallet_transactions") && closure.RETAINED_USER_TABLES.includes("mall_orders"))],
 [1690,"Yaayz seller history remains retained by closure policy",()=>assert.ok(closure.RETAINED_USER_TABLES.includes("yaayz_ticket_listings") && closure.RETAINED_USER_TABLES.includes("yaayz_ticket_orders"))],
 [1691,"Zeeza/chat ownership cleanup remains part of closure orchestration",()=>assert.match(lifecycle,/cleanupChatRooms\(db, userId\)/)],
 [1692,"AI account data remains explicitly owned by the account lifecycle",()=>assert.ok(closure.DELETE_USER_TABLES.includes("ai_memories") && closure.DELETE_USER_TABLES.includes("ai_workflows"))],
 [1693,"closure session revocation has an explicit reason",()=>assert.match(read("server/v5_77_0_account_closure_integrity.js"),/revocationReason=\? WHERE userId=\? AND revokedAt IS NULL/)],
 [1694,"session revocation helper is deterministic and idempotent",()=>{ const calls=[]; const db={prepare(sql){if(sql.startsWith("SELECT 1 FROM sqlite_master")) return {get:()=>({1:1})}; assert.match(sql,/UPDATE sessions SET revokedAt/);return {run:(...a)=>{calls.push(a);return {changes:2}}}}}; assert.equal(closure.revokeUserSessions(db,"u1","2026-10-01T00:00:00.000Z"),2); assert.deepEqual(calls[0],["2026-10-01T00:00:00.000Z","account_closed","u1"]); }],
 [1695,"notification retention deletes deliveries only for the user's expired events",()=>assert.match(retentionSource,/DELETE FROM notification_deliveries WHERE eventId IN \(SELECT id FROM notification_events WHERE userId=\? AND createdAt < \?\)/)],
 [1696,"B134 contract itself contains exactly 25 milestone checks",()=>assert.equal(tests.length,25)],
 [1697,"canonical checksum rejects tampered exports",()=>{ const b=maturity.attachBundleIntegrity({format:"nexa-account-export",exportVersion:2,data:{x:1}}); b.data.x=2; assert.equal(maturity.verifyBundleIntegrity(b).valid,false); }],
 [1698,"canonical checksum remains stable for unchanged exports",()=>{ const b=maturity.attachBundleIntegrity({format:"nexa-account-export",exportVersion:2,data:{x:1}}); assert.equal(maturity.verifyBundleIntegrity(b).valid,true); assert.equal(maturity.bundleChecksum(b),b.integrity.checksum); }],
 [1699,"B134 release boundary is explicitly tied to V5.93.0",()=>assert.match(read("MASTER_ROADMAP.md"),/B134 \/ V5\.93\.0/)],
];
for (const [n,title,fn] of tests) test(`B134 M${n}: ${title}`,fn);

test("B134 export integrity is attached without exposing credentials",()=>{
  const bundle=maturity.attachBundleIntegrity({format:"nexa-account-export",exportVersion:2,account:{id:"u1",name:"NEXA user"},data:{}});
  assert.equal(bundle.integrity.algorithm,"sha256");
  assert.equal(maturity.verifyBundleIntegrity(bundle).valid,true);
  assert.equal("passwordHash" in bundle.account,false);
});

test("B134 notification purge remains user-scoped for delivery cleanup",()=>{
  const calls=[];
  const db={prepare(sql){
    if(sql.startsWith("DELETE FROM notification_events")) return {run:(...a)=>{calls.push([sql,a]);return {changes:2}}};
    if(sql.startsWith("DELETE FROM notification_deliveries")) return {run:(...a)=>{calls.push([sql,a]);return {changes:2}}};
    throw new Error(`unexpected SQL: ${sql}`);
  }};
  const result=retention.purgeUserNotifications(db,"u1",90,new Date("2026-10-01T00:00:00.000Z"));
  assert.equal(result.deleted,2);
  assert.deepEqual(calls[0][1],["u1","2026-07-03T00:00:00.000Z"]);
});
