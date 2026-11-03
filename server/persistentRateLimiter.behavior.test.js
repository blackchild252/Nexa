"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createPersistentRateLimiter } = require("./persistentRateLimiter");

function fakeDb() {
  const rows = new Map();
  const key = (scope, hash) => `${scope}:${hash}`;
  const stmt = (sql) => {
    if (sql.startsWith("SELECT keyHash")) return { get: (scope, hash) => rows.get(key(scope, hash)) || undefined };
    if (sql.startsWith("INSERT INTO")) return { run: (scope, hash, windowStart, count, expiresAt, updatedAt) => rows.set(key(scope, hash), { scope, keyHash:hash, windowStart, count, expiresAt, updatedAt }) };
    if (sql.startsWith("UPDATE")) return { run: (windowStart,count,expiresAt,updatedAt,scope,hash) => { const r=rows.get(key(scope,hash)); if(r) Object.assign(r,{windowStart,count,expiresAt,updatedAt}); } };
    if (sql.includes("expiresAt <=")) return { run: (scope, expiresAt) => { for (const [k,r] of rows) if (r.scope===scope && r.expiresAt<=expiresAt) rows.delete(k); } };
    if (sql.startsWith("SELECT COUNT")) return { get: scope => ({count:[...rows.values()].filter(r=>r.scope===scope).length}) };
    if (sql.startsWith("SELECT keyHash FROM")) return { get: scope => [...rows.values()].filter(r=>r.scope===scope).sort((a,b)=>a.updatedAt-b.updatedAt)[0] };
    if (sql.startsWith("DELETE FROM")) return { run: (scope,hash) => rows.delete(key(scope,hash)) };
    throw new Error(`Unsupported SQL: ${sql}`);
  };
  return { prepare: stmt, transaction: fn => (...args) => fn(...args), rows };
}
function res() {
  const headers={}; let code=200; let body=null;
  return { set(k,v){headers[k]=String(v);}, status(c){code=c;return this;}, json(v){body=v;return this;}, headers, get code(){return code;}, get body(){return body;} };
}

test("persistent limiter shares the same bucket across middleware instances",()=>{
  const db=fakeDb(); let now=1000;
  const a=createPersistentRateLimiter({db,windowMs:1000,max:2,keyFn:()=>"user-1",now:()=>now,scope:"auth"});
  const b=createPersistentRateLimiter({db,windowMs:1000,max:2,keyFn:()=>"user-1",now:()=>now,scope:"auth"});
  let calls=0; let r=res(); a({},r,()=>calls++); r=res(); b({},r,()=>calls++); r=res(); a({},r,()=>calls++);
  assert.equal(calls,2); assert.equal(r.code,429); assert.equal(r.headers["RateLimit-Remaining"],"0");
  a.dispose(); b.dispose();
});

test("expired bucket resets after the window",()=>{
  const db=fakeDb(); let now=1000;
  const l=createPersistentRateLimiter({db,windowMs:1000,max:1,keyFn:()=>"u",now:()=>now,scope:"test"});
  let calls=0; let r=res(); l({},r,()=>calls++); now=2001; r=res(); l({},r,()=>calls++);
  assert.equal(calls,2); assert.equal(r.code,200); l.dispose();
});

test("storage failures fail closed",()=>{
  const db={prepare(){throw new Error("db down")},transaction(){throw new Error("db down")}};
  assert.throws(()=>createPersistentRateLimiter({db,windowMs:1000,max:1,keyFn:()=>"u",scope:"fail"}),/db down/);
});
