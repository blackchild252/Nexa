"use strict";
const {requiresUrgentReview}=require("./trustSafetyOperations");
function safetySummary(reports=[]){const summary={total:reports.length,open:0,urgent:0,actioned:0,appeals:0};for(const r of reports){if(String(r.status)==="open"||String(r.status)==="triaged")summary.open++;if(requiresUrgentReview(r))summary.urgent++;if(String(r.status)==="actioned")summary.actioned++;}return summary;}
function roomSummary(rooms=[]){return {total:rooms.length,discoverable:rooms.filter(r=>!!r.discoverable).length};}
module.exports={safetySummary,roomSummary};
