"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const marketplaceResolution=require("./marketplaceResolution");
const communityGovernance=require("./communityGovernance");
const notificationControls=require("./notificationControls");
const savingsMilestones=require("./savingsMilestones");
const venueDiscovery=require("./venueDiscovery");
const fs=require("node:fs");
const index=fs.readFileSync(require("node:path").join(__dirname,"index.js"),"utf8");
const dbSource=fs.readFileSync(require("node:path").join(__dirname,"db.js"),"utf8");

test("B13 marketplace resolution summarizes refund/dispute/order lifecycles",()=>{
 assert.equal(marketplaceResolution.orderLifecycle({id:"o",status:"confirmed",providerVerified:1}).attention,true);
 assert.deepEqual(marketplaceResolution.refundSummary([{status:"pending",amount:10},{status:"processed",amount:5}]).counts,{pending:1,processing:0,processed:1,failed:0});
 assert.equal(marketplaceResolution.disputeSummary([{status:"open"},{status:"resolved"}]).open,1);
 assert.match(index,/api\/mall\/operations\/resolution/);
});
test("B13 Zeeza governance remains user-owned and bounded",()=>{
 assert.deepEqual(communityGovernance.appealSummary([{status:"open"},{status:"under_review"},{status:"resolved"}]).counts,{open:1,under_review:1,resolved:1,dismissed:0});
 assert.deepEqual(communityGovernance.roomGovernance([{discoverable:1},{discoverable:0}]),{total:2,discoverable:1,private:1});
 assert.match(index,/api\/zeeza\/governance/);
});
test("B13 notification digest controls normalize safely",()=>{
 assert.deepEqual(notificationControls.normalizeDigest({digestEnabled:true,digestFrequency:"weekly",quietStart:"22:00",quietEnd:"06:30"}),{enabled:true,frequency:"weekly",quietStart:"22:00",quietEnd:"06:30"});
 assert.equal(notificationControls.normalizeDigest({digestEnabled:true,digestFrequency:"bogus"}).enabled,false);
 assert.equal(notificationControls.recoverySummary([{status:"retry"},{status:"dead"}]).recoverable,1);
 assert.match(index,/api\/notifications\/preferences\/digest/);
 assert.match(dbSource,/ALTER TABLE notification_preferences ADD COLUMN digestFrequency/);
});
test("B13 savings milestones are planning-only calculations",()=>{
 assert.deepEqual(savingsMilestones.milestoneProgress({id:"g",targetAmount:100,currentAmount:52}),{goalId:"g",percent:52,reached:[25,50],nextMilestone:75,complete:false});
 assert.deepEqual(savingsMilestones.contributionTotals([{amount:10,recordedAt:"a"},{amount:5,recordedAt:"b"}]),{count:2,total:15,latest:"a"});
 assert.match(index,/api\/planning\/goals\/milestones/);
});
test("B13 venue discovery filters to future in-stock events",()=>{
 const now=new Date("2026-09-27T00:00:00Z");
 const rows=venueDiscovery.upcomingEvents([{id:"past",title:"Past",startsAt:"2026-09-26T00:00:00Z",quantity:10},{id:"future",title:"Future",startsAt:"2026-09-28T00:00:00Z",quantity:2}],now);
 assert.deepEqual(rows.map(x=>x.id),["future"]);
 assert.match(index,/api\/leisure\/events\/discovery/);
});
