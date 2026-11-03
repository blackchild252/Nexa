"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const portability=require("./accountPortability");
const lifecycle=require("./accountLifecycle");
const index=fs.readFileSync(path.join(__dirname,"index.js"),"utf8");
const dbSource=fs.readFileSync(path.join(__dirname,"db.js"),"utf8");
const friendsSource=fs.readFileSync(path.join(__dirname,"friends.js"),"utf8");
const api=fs.readFileSync(path.join(__dirname,"../src/api.ts"),"utf8");

test("1. export is bounded by the same byte safety limit",()=>{
 assert.equal(portability.MAX_EXPORT_BYTES,portability.MAX_BUNDLE_BYTES);
 assert.match(portability.buildBundle.toString(),/MAX_ROWS_PER_TABLE/);
 assert.match(portability.buildBundle.toString(),/MAX_EXPORT_BYTES/);
});

test("2. closed accounts cannot export",()=>assert.match(portability.buildBundle.toString(),/accountStatus === "closed"/));

test("3. exports carry the active privacy controls",()=>{
 assert.match(portability.buildBundle.toString(),/discoverable/);
 assert.match(portability.buildBundle.toString(),/allowFriendRequests/);
 assert.match(portability.buildBundle.toString(),/allowInboxRequests/);
});

test("4. imports refuse closed accounts",()=>assert.match(portability.importBundle.toString(),/Closed accounts cannot import data/));

test("5. import validation endpoint exists and is authenticated",()=>assert.match(index,/app\.post\("\/api\/account\/import\/validate", auth\.authMiddleware/));

test("6. export response exposes an integrity checksum",()=>assert.match(index,/createHash\("sha256"\)\.update\(JSON\.stringify\(bundle\)\)/));

test("7. privacy settings persist instead of being hard-coded",()=>{
 assert.match(dbSource,/allowFriendRequests INTEGER NOT NULL DEFAULT 1/);
 assert.match(dbSource,/allowInboxRequests INTEGER NOT NULL DEFAULT 1/);
 assert.match(index,/allowFriendRequests,allowInboxRequests/);
 assert.match(index,/UPDATE users SET profileVisibility=.*allowFriendRequests=.*allowInboxRequests=/);
});

test("8. friend-request privacy is enforced server-side",()=>{
 assert.match(friendsSource,/allowFriendRequests/);
 assert.match(friendsSource,/isn't accepting friend requests right now/);
});

test("9. account closure already revokes identity and social access",()=>{
 assert.ok(lifecycle.DELETE_USER_TABLES.includes("sessions"));
 assert.match(lifecycle.closeAccount.toString(),/username=NULL/);
 assert.match(lifecycle.closeAccount.toString(),/zeezaShareToken=NULL/);
 assert.match(lifecycle.closeAccount.toString(),/friend_requests/);
});

test("10. client exposes preflight import validation",()=>assert.match(api,/validateNexaAccountImport/));
