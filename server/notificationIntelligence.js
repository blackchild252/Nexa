"use strict";
function preferenceSummary(prefs={}){const fields=["money","marketplace","social","chat","system","extension","pushEnabled"];const enabled=fields.filter(f=>prefs[f]!==0).length;return {enabled,disabled:fields.length-enabled,pushEnabled:prefs.pushEnabled!==0};}
function deliveryHealth(rows=[]){const counts={pending:0,retry:0,sending:0,delivered:0,failed:0,dead:0};for(const r of rows){const s=String(r.status);if(Object.prototype.hasOwnProperty.call(counts,s))counts[s]++;}const attempted=counts.delivered+counts.failed+counts.dead;return {counts,attempted,deliveryRate:attempted?Number((counts.delivered/attempted*100).toFixed(2)):null,needsAttention:counts.retry+counts.failed+counts.dead>0};}
module.exports={preferenceSummary,deliveryHealth};
