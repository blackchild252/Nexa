'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const c = require('./v5_64_0_reliability_recovery');

test('V5.64.0 exactly defines 25 major controls',()=>assert.equal(c.CONTROLS.length,25));
for (const [id,name,,fn] of c.CONTROLS) {
  test(`${id} ${name}`,()=>{
    const samples={
      'M950':'jobs.email.send','M951':'payments:critical','M952':'worker-abc-01','M953':{type:'audit',payload:{ok:true}},'M954':'body','M955':['order','u1','pay1'],
      'M956':{lockedAt:new Date(Date.now()-3600000).toISOString(),now:new Date(),leaseMs:60000},'M957':{attempts:3,base:1000,cap:3600000},'M958':{attempts:1,maxAttempts:5},'M959':100,'M960':500,'M961':'completed','M962':'running','M963':'running','M964':'queued','M965':{status:'running',attempts:1,maxAttempts:5},'M966':'corr_12345678','M967':'ok','M968':{key:'password',value:'secret'},'M969':{password:'secret'},'M970':{fail:0,production:true,pass:2,warn:0,skip:0,ok:true},'M971':10000,'M972':{activeJobs:2,signal:'SIGTERM'},'M973':{lastBackupAt:new Date().toISOString(),now:new Date(),maxAgeMs:86400000},'M974':'5.64.0'
    };
    assert.equal(Boolean(fn(samples[id])),true);
  });
}

test('event hash chain changes with predecessor',()=>assert.notEqual(c.eventHash('body','a'),c.eventHash('body','b')));
test('event envelope rejects oversized payload',()=>assert.throws(()=>c.eventEnvelope({type:'x',payload:{data:'x'.repeat(c.MAX_EVENT_BYTES)}})));
test('retry delay is capped',()=>assert.equal(c.retryDelayMs(99,1000,5000),5000));
test('snapshot redacts credentials',()=>assert.equal(c.operationalSnapshot({token:'abc',name:'n'}).token,'[REDACTED]'));
test('stale recovery exhausts into failed state',()=>assert.deepEqual(c.recoveryTransition('running',5,5),{allowed:true,next:'failed'}));
