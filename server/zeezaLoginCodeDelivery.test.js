"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { ENDPOINT_PATH, signEnvelope, createZeezaLoginCodeDelivery } = require("./zeezaLoginCodeDelivery");
class FakeDb {
  constructor(){this.users=new Map([['main-user-1',{id:'main-user-1',accountStatus:'active'}]]);this.messages=new Map();this.events=new Map();}
  exec(){}
  prepare(sql){
    if(sql.includes('SELECT id, accountStatus FROM users'))return{get:id=>this.users.get(id)||null};
    if(sql.includes('SELECT eventId FROM zeeza_login_delivery_events'))return{get:id=>this.events.has(id)?{eventId:id}:null};
    if(sql.includes('INSERT INTO zeeza_login_delivery_events'))return{run:(id,at)=>this.events.set(id,{eventId:id,at})};
    if(sql.includes('INSERT INTO zeeza_login_secure_inbox'))return{run:(id,eventId,userId,challengeId,message,expiresAt,createdAt)=>this.messages.set(id,{id,eventId,userId,challengeId,category:'local',preview:'LORDGISTICS sign-in code',message,expiresAt,createdAt})};
    if(sql.includes('DELETE FROM zeeza_login_secure_inbox'))return{run:cutoff=>{let n=0;for(const [id,row] of this.messages)if(row.expiresAt<=cutoff){this.messages.delete(id);n++;}return{changes:n}}};
    throw new Error('unexpected SQL '+sql);
  }
  transaction(fn){return()=>fn();}
}
function setup(){let now=1_800_000_000_000;const db=new FakeDb(),secret='local-test-secret-long-enough-for-hmac-32';const service=createZeezaLoginCodeDelivery({db,env:{NEXA_MAIN_ZEEZA_LOGIN_KEYS:JSON.stringify({lordgistics:secret})},now:()=>now,genId:()=>`msg-${db.messages.size+1}`,scheduleCleanup:false});return{db,service,secret,now:()=>now,advance:n=>now+=n};}
function envelope(s,overrides={}){return{v:1,type:'login.code_delivery',issuer:'lordgistics',audience:'nexa-main-zeeza',at:s.now(),eventId:'login-event-1',correlationId:null,data:{userId:'main-user-1',challengeId:'challenge-1',code:'123456',expiresAt:s.now()+60_000,channel:'zeeza_secure_inbox'},...overrides};}
function invoke(service,body){const result={statusCode:200,body:null,status(n){this.statusCode=n;return this},json(v){this.body=v;return this}};service.handle({body},result);return result;}
function signed(s,e){return{...e,keyId:'lordgistics',signature:signEnvelope(s.secret,e)};}
test('receives signed six-digit login code into the linked user local Zeeza inbox without returning the code',()=>{const s=setup();const result=invoke(s.service,signed(s,envelope(s)));assert.deepEqual(result.body,{delivered:true,eventId:'login-event-1'});const row=[...s.db.messages.values()][0];assert.equal(row.userId,'main-user-1');assert.match(row.message,/123456/);assert.equal(JSON.stringify(result.body).includes('123456'),false);});
test('rejects wrong signatures, scope, expired/far-future codes and unknown identities',()=>{const s=setup();const e=envelope(s);assert.equal(invoke(s.service,{...signed(s,e),signature:'0'.repeat(64)}).body.reason,'bad_signature');assert.equal(invoke(s.service,signed(s,{...e,issuer:'other'})).body.reason,'wrong_scope');assert.equal(invoke(s.service,signed(s,{...e,data:{...e.data,expiresAt:s.now()-1}})).body.reason,'bad_expiry');assert.equal(invoke(s.service,signed(s,{...e,data:{...e.data,expiresAt:s.now()+6*60_000}})).body.reason,'bad_expiry');assert.equal(invoke(s.service,signed(s,{...e,data:{...e.data,userId:'unknown'}})).body.reason,'identity_mismatch');});
test('delivery is idempotent, expired inbox content is cleaned, and the event ledger contains no code',()=>{const s=setup();const e=envelope(s);assert.equal(invoke(s.service,signed(s,e)).body.delivered,true);assert.equal(invoke(s.service,signed(s,e)).body.delivered,true);assert.equal(s.db.messages.size,1);assert.equal(JSON.stringify([...s.db.events.values()]).includes('123456'),false);s.advance(61_000);s.service.cleanup();assert.equal(s.db.messages.size,0);assert.equal(s.db.events.size,1);});
test('route is registered at the expected server-only path',()=>{const s=setup(),routes=[];const {registerZeezaLoginCodeDelivery}=require('./zeezaLoginCodeDelivery');registerZeezaLoginCodeDelivery({app:{post:(...x)=>routes.push(x)},db:s.db,env:{},scheduleCleanup:false});assert.equal(ENDPOINT_PATH,'/zeeza/v1/admin/login-code');assert.equal(routes[0][0],ENDPOINT_PATH);});
