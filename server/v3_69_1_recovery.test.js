"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const delivery = require("./notificationDelivery");
const maintenance = require("./maintenance");

function fakeDb() {
  const state={rows:[{id:"d1",status:"sending",updatedAt:"2026-09-25T00:00:00.000Z"}]};
  return {state,prepare(sql){return {run(...a){if(sql.includes("status='retry'")){const n=state.rows.filter(r=>r.status==='sending'&&r.updatedAt<a[3]).length;state.rows.forEach(r=>{if(r.status==='sending'&&r.updatedAt<a[3]){r.status='retry';r.nextAttemptAt=a[0];r.updatedAt=a[1];r.lastError=a[2];}});return {changes:n};} return {changes:0};}}}};
}

test("29: stale in-flight notification work is recoverable after worker interruption",()=>{
  const db=fakeDb();
  const out=delivery.recoverStaleSending(db,new Date("2026-09-25T01:00:00.000Z"));
  assert.equal(out.recovered,1); assert.equal(db.state.rows[0].status,"retry");
});

test("29: notification delivery exposes a bounded in-flight claim and recovery window",()=>{
  assert.equal(delivery.STALE_SENDING_MS,15*60*1000);
  const s=fs.readFileSync(path.join(__dirname,"notificationDelivery.js"),"utf8");
  assert.match(s,/status='sending'/); assert.match(s,/recoverStaleSending/);
});

test("29: maintenance remains bounded and includes notification lifecycle cleanup",()=>{
  const s=fs.readFileSync(path.join(__dirname,"maintenance.js"),"utf8");
  assert.match(s,/purgeOldNotificationDeliveries/); assert.match(s,/Math\.min\(3650/);
});
