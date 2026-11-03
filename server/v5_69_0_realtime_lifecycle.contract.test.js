const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const C=require('../src/nexaRealtimePolicy.js');
const read=f=>fs.readFileSync(f,'utf8');
const call=path.join(__dirname,'..','src','CallScreen.tsx');
const group=path.join(__dirname,'..','src','GroupCallScreen.tsx');
const room=path.join(__dirname,'..','src','RoomScreen.tsx');
const cases=[
['1100',()=>C.lifecycleState('inactive')==='background'],
['1101',()=>C.isForeground('active')&&!C.isForeground('background')],
['1102',()=>C.shouldPoll({lifecycle:'background',lastPollAt:0,now:999999})===false],
['1103',()=>C.shouldPoll({lifecycle:'active',lastPollAt:0,now:1000,minIntervalMs:1000})],
['1104',()=>C.pollInterval({base:1000,jitter:0})===1000],
['1105',()=>C.pollBudgetAllowed(2,3)&&!C.pollBudgetAllowed(3,3)],
['1106',()=>C.stale(new Date(Date.now()-200000).toISOString(),Date.now(),100000)],
['1107',()=>C.isCurrentSequence('abc','abc')&&!C.isCurrentSequence('abc','def')],
['1108',()=>C.duplicateKey('signal','1','2')==='signal:1:2'],
['1109',()=>C.cursorMonotonic('b','a')==='b'&&C.cursorMonotonic('b','c')==='c'],
['1110',()=>C.isTerminalState('ended')&&!C.isTerminalState('active')],
['1111',()=>C.isTransientState('connecting')&&!C.isTransientState('ended')],
['1112',()=>C.reconnectDelay(2,500)===2000],
['1113',()=>C.reconnectAllowed(7,8)&&!C.reconnectAllowed(8,8)],
['1114',()=>C.heartbeatExpired(Date.now()-40000,Date.now(),30000)],
['1115',()=>C.signalFresh(new Date().toISOString(),Date.now(),120000)],
['1116',()=>C.capCandidateQueue(Array.from({length:70},(_,i)=>i),64).length===64],
['1117',()=>C.dedupeParticipants([{id:'1'},{id:'1'},{id:'2'}]).length===2],
['1118',()=>C.roomPollInterval()===2500],
['1119',()=>C.foregroundRefreshAllowed(0,2000,1000)],
['1120',()=>C.resumeRefreshState({lifecycle:'active',wasBackground:true}).shouldRefresh],
['1121',()=>!C.resumeRefreshState({lifecycle:'background',wasBackground:true}).shouldRefresh],
['1122',()=>C.cleanupOnce({cleaned:true}).changed===false&&C.cleanupOnce({}).changed===true],
['1123',()=>C.cumulativeCertification(Array(25).fill(true)).ok],
['1124',()=>C.cumulativeCertification(Array(24).fill(true)).ok===false],
];
for(const [id,fn] of cases)test(`M${id}`,()=>assert.equal(fn(),true));
test('realtime lifecycle module exports every milestone control',()=>{
 const names=['lifecycleState','isForeground','shouldPoll','clampInterval','pollInterval','boundedPollBudget','pollBudgetAllowed','stale','sequenceToken','isCurrentSequence','duplicateKey','cursorMonotonic','isTerminalState','isTransientState','reconnectDelay','reconnectAllowed','heartbeatExpired','signalFresh','capCandidateQueue','dedupeParticipants','roomPollInterval','foregroundRefreshAllowed','resumeRefreshState','cleanupOnce','cumulativeCertification'];
 for(const n of names)assert.equal(typeof C[n],'function',n);
});
test('call and group call lifecycle sources retain polling boundaries',()=>{
 for(const s of [read(call),read(group),read(room)]){
  assert.match(s,/setInterval/); assert.match(s,/clearInterval/);
 }
});

test('local-only mode blocks outbound HTTP and keeps realtime voice disabled',()=>{
 const policy=read('server/localOnlyNetwork.js');
 const client=read('src/realtimeVoice.ts');
 assert.match(policy,/LOCAL_ONLY_EXTERNAL_NETWORK_BLOCKED/);
 assert.match(policy,/host === "localhost"/);
 assert.match(client,/Realtime voice is disabled in local-only mode/);
 assert.doesNotMatch(client,/await fetch\('https:\/\/api\.openai\.com/);
});
