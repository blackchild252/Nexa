"use strict";
function presenceSummary(participants=[]){const rows=Array.isArray(participants)?participants:[];const out={total:rows.length,joined:0,invited:0,left:0,reconnecting:0};for(const p of rows){const s=String(p.status||'invited');if(Object.hasOwn(out,s))out[s]++;if(Number(p.reconnectCount||0)>0)out.reconnecting++;}return out;}
function missedCall(call,me){const participants=Array.isArray(call?.participants)?call.participants:[];const p=participants.find(x=>x.userId===me);return Boolean(call&&['ended','expired'].includes(String(call.status))&&p&&p.status!=='joined'&&p.status!=='left'&&call.hostId!==me);}
function hostAction(action){return new Set(['end','remove','promote']).has(String(action));}
module.exports={presenceSummary,missedCall,hostAction};
