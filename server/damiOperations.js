"use strict";
function workflowSummary(workflows=[],runs=[]){const out={workflows:workflows.length,draft:0,active:0,completed:0,runs:runs.length};for(const w of workflows){const s=String(w.status||"draft");if(s==='draft')out.draft++;else if(s==='completed')out.completed++;else out.active++;}return out;}
function nextSteps(steps=[],completed=[]){const done=new Set((Array.isArray(completed)?completed:[]).map(Number));return (Array.isArray(steps)?steps:[]).map((s,i)=>({index:i,title:String(s.title||s.purpose||`Step ${i+1}`).slice(0,160),ready:(Array.isArray(s.dependsOn)?s.dependsOn:[]).every(d=>done.has(Number(d)))&&!done.has(i),requiresConfirmation:Boolean(s.requiresConfirmation)}));}
module.exports={workflowSummary,nextSteps};
