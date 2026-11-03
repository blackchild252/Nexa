"use strict";
function moderationSummary(reports=[],appeals=[]){const open=(Array.isArray(reports)?reports:[]).filter(r=>['open','triaged'].includes(String(r.status)));const urgent=open.filter(r=>String(r.escalation)==='urgent').length;const appealOpen=(Array.isArray(appeals)?appeals:[]).filter(a=>['open','pending'].includes(String(a.status))).length;return {reports:reports.length,open:open.length,urgent,appeals:appeals.length,appealsOpen:appealOpen};}
function memberSafety(members=[]){const counts={owner:0,member:0};for(const m of Array.isArray(members)?members:[]){const role=String(m.role)==='owner'?'owner':'member';counts[role]++;}return counts;}
module.exports={moderationSummary,memberSafety};
