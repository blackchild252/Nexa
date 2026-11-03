'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const c = require('./v5_81_0_room_invite_integrity');
const fs = require('node:fs');
const z = fs.readFileSync(require('node:path').join(__dirname,'zeezaMessaging.js'),'utf8');
const db = fs.readFileSync(require('node:path').join(__dirname,'db.js'),'utf8');
const ts = fs.readFileSync(require('node:path').join(__dirname,'../src/zeezaMessaging.ts'),'utf8');
const ui = fs.readFileSync(require('node:path').join(__dirname,'../src/RoomScreen.tsx'),'utf8');
const checks = [
 ['1375',()=>assert.equal(c.CODE_LENGTH,8)],
 ['1376',()=>assert.equal(c.CODE_RE.test('ABCD2345'),true)],
 ['1377',()=>assert.equal(c.normalizeCode('ab23-cdef'), 'AB23CDEF')],
 ['1378',()=>assert.equal(c.normalizeCode('short'), null)],
 ['1379',()=>assert.equal(c.isExpired(new Date(Date.now()-1000).toISOString()),true)],
 ['1380',()=>assert.equal(c.isExpired(new Date(Date.now()+60000).toISOString()),false)],
 ['1381',()=>assert.ok(c.expiryFrom().length)],
 ['1382',()=>assert.ok(c.expiryFrom(Date.now(), c.MAX_TTL_MS).startsWith(new Date(Date.now()+c.MAX_TTL_MS-1000).toISOString().slice(0,10)))],
 ['1383',()=>assert.equal(c.inviteContract().cryptographicGeneration,true)],
 ['1384',()=>assert.equal(c.inviteContract().expiring,true)],
 ['1385',()=>assert.equal(c.inviteContract().rotatable,true)],
 ['1386',()=>assert.equal(c.inviteContract().revocable,true)],
 ['1387',()=>assert.equal(c.inviteContract().ownerOnlyReveal,true)],
 ['1388',()=>assert.equal(c.inviteContract().joinRateLimited,true)],
 ['1389',()=>assert.match(z,/v5_81_0_room_invite_integrity/)],
 ['1390',()=>assert.match(z,/inviteExpiresAt/)],
 ['1391',()=>assert.match(z,/invite\/rotate/)],
 ['1392',()=>assert.match(z,/invite\/revoke/)],
 ['1393',()=>assert.match(z,/isExpired\(room\.inviteExpiresAt\)/)],
 ['1394',()=>assert.match(z,/normalizeCode\(\(req\.body \|\| \{\}\)\.code\)/)],
 ['1395',()=>assert.match(z,/inviteIntegrity\.newCode\(\)/)],
 ['1396',()=>assert.match(db,/ALTER TABLE chat_rooms ADD COLUMN inviteExpiresAt TEXT/)],
 ['1397',()=>assert.match(db,/inviteExpiresAt TEXT/)],
 ['1398',()=>assert.match(ts,/apiRoomRotateInvite/)],
 ['1399',()=>assert.match(ui,/Rotate.*Revoke|Revoke.*Rotate/s)],
];
for(const [id,fn] of checks) test(`M${id}`,fn);
test('B121/B122 cumulative room invite lifecycle boundary remains owner/member scoped',()=>{
 assert.match(z,/app\.post\("\/api\/social\/rooms\/\:roomId\/invite\/rotate", A/);
 assert.match(z,/ownerId = \?\"\)\.get\(req\.params\.roomId, req\.user\.id\)/);
});
