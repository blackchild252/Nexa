'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const aami=require('./aamiEconomy');

function openDb(){
  try { const D=require('better-sqlite3'); return new D(':memory:'); }
  catch (_) { const {DatabaseSync}=require('node:sqlite'); const raw=new DatabaseSync(':memory:'); let inTransaction=false; return {exec:x=>raw.exec(x),prepare:x=>raw.prepare(x),get inTransaction(){return inTransaction;},transaction:fn=>(...a)=>{raw.exec('BEGIN');inTransaction=true;try{const r=fn(...a);raw.exec('COMMIT');return r;}catch(e){raw.exec('ROLLBACK');throw e;}finally{inTransaction=false;}}}; }
}
function base(){
  const db=openDb();
  db.exec(`CREATE TABLE users(id TEXT PRIMARY KEY,accountStatus TEXT DEFAULT 'active',adultConfirmedAt TEXT); CREATE TABLE friendships(userId TEXT,friendId TEXT);`);
  db.prepare('INSERT INTO users VALUES(?,?,?)').run('u','active',new Date().toISOString());
  aami.ensureSchema(db);
  return db;
}
function addFriends(db,n){ for(let i=0;i<n;i++) db.prepare('INSERT INTO friendships VALUES(?,?)').run('u',`f${i}`); }

test('Aami earning is locked for Free until 20 accepted friends',()=>{
  const db=base();
  const locked=aami.aamiEarningEligibility(db,'u');
  assert.equal(locked.gated,true); assert.equal(locked.unlocked,false); assert.equal(locked.friends,0); assert.equal(locked.remainingFriends,20);
  const reward=aami.awardActivity(db,'u','yaayz_like','p1');
  assert.equal(reward.locked,true); assert.equal(reward.amount,0); assert.equal(aami.balance(db,'u'),0);
  addFriends(db,20);
  const open=aami.aamiEarningEligibility(db,'u'); assert.equal(open.unlocked,true); assert.equal(open.remainingFriends,0);
  const earned=aami.awardActivity(db,'u','yaayz_like','p1'); assert.equal(earned.credited,true); assert.equal(earned.amount,1); assert.equal(aami.balance(db,'u'),1);
});

test('Premium and VIP do not require the 20-friend unlock',()=>{
  const db=base();
  db.exec(`CREATE TABLE nexa_subscriptions(id TEXT PRIMARY KEY,userId TEXT,planId TEXT,status TEXT,currentPeriodStart TEXT,currentPeriodEnd TEXT,autoPay INTEGER,monthlyCapMinor INTEGER,nextPlanId TEXT,updatedAt TEXT,createdAt TEXT);`);
  db.prepare('INSERT INTO nexa_subscriptions VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('s','u','premium','active','2026-01-01','2026-02-01',1,1000000,null,new Date().toISOString(),new Date().toISOString());
  const eligibility=aami.aamiEarningEligibility(db,'u'); assert.equal(eligibility.unlocked,true); assert.equal(eligibility.gated,false);
  const earned=aami.awardActivity(db,'u','yaayz_like','p1'); assert.equal(earned.credited,true); assert.equal(earned.amount,1);
});

test('Unlock notification is emitted once after the 20th friend and carries popup intent',()=>{
  const db=base(); addFriends(db,19); const calls=[];
  const send=async(...args)=>{calls.push(args);return {recorded:true};};
  const before=aami.maybeNotifyAamiUnlock(db,'u',send); assert.equal(before.notified,false); assert.equal(calls.length,0);
  addFriends(db,1);
  const after=aami.maybeNotifyAamiUnlock(db,'u',send); assert.equal(after.notified,true); assert.equal(calls.length,1); assert.equal(calls[0][1],'Aami unlocked'); assert.equal(calls[0][3].inAppPopup,true); assert.equal(calls[0][3].aamiUnlock,true);
});

test('Notification popup policy promotes important social and money updates but excludes calls',()=>{
  const n=require('./notifications');
  assert.equal(n.shouldInAppPopup({screen:'friends'}),true);
  assert.equal(n.shouldInAppPopup({screen:'mall_orders'}),true);
  assert.equal(n.shouldInAppPopup({screen:'verification'}),true);
  assert.equal(n.shouldInAppPopup({screen:'call'}),false);
  assert.equal(n.shouldInAppPopup({type:'missed_call'}),false);
});


test('Aami financialisation is server-owned at 1 Aami per Naira and is not exposed in the consumer centre',()=>{
  const db=base();
  assert.equal(aami.NGN_PER_AAMI,1);
  assert.equal(aami.ngnToAami(1),1);
  assert.equal(aami.ngnToAami(1.01),2);
  assert.equal(aami.aamiToNgn(250),250);
  assert.equal(aami.centre(db,'u').coin.redemptionRate,undefined);
  assert.equal(aami.centre(db,'u').coin.cashValue,false);
});

test('Aami popup timing is five seconds and important notification policy excludes calls',()=>{
  const popup=require('fs').readFileSync(require('path').join(__dirname,'..','src','NexaInAppNotificationPopup.tsx'),'utf8');
  assert.match(popup,/IN_APP_POPUP_MS\s*=\s*5000/);
  const n=require('./notifications');
  assert.equal(n.shouldInAppPopup({screen:'yaayz'}),true);
  assert.equal(n.shouldInAppPopup({screen:'vendor_staff'}),true);
  assert.equal(n.shouldInAppPopup({screen:'call'}),false);
});

test('Aami admin financial policy remains hidden from consumer SkyMoney and Aami responses',()=>{
  const sky=require('fs').readFileSync(require('path').join(__dirname,'skyMoneyHub.js'),'utf8');
  assert.doesNotMatch(sky,/redemptionRate/);
  const index=require('fs').readFileSync(require('path').join(__dirname,'index.js'),'utf8');
  assert.match(index,/\/api\/admin\/payments\/aami-economy/);
  assert.match(index,/adminAccess\.require\("payments"\)/);
  assert.match(index,/equivalentNgn/);
});
