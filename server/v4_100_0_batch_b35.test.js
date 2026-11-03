const test=require('node:test');
const {atLeast,currentVersionMd}=require('./versionAtLeast');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const notifications=require('./notifications');
const completion=require('./notificationCompletion');
const read=name=>fs.readFileSync(path.join(__dirname,name),'utf8');

test('Friends and Groups wrappers consume authedFetch JSON directly',()=>{
  for(const file of ['../src/friends.ts','../src/groups.ts']){
    const s=fs.readFileSync(path.join(__dirname,file),'utf8');
    assert.doesNotMatch(s,/\.json\(\)/);
    assert.match(s,/return await authedFetch/);
  }
});

test('people search excludes closed accounts',()=>{
  assert.match(read('friends.js'),/COALESCE\(accountStatus, 'active'\) = 'active'/);
});

test('Zeeza route syncs Chase, inbox and direct ids',()=>{
  const s=fs.readFileSync(path.join(__dirname,'../src/app/(tabs)/zeeza.tsx'),'utf8');
  assert.match(s,/setSection\(requestedSection\)/);
  assert.match(s,/requestedThreadId/);
  assert.match(s,/requestedRoomId/);
  assert.match(s,/openThreadById/);
  assert.match(s,/openRoomById/);
});

test('push routing covers current server notification screens',()=>{
  const s=read('../src/pushRouting.ts');
  assert.match(s,/screen: "chat"/);
  assert.match(s,/screen: "yaayz"/);
  assert.match(s,/screen: "leisure" \| "leisure_kitchen" \| "leisure_lifestyle"/);
  assert.match(s,/case "yaayz"/);
  assert.match(s,/case "leisure_kitchen"/);
});

test('notification actions preserve screen-specific target IDs',()=>{
  const action=notifications.normalizeAction({screen:'dm_thread',threadId:'t_123'});
  assert.deepEqual(action,{action:'dm_thread',id:'t_123'});
  const legacy={data:JSON.stringify({screen:'mall_orders',orderId:'o_77'}),id:'n1',userId:'u1',type:'marketplace',createdAt:new Date().toISOString(),readAt:null};
  const fakeDb={prepare:()=>({get:()=>legacy})};
  assert.deepEqual(completion.completion(fakeDb,'u1','n1').id,'o_77');
});

test('Yaayz syncs incoming search/type params',()=>{
  const s=fs.readFileSync(path.join(__dirname,'../src/YaayzScreen.tsx'),'utf8');
  assert.match(s,/setSearch\(nextSearch\); setType\(nextType\)/);
});

test('Wallet uses canonical Sky Wallet wording',()=>{
  assert.doesNotMatch(fs.readFileSync(path.join(__dirname,'../src/Wallet.tsx'),'utf8'),/Sky Sky Wallet/);
});

test('Friends search ignores stale responses',()=>{
  const s=fs.readFileSync(path.join(__dirname,'../src/useFriends.ts'),'utf8');
  assert.match(s,/useRef/); assert.match(s,/searchRequest/); assert.match(s,/requestId === searchRequest\.current/);
});

test('B35 release now rolls into V5 versioning',()=>{
  const pkg=JSON.parse(fs.readFileSync(path.join(__dirname,'../package.json'),'utf8'));
  assert.ok(atLeast(pkg.version,'5.7.0'),'version must be at least 5.7.0');
});
