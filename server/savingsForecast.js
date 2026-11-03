"use strict";
function forecast(goal={},history=[]){const target=Math.max(0,Number(goal.targetAmount)||0),current=Math.max(0,Number(goal.currentAmount)||0),remaining=Math.max(0,target-current);const amounts=history.map(r=>Number(r.amount)||0).filter(x=>x>0);const avg=amounts.length?amounts.reduce((a,b)=>a+b,0)/amounts.length:0;return {goalId:String(goal.id||""),remaining:Number(remaining.toFixed(2)),averageContribution:Number(avg.toFixed(2)),estimatedContributions:avg?Math.ceil(remaining/avg):null,historyCount:history.length};}
function trend(history=[]){const total=history.reduce((n,r)=>n+(Number(r.amount)||0),0);return {count:history.length,total:Number(total.toFixed(2)),latest:history[0]?.recordedAt||null};}
module.exports={forecast,trend};
