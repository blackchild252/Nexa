const test=require('node:test');
const {atLeast,currentVersionMd}=require('./versionAtLeast');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const digest=require('./notificationDigest');
const read=(name)=>fs.readFileSync(path.join(__dirname,name),'utf8');

test('Dami preference saves roll back optimistic UI on failure',()=>{
  const s=fs.readFileSync(path.join(__dirname,'../src/NexaAI.tsx'),'utf8');
  assert.match(s,/const previous=voiceStyle;setVoiceStyle\(nextVoice\)/);
  assert.match(s,/setVoiceStyle\(previous\);Alert\.alert/);
  assert.match(s,/const previous=languageCode;setLanguageCode\(next\)/);
  assert.match(s,/setLanguageCode\(previous\);Alert\.alert/);
  assert.match(s,/const previous=personalization;const next=\{\.\.\.personalization,\.\.\.p\}/);
  assert.match(s,/setPersonalization\(previous\);Alert\.alert/);
});

test('search excludes closed inbox participants and fixes kitchen LIKE escaping',()=>{
  const s=read('search.js');
  assert.match(s,/COALESCE\(u\.accountStatus,'active'\) = 'active'/);
  assert.match(s,/kitchen_orders WHERE userId = \? AND items LIKE \? ESCAPE '\\\\'/);
});

test('account closure clears residual profile and Chase identity',()=>{
  const s=read('accountLifecycle.js');
  assert.match(s,/username=NULL/); assert.match(s,/profileBio=''/); assert.match(s,/avatarUrl=NULL/);
  assert.match(s,/profileVisibility='private'/); assert.match(s,/zeezaShareToken=NULL/);
  assert.match(s,/zeezaExploreOptIn=0/); assert.match(s,/zeezaChaseAge=NULL/); assert.match(s,/zeezaChaseJobType=NULL/);
});

test('notification digest de-duplicates repeated event ids',()=>{
  const r=digest.buildDigest([{id:'a',type:'system',title:'A'},{id:'a',type:'system',title:'A again'},{id:'b',type:'social',title:'B'}]);
  assert.equal(r.total,2); assert.deepEqual(r.sections.map(x=>x.count),[1,1]);
});

test('wallet provider status refreshes visible transaction state',()=>{
  const s=fs.readFileSync(path.join(__dirname,'../src/Wallet.tsx'),'utf8');
  assert.match(s,/d\?\.transaction\?\.status\|\|d\?\.provider\?\.mappedStatus/);
});

test('B34 version is synchronized',()=>{
  const pkg=JSON.parse(fs.readFileSync(path.join(__dirname,'../package.json'),'utf8'));
  assert.ok(atLeast(pkg.version,'5.7.0'),'version must be at least 5.7.0');
  assert.match(fs.readFileSync(path.join(__dirname,'../MASTER_ROADMAP.md'),'utf8'),/V4\.99\.0/);
});
