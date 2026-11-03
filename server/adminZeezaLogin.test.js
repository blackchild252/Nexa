"use strict";
const test=require('node:test');const assert=require('node:assert/strict');const crypto=require('node:crypto');const {createAdminSecurityCenter}=require('./adminSecurityCenter');
class FakeDb{
 constructor(){this.challenges=new Map();this.messages=new Map();this.settings=new Map();}
 exec(){}
 prepare(sql){
  if(sql.includes('PRAGMA table_info'))return{all:()=>[]};
  if(sql.includes('FROM admin_staff'))return{get:()=>null};
  if(sql.includes('SELECT * FROM admin_mfa_settings'))return{get:id=>this.settings.get(id)||null};
  if(sql.includes('SELECT idHash FROM admin_mfa_login_challenges'))return{get:(codeHash,at)=>[...this.challenges.values()].find(r=>r.codeHash===codeHash&&r.expiresAt>at)||null};
  if(sql.includes('INSERT INTO admin_mfa_login_challenges'))return{run:(idHash,userId,expiresAt,attempts,ipHash,userAgentHash,codeHash,createdAt)=>this.challenges.set(idHash,{idHash,userId,expiresAt,attempts,ipHash,userAgentHash,codeHash,createdAt,consumedAt:null})};
  if(sql.includes('INSERT INTO zeeza_login_secure_inbox'))return{run:(id,eventId,userId,challengeId,message,expiresAt,createdAt)=>this.messages.set(id,{id,eventId,userId,challengeId,category:'local',preview:'NEXA Admin sign-in code',message,expiresAt,createdAt})};
  if(sql.includes('DELETE FROM zeeza_login_secure_inbox WHERE challengeId=?'))return{run:challengeId=>{for(const[id,row]of this.messages)if(row.challengeId===challengeId)this.messages.delete(id);return{changes:1}}};
  if(sql.includes('SELECT * FROM admin_mfa_login_challenges'))return{get:(idHash,at)=>{const r=this.challenges.get(idHash);return r&&r.consumedAt===null&&r.expiresAt>at&&r.attempts<5?r:null}};
  if(sql.includes('UPDATE admin_mfa_login_challenges SET attempts=attempts+1'))return{run:idHash=>{const r=this.challenges.get(idHash);if(!r||r.consumedAt)return{changes:0};r.attempts++;return{changes:1}}};
  if(sql.includes('UPDATE admin_mfa_login_challenges SET consumedAt='))return{run:(at,idHash,expiry)=>{const r=this.challenges.get(idHash);if(!r||r.consumedAt||r.expiresAt<=expiry||r.attempts>=5)return{changes:0};r.consumedAt=at;return{changes:1}}};
  throw new Error('Unexpected SQL: '+sql);
 }
 transaction(fn){return()=>fn();}
}
function fixture(){let now=1_800_000_000_000;const db=new FakeDb();const admin={roleOf:user=>user?.role==='administrator'||String(user?.id||'').startsWith('admin-')?'administrator':null};const service=createAdminSecurityCenter({db,auth:{},admin,env:{},now:()=>now});return{db,service,now:()=>now,advance:n=>now+=n};}
test('every Admin login gets a fresh five-minute Zeeza inbox code, independent of TOTP setup',()=>{const s=fixture();const a=s.service.createLoginChallenge({id:'admin-user-1'},{ip:'127.0.0.1',userAgent:'test'});assert.equal(a.factor,'zeeza');assert.equal(a.delivery,'local_secure_inbox');assert.equal(a.code,undefined);const message=[...s.db.messages.values()][0];assert.equal(message.userId,'admin-user-1');assert.match(message.message,/\d{6}/);assert.equal(s.service.verifyLoginChallenge(a.challengeId,message.message.match(/\d{6}/)[0]),'admin-user-1');assert.equal(s.db.messages.size,0,'consumed login code is removed from the Local inbox');assert.throws(()=>s.service.verifyLoginChallenge(a.challengeId,message.message.match(/\d{6}/)[0]),e=>e.code==='MFA_CHALLENGE_INVALID');});
test('wrong Zeeza code is refused and increments the bounded challenge attempt counter',()=>{const s=fixture();const a=s.service.createLoginChallenge({id:'admin-user-2'});assert.throws(()=>s.service.verifyLoginChallenge(a.challengeId,'000000'),e=>e.code==='MFA_CODE_INVALID');const row=s.db.challenges.get(crypto.createHash('sha256').update(a.challengeId).digest('hex'));assert.equal(row.attempts,1);});
test('non-admin accounts do not receive an Admin login challenge',()=>{const s=fixture();assert.equal(s.service.createLoginChallenge({id:'ordinary-user',role:'user'}),null);assert.equal(s.db.messages.size,0);});
