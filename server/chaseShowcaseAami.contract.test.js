'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const aami=require('./aamiEconomy');

test('Chase showcase exposes like/comment interaction routes and counts',()=>{
  const src=fs.readFileSync(path.join(__dirname,'friends.js'),'utf8');
  assert.match(src,/\/api\/social\/chase\/:[A-Za-z]+\/like/);
  assert.match(src,/\/api\/social\/chase\/:[A-Za-z]+\/comments/);
  assert.match(src,/likeCount/);
  assert.match(src,/commentCount/);
});

function openDb(){try{const D=require('better-sqlite3');return new D(':memory:');}catch(_){const{DatabaseSync}=require('node:sqlite');const raw=new DatabaseSync(':memory:');return {exec:(x)=>raw.exec(x),prepare:(x)=>raw.prepare(x),transaction:(fn)=>(...a)=>{raw.exec('BEGIN');try{const r=fn(...a);raw.exec('COMMIT');return r}catch(e){raw.exec('ROLLBACK');throw e;}}};}}

test('Chase showcase milestone credits exactly 5 Aami at each 150 unique-like threshold',()=>{
  const db=openDb();
  db.exec(`CREATE TABLE users(id TEXT PRIMARY KEY,accountStatus TEXT DEFAULT 'active',adultConfirmedAt TEXT); CREATE TABLE friendships(userId TEXT,friendId TEXT);`);
  db.prepare('INSERT INTO users VALUES(?,?,?)').run('u','active',new Date().toISOString());
  aami.ensureSchema(db);
  for(let i=0;i<20;i++) db.prepare('INSERT INTO friendships VALUES(?,?)').run('u',`f${i}`);
  assert.equal(aami.awardChaseLikeMilestone(db,'u',149).credited,false);
  assert.equal(aami.awardChaseLikeMilestone(db,'u',150).amount,5);
  assert.equal(aami.balance(db,'u'),5);
  assert.equal(aami.awardChaseLikeMilestone(db,'u',151).credited,false);
  assert.equal(aami.awardChaseLikeMilestone(db,'u',300).amount,5);
  assert.equal(aami.balance(db,'u'),10);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM aami_ledger WHERE source='chase_profile_like_milestone'").get().n,2);
});

test('Chase milestone is idempotent when the same threshold is processed twice',()=>{
  const db=openDb();
  db.exec(`CREATE TABLE users(id TEXT PRIMARY KEY,accountStatus TEXT DEFAULT 'active',adultConfirmedAt TEXT); CREATE TABLE friendships(userId TEXT,friendId TEXT);`);
  db.prepare('INSERT INTO users VALUES(?,?,?)').run('u','active',new Date().toISOString());
  aami.ensureSchema(db);
  for(let i=0;i<20;i++) db.prepare('INSERT INTO friendships VALUES(?,?)').run('u',`f${i}`);
  const first=aami.awardChaseLikeMilestone(db,'u',150); const second=aami.awardChaseLikeMilestone(db,'u',150);
  assert.equal(first.amount,5); assert.equal(second.duplicate,true); assert.equal(aami.balance(db,'u'),5);
});
