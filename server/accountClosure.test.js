"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const lifecycle=require("./accountLifecycle");
const index=fs.readFileSync(path.join(__dirname,"index.js"),"utf8");
const auth=fs.readFileSync(path.join(__dirname,"auth.js"),"utf8");
test("account closure is explicit, password-gated and revokes sessions",()=>{
 assert.match(index,/app\.delete\("\/api\/account", auth\.authMiddleware/);
 assert.match(index,/req\.body\?\.confirmed !== true/);
 assert.match(index,/auth\.verifyPassword\(req\.user\.id/);
 assert.match(auth,/accountStatus === "closed"/);
 assert.ok(lifecycle.DELETE_USER_TABLES.includes("sessions"));
 assert.ok(lifecycle.DELETE_USER_TABLES.includes("ai_personalization"));
 assert.ok(lifecycle.RETAINED_USER_TABLES.includes("mall_orders"));
});
test("closure never includes credential-bearing account tables in export cleanup",()=>{
 assert.ok(!lifecycle.DELETE_USER_TABLES.includes("users"));
});
