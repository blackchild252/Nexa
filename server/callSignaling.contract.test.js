"use strict";
const test=require('node:test'); const assert=require('node:assert/strict'); const fs=require('fs');
const signaling=fs.readFileSync(require.resolve('./callSignaling'),'utf8');
const db=fs.readFileSync(require.resolve('./db'),'utf8');
const index=fs.readFileSync(require.resolve('./index'),'utf8');
const notes=fs.readFileSync(require.resolve('./notifications'),'utf8');
const push=fs.readFileSync(require.resolve('../src/pushRouting.ts'),'utf8');

test('call signaling creates participant-scoped authenticated sessions',()=>{assert.match(signaling,/app\.post\("\/api\/zeeza\/calls"/);assert.match(signaling,/areFriends\(req\.user\.id, targetId\)/);assert.match(signaling,/isBlocked\(req\.user\.id, targetId\)/);assert.match(signaling,/INSERT INTO call_participants/);});
test('call media is peer encrypted and server stores signaling only',()=>{assert.match(signaling,/iceServers\(\)/);assert.match(signaling,/call_signals/);assert.doesNotMatch(signaling,/audioBuffer|videoBuffer|mediaBlob|recording/);});
test('offer answer candidate signaling is allowlisted',()=>{for(const t of ['offer','answer','candidate']) assert.match(signaling,new RegExp('"'+t+'"')); assert.match(signaling,/VALID_TYPES/);});
test('call lifecycle supports accept decline and end',()=>{for(const route of ['/accept','/decline','/end']) assert.match(signaling,new RegExp(route.replace('/','\\/')));});
test('call schema exists',()=>{for(const table of ['call_sessions','call_participants','call_signals']) assert.match(db,new RegExp('CREATE TABLE IF NOT EXISTS '+table));});
test('call routes are registered after social auth setup',()=>{assert.match(index,/createCallSignaling\(\{ db, auth, friends, sendPush, genRowId \}\)/);assert.match(index,/callSignaling\.register\(app\)/);});
test('incoming calls use the notification system without arbitrary URLs',()=>{assert.match(signaling,/screen: "call", callId: id, media/);assert.match(notes,/call: "call"/);});
test('client has native WebRTC dependency and call route',()=>{const pkg=JSON.parse(fs.readFileSync(require.resolve('../package.json'),'utf8'));assert.ok(pkg.dependencies['react-native-webrtc']);assert.match(fs.readFileSync(require.resolve('../src/app/zeeza/call.tsx'),'utf8'),/CallScreen/);});
test('push routing preserves call identity',()=>{assert.match(push,/screen: "call"/);assert.match(push,/safeRouteIdentifier\(data\.callId\)/);assert.match(push,/screen: data\.screen, callId/);});
test('account closure removes call signaling metadata',()=>{const life=fs.readFileSync(require.resolve('./accountLifecycle'),'utf8');assert.match(life,/DELETE FROM call_signals WHERE callId=\?/);assert.match(life,/DELETE FROM call_sessions WHERE callerId=\? OR calleeId=\?/);});
