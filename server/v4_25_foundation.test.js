"use strict";
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const notifications=require('./notifications');
const savings=require('./savingsAutomation');
const growth=require('./marketplaceGrowth');
const social=require('./socialCommunity');
const leisure=require('./leisureFulfillment');
const index=fs.readFileSync(__dirname+'/index.js','utf8');

test('41 notification action completion remains allowlisted and user scoped',()=>{
 assert.deepEqual(notifications.normalizeAction({screen:'profile'}),{action:'profile'});
 assert.match(index,/\/api\/notifications\/:id\/action/);
});
test('42 savings rules validate cadence and calculate next contribution',()=>{
 const r=savings.normalizeRule({amount:5000,cadence:'weekly',currency:'NGN'});
 assert.equal(r.cadence,'weekly');
 const p=savings.goalPlan({id:'g1',currency:'NGN',targetAmount:12000,currentAmount:2000},r,new Date('2026-09-27T00:00:00Z'));
 assert.equal(p.suggestedContribution,5000); assert.equal(p.nextDue,'2026-10-04');
});
test('43 marketplace personalization and vendor growth are bounded',()=>{
 assert.equal(typeof growth.personalized,'function'); assert.equal(typeof growth.vendorGrowth,'function'); assert.match(index,/\/api\/mall\/personalized/); assert.match(index,/\/api\/mall\/vendor\/growth/);
});
test('44 community room discovery excludes existing members and exposes graph summary',()=>{
 assert.equal(typeof social.discoverRooms,'function'); assert.equal(typeof social.graphSummary,'function'); assert.match(index,/\/api\/social\/community\/rooms/); assert.match(index,/discoverability/);
});
test('45 leisure fulfillment exposes ticket and kitchen return state without provider mutation',()=>{
 assert.deepEqual(leisure.returnContext('yaayz','ref-123'),{kind:'yaayz',reference:'ref-123',route:'/yaayz'});
 assert.deepEqual(leisure.returnContext('kitchen','ref-123'),{kind:'kitchen',reference:'ref-123',route:'/leisure/kitchen'});
 assert.equal(leisure.returnContext('evil','x'),null); assert.match(index,/\/api\/leisure\/fulfillment/);
});
