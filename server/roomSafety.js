"use strict";
function moderationSummary(reports=[],members=[]){const active=reports.filter(r=>!["resolved","dismissed"].includes(String(r.status))).length;return {reports:reports.length,activeReports:active,members:members.length};}
function memberControls(rows=[]){return rows.map(r=>({userId:String(r.userId),role:String(r.role||"member"),joinedAt:r.joinedAt}));}
module.exports={moderationSummary,memberControls};
