"use strict";
function replayPart(value){return String(value ?? "").trim();}
function replayKey(workflowId,userId,key){return `${replayPart(workflowId)}:${replayPart(userId)}:${replayPart(key)}`;}
function replayEquivalent(a={},b={}){return replayKey(a.workflowId,a.userId,a.key ?? a.idempotencyKey)===replayKey(b.workflowId,b.userId,b.key ?? b.idempotencyKey);}
function drift(expected=[],actual=[]){const e=JSON.stringify(expected||[]),a=JSON.stringify(actual||[]);return {drifted:e!==a,expected:expected||[],actual:actual||[]};}
function confirmationValid(receipt={},now=Date.now(),maxAgeMs=120000){
  if (!receipt.confirmationRequired) return true;
  if (!receipt.confirmed) return false;
  const created=Date.parse(receipt.createdAt || receipt.confirmedAt || "");
  if (!Number.isFinite(created) || !Number.isFinite(Number(now)) || created > Number(now)) return false;
  return Number(now)-created <= maxAgeMs;
}
function confirmationLineage(receipts=[]){return (Array.isArray(receipts)?receipts:[]).map(r=>({runId:String(r.runId||''),receiptId:String(r.id||''),confirmed:Boolean(r.confirmed),confirmationRequired:Boolean(r.confirmationRequired),createdAt:r.createdAt||null}));}
module.exports={replayKey,replayEquivalent,drift,confirmationValid,confirmationLineage};
