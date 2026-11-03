"use strict";
function progress(goal={}){const target=Math.max(0,Number(goal.targetAmount)||0),current=Math.max(0,Number(goal.currentAmount)||0),remaining=Math.max(0,target-current),percent=target?Math.min(100,Number((current/target*100).toFixed(2))):0;return {goalId:String(goal.id||""),name:String(goal.name||""),currency:String(goal.currency||"NGN"),target,current,remaining,percent,complete:remaining<=0};}
function contributionHistory(rows=[]){return rows.map(r=>({id:String(r.id),goalId:String(r.goalId),amount:Number(r.amount)||0,currency:String(r.currency||""),recordedAt:r.recordedAt}));}
module.exports={progress,contributionHistory};
