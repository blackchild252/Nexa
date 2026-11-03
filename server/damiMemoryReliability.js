"use strict";

const SOURCE_PRECEDENCE = { system:3, user:2, module:1 };
function normalizeMemoryRecord(input = {}) { return { id:String(input.id||"").slice(0,120), category:String(input.category||"other").slice(0,60), content:String(input.content||"").trim().slice(0,500), source:String(input.source||"user").slice(0,40), confidence:Math.max(0,Math.min(1,Number(input.confidence??1)||0)), updatedAt:input.updatedAt||null }; }
function memoryContextKey(record) { const r=normalizeMemoryRecord(record); return `${r.category}:${r.content.toLowerCase()}`; }
function dedupeMemories(records=[],max=20) { const seen=new Set(),out=[]; for(const record of Array.isArray(records)?records:[]){const normalized=normalizeMemoryRecord(record),key=memoryContextKey(normalized);if(!normalized.content||seen.has(key))continue;seen.add(key);out.push(normalized);if(out.length>=max)break;} return out; }
function resolveMemoryConflicts(records=[],max=20){
  const normalized=Array.isArray(records)?records.map(normalizeMemoryRecord).filter(r=>r.content):[];
  const groups=new Map(); for(const r of normalized){const key=r.category.toLowerCase();if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
  const out=[]; for(const group of groups.values()){
    const distinct=[...new Map(group.map(r=>[r.content.toLowerCase(),r])).values()];
    const conflict=distinct.length>1;
    distinct.sort((a,b)=>(SOURCE_PRECEDENCE[b.source]||0)-(SOURCE_PRECEDENCE[a.source]||0)||b.confidence-a.confidence||String(b.updatedAt||"").localeCompare(String(a.updatedAt||""))||a.content.localeCompare(b.content));
    distinct.forEach((r,i)=>out.push({...r,conflict,precedence:distinct.length-i}));
  }
  return out.slice(0,max);
}
module.exports={normalizeMemoryRecord,memoryContextKey,dedupeMemories,resolveMemoryConflicts};
