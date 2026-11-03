const test=require('node:test');
const {atLeast,currentVersionMd}=require('./versionAtLeast');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const batching=require('./notificationBatching');

const read=(name)=>fs.readFileSync(path.join(__dirname,name),'utf8');

test('notification batching suppresses duplicate event/delivery ids',()=>{
  const rows=[{id:'a',type:'system',title:'A'},{id:'a',type:'system',title:'A again'},{id:'b',status:'retry'}];
  assert.deepEqual(batching.batch(rows,{digestEnabled:true,digestFrequency:'daily'}).items.map(x=>x.id),['a','b']);
  assert.deepEqual(batching.recovery(rows).ids,['b']);
});

test('people search excludes closed accounts from discovery',()=>{
  assert.match(read('search.js'),/COALESCE\(u\.accountStatus,'active'\) = 'active'/);
});

test('group-call signaling has bounded retention and presence refresh',()=>{
  const s=read('groupCallSignaling.js');
  assert.match(s,/DELETE FROM group_call_signals/);
  assert.match(s,/LIMIT \?\)/);
  assert.match(s,/SET lastSeenAt=\? WHERE callId=\? AND userId=\?/);
});

test('group-call join leave and reconnect are atomic',()=>{
  const s=read('groupCallSignaling.js');
  const joins=s.slice(s.indexOf('/join'),s.indexOf('/leave'));
  const leaves=s.slice(s.indexOf('/leave'),s.indexOf('/reconnect'));
  const reconnect=s.slice(s.indexOf('/reconnect'),s.indexOf('/history'));
  assert.match(joins,/db\.transaction\(\(\)=>\{/);
  assert.match(leaves,/db\.transaction\(\(\)=>\{/);
  assert.match(reconnect,/db\.transaction\(\(\)=>\{/);
});

test('portable imports validate required primary keys before writing',()=>{
  assert.match(read('accountPortability.js'),/primary key is required/);
  const s=read('accountPortability.js');
  assert.ok(s.indexOf('primary key is required') < s.indexOf('const values = columns.map'));
});

test('notification client keeps filtered mark-all local state isolated',()=>{
  const s=fs.readFileSync(path.join(__dirname,'../src/NotificationCenter.tsx'),'utf8');
  assert.match(s,/targetFilter==='all'\|\|x\.type===targetFilter/);
  assert.match(s,/setUnreadByType\(prev=>\(\{\.\.\.prev,\[targetFilter\]:0\}\)\)/);
});

test('notification client decrements the active category after single read',()=>{
  const s=fs.readFileSync(path.join(__dirname,'../src/NotificationCenter.tsx'),'utf8');
  assert.match(s,/setUnreadByType\(prev=>\(\{\.\.\.prev,\[filter\]:Math\.max\(0,Number\(prev\[filter\]\|\|0\)-1\)\}\)\)/);
});

test('B33 version is synchronized',()=>{
  const pkg=JSON.parse(fs.readFileSync(path.join(__dirname,'../package.json'),'utf8'));
  assert.ok(atLeast(pkg.version,'5.7.0'),'version must be at least 5.7.0');
  assert.match(fs.readFileSync(path.join(__dirname,'../MASTER_ROADMAP.md'),'utf8'),/V4\.98\.0/);
});
