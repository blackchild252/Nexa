"use strict";
const test=require("node:test"); const assert=require("node:assert/strict");
const c=require("./zeezaMessagingContinuity");
const read=(p)=>require("fs").readFileSync(require("path").join(__dirname,p),"utf8");

test("B49 bounds message pages",()=>{assert.equal(c.boundedLimit("999"),50);assert.equal(c.boundedLimit("0"),1);assert.equal(c.boundedLimit("x"),50);});
test("B49 uses a stable composite message cursor",()=>{const r={id:"m2",createdAt:"2026-09-28T00:00:00.000Z"};assert.equal(c.messageCursor(r),"2026-09-28T00:00:00.000Z|m2");assert.equal(c.messageBefore({id:"m1",createdAt:r.createdAt},c.messageCursor(r)),true);});
test("B49 caps unread badge counts",()=>{assert.equal(c.capUnread(1000),99);assert.equal(c.capUnread(-1),0);});
test("B49 keeps thread list bounded",()=>{assert.equal(c.threadListLimit(),100);});
test("B49 detects an extra row for pagination",()=>{assert.equal(c.pageHasMore([1,2,3],2),true);assert.equal(c.pageHasMore([1,2],2),false);});
test("B49 server exposes stable message pagination",()=>{const s=read("./zeezaMessaging.js");assert.match(s,/ORDER BY createdAt DESC, id DESC LIMIT \?/);assert.match(s,/nextBefore/);assert.match(s,/hasMore/);});
test("B49 server reads only the visible DM page",()=>{const s=read("./zeezaMessaging.js");assert.match(s,/id IN \(\$\{placeholders\}\)/);assert.match(s,/UPDATE dm_messages SET readAt = \? WHERE threadId = \? AND senderId != \? AND readAt IS NULL AND id IN/);});
test("B49 DM send returns the persisted timestamp",()=>{const s=read("./zeezaMessaging.js");assert.match(s,/const createdAt = now\(\);/);assert.match(s,/res\.json\(\{ message: \{ id, mine: true, body, kind:"text", mediaUrl:null, createdAt \} \}\)/);});
test("B49 room messages use the same pagination contract",()=>{const s=read("./zeezaMessaging.js");const i=s.indexOf("app.get(\"/api/social/rooms/:roomId/messages\"");const tail=s.slice(i,i+5000);assert.match(tail,/hasMore/);assert.match(tail,/nextBefore/);assert.match(tail,/ORDER BY createdAt DESC, id DESC/);});
test("B49 room sender disappearance is safe",()=>{const s=read("./zeezaMessaging.js");assert.match(s,/sender: senders\.get\(m\.senderId\) \|\| null/);});
test("B49 room send uses one persisted timestamp",()=>{const s=read("./zeezaMessaging.js");assert.match(s,/const createdAt = now\(\);/);assert.match(s,/body, createdAt, req\.room\.id/);});
