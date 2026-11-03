"use strict";
const MILESTONES=Object.freeze([25,50,75,100]);
function milestoneProgress(goal={}){const target=Math.max(0,Number(goal.targetAmount)||0),current=Math.max(0,Number(goal.currentAmount)||0);const percent=target?Math.min(100,Number((current/target*100).toFixed(2))):0;const reached=MILESTONES.filter(x=>percent>=x);const next=MILESTONES.find(x=>percent<x)||null;return {goalId:String(goal.id||""),percent,reached,nextMilestone:next,complete:percent>=100};}
function contributionTotals(rows=[]){const total=rows.reduce((n,r)=>n+(Number(r.amount)||0),0);return {count:rows.length,total:Number(total.toFixed(2)),latest:rows[0]?.recordedAt||null};}
module.exports={MILESTONES,milestoneProgress,contributionTotals};
