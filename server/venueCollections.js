"use strict";
function collections(rows=[]){const map=new Map();for(const r of rows){const key=String(r.venue||"Unspecified");if(!map.has(key))map.set(key,{venue:key,count:0,inventory:0});const x=map.get(key);x.count++;x.inventory+=Math.max(0,Number(r.quantity)||0);}return [...map.values()].sort((a,b)=>b.inventory-a.inventory);}
function lifecycle(rows=[]){const out={};for(const r of rows){const s=String(r.status||"unknown");out[s]=(out[s]||0)+1;}return out;}
module.exports={collections,lifecycle};
