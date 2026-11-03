"use strict";
function upcomingEvents(rows=[], now=new Date()){const cutoff=new Date(now).getTime();return rows.filter(r=>r.startsAt&&Number.isFinite(new Date(r.startsAt).getTime())&&new Date(r.startsAt).getTime()>=cutoff&&Number(r.quantity||0)>0).sort((a,b)=>new Date(a.startsAt)-new Date(b.startsAt)).map(r=>({id:String(r.id),title:String(r.title||""),type:String(r.type||"event"),venue:String(r.venue||""),startsAt:r.startsAt,endsAt:r.endsAt||null,price:Number(r.price)||0,currency:String(r.currency||"NGN"),quantity:Number(r.quantity)||0}));}
function lifecycleSummary(rows=[]){const out={};for(const r of rows){const s=String(r.status||"unknown");out[s]=(out[s]||0)+1;}return out;}
module.exports={upcomingEvents,lifecycleSummary};
